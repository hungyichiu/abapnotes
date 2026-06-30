---
tags:
  - SAP
  - B1
  - SP
created: 2026-03-23
status: completed
area: resources
publish: true
---

# SQL 預存程序在 SAP B1 中的應用：卡控與自動化

## 前言

SAP Business One 提供了一個強大但容易被忽視的擴充機制：透過 SQL Stored Procedure（預存程序，簡稱 SP），在使用者新增、修改或刪除資料的瞬間，觸發客製化的業務邏輯驗證。

這不是額外的 Add-on，也不需要修改 B1 原始碼。SAP 在系統設計時預留了一個名為 `SBO_SP_TransactionNotification` 的內建預存程序，它在每一筆交易動作前都會被呼叫。顧問只需要撰寫自己的客製 SP，並在 `SBO_SP_TransactionNotification` 中呼叫它，就能在 B1 的標準流程中插入任意的業務規則驗證。

本文說明這個機制的運作原理、撰寫規範、常見的實際應用，以及如何讓 B1 查詢直接呼叫 SP 執行自動化流程。

---

## 預存程序的優勢

相較於在 B1 查詢或應用程式層做驗證，將邏輯寫在 Stored Procedure 中有幾個明確的優勢：

**一次編譯、重複使用**：SP 在建立時就被資料庫引擎編譯成執行計畫，後續每次呼叫都使用快取的計畫，比每次動態解析 SQL 字串效率更高。

**增強安全性**：使用者或應用程式只需要有「執行 SP」的權限，不需要直接存取底層資料表。敏感的業務邏輯被封裝在 SP 內部，降低資料被直接操作的風險。

**集中管理邏輯**：當業務規則需要調整時，只需修改 SP，所有呼叫該 SP 的流程都會立即反映變更，不需要在多個地方同步修改。

**支援加密**：SP 可以使用 `WITH ENCRYPTION` 選項加密，防止程式碼被未授權人員讀取，適合顧問公司保護智慧財產。

---

## B1 的 SP 掛載機制

SAP B1 的交易通知機制（Transaction Notification）運作方式如下：

1. 使用者在 B1 介面執行新增（A）、修改（U）、刪除（D）或取消（C）動作。
2. B1 在將資料寫入資料庫之前，呼叫 `SBO_SP_TransactionNotification`。
3. 若 SP 回傳 `@error != 0`，B1 中止本次交易並顯示 `@error_message` 的錯誤訊息給使用者。
4. 若 `@error = 0`，B1 繼續完成資料寫入。

客製 SP 的標準參數簽章如下：

```sql
CREATE PROCEDURE [_CmSp_DataValidation]
    @object_type            nvarchar(30),   -- B1 Object Type（文件類型代碼）
    @transaction_type       nchar(1),       -- A=新增, U=修改, D=刪除, C=取消, L=關閉
    @num_of_cols_in_key     int,
    @list_of_key_cols_tab_del   nvarchar(255),
    @list_of_cols_val_tab_del   nvarchar(255),  -- 主鍵值，如 DocEntry
    @error                  int output,
    @error_message          nvarchar(200) output
AS
BEGIN
    SET NOCOUNT ON;
    -- 業務驗證邏輯寫在此處
END
```

`@object_type` 是識別文件類型的關鍵：`'2'` 代表業務夥伴（OCRD）、`'4'` 代表物料主檔（OITM）、`'18'` 代表 AP 發票（OPCH）。SAP 官方文件提供完整的 Object Type 對照表，實務中可搭配 SAP B1的文件編號功能進行確認。

---

## 編寫標準

### 命名規範

建議使用固定前綴區分客製 SP 與 SAP 系統原生 SP：

- `_CmSp_` 開頭：客製化 SP（Cm = Custom，Sp = Stored Procedure）
- 後接功能描述，例如 `_CmSp_DataValidation`、`_CmSp_UpdateODRF`

以底線開頭的 SP 名稱在 SSMS 的物件瀏覽器中會排列在最前面，方便快速定位。

### 標準框架（含冪等建立邏輯）

```sql
-- 若 SP 已存在則先刪除，確保腳本可重複執行
IF OBJECT_ID('[_CmSp_DataValidation]', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE [_CmSp_DataValidation]
END;
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [_CmSp_DataValidation]
    @object_type            nvarchar(30),
    @transaction_type       nchar(1),
    @num_of_cols_in_key     int,
    @list_of_key_cols_tab_del   nvarchar(255),
    @list_of_cols_val_tab_del   nvarchar(255),
    @error                  int output,
    @error_message          nvarchar(200) output
WITH ENCRYPTION  -- 視需求決定是否加密
AS
BEGIN
    SET NOCOUNT ON;

    -- 初始化：預設無錯誤
    SELECT @error = 0, @error_message = '';

    -- === 驗證邏輯區塊 ===

END
GO
```

### 錯誤處理慣例

- 錯誤碼從 `9999` 往下遞減，每個規則用一個唯一的錯誤碼，方便追蹤與除錯。
- 錯誤訊息使用 `N'...'`（Unicode 字串前綴），確保中文訊息不會亂碼。
- 每個規則驗證失敗後立即 `RETURN`，避免繼續執行後續邏輯。

---

## 實際案例

### 案例一：業務夥伴統編不可重複

**需求**：新增或修改業務夥伴時，若統一編號（LicTradNum）與系統中已存在的記錄重複，則阻擋並提示錯誤。

```sql
IF (@object_type = '2' AND @transaction_type IN ('A', 'U'))
BEGIN
    IF EXISTS (
        SELECT 1 FROM OCRD
        WHERE LicTradNum = @list_of_cols_val_tab_del
    )
    BEGIN
        SELECT @error = 9999;
        SELECT @error_message = N'業務夥伴的稅籍 ID（統編）已存在，請確認！';
        RETURN;
    END;
END
```

**為什麼這樣做**：統編是業務夥伴的唯一識別碼，重複建立會導致財務報表與稅務申報出現錯誤。B1 原生欄位未強制唯一性，需透過 SP 補強。

---

### 案例二：庫存異動卡控

**需求**：特定物料（例如管制品或貴重零件）的庫存調撥，只允許特定使用者操作，其他人一律阻擋。

```sql
IF (@object_type = '67' AND @transaction_type = 'A')
BEGIN
    DECLARE @UserSign INT;
    SELECT @UserSign = UserSign FROM OWTR
    WHERE DocEntry = @list_of_cols_val_tab_del;

    IF @UserSign NOT IN (1, 57, 102)  -- 核准使用者的 UserSign
    BEGIN
        SELECT @error = 9990;
        SELECT @error_message = N'庫存調撥僅限倉管主管操作，請聯繫權限管理員。';
        RETURN;
    END;
END
```

`object_type = '67'` 對應庫存調撥單（OWTR）。`UserSign` 是 B1 使用者的內部識別碼，可從 `OUSR` 資料表查詢對應關係。

---

### 案例三：AP 發票強制存草稿

**需求**：除財務部指定人員外，其他使用者新增 AP 發票時只能存成草稿，不允許直接正式儲存。

```sql
IF (@object_type = '18' AND @transaction_type = 'A')
BEGIN
    IF EXISTS (
        SELECT 1 FROM OPCH
        WHERE UserSign NOT IN (1, 57)
          AND DocEntry = @list_of_cols_val_tab_del
    )
    BEGIN
        SELECT @error = 9996;
        SELECT @error_message = N'非財務人員請將 AP 發票存成草稿，由財務審核後正式儲存。';
        RETURN;
    END;
END
```

**為什麼這樣做**：AP 發票直接影響應付帳款與現金流，強制草稿機制是常見的內控要求，確保財務人員能在發票正式入帳前進行複核。

---

### 案例四：物料主檔異動管制

**需求**：物料主檔（Item Master）的新增與修改，僅允許財務部操作，其他人員一律阻擋。

```sql
IF (@object_type = '4' AND @transaction_type IN ('A', 'U'))
BEGIN
    SELECT @error = 9997;
    SELECT @error_message = N'物料主檔異動請洽財務部，謝謝。';
    RETURN;
END
```

這是最簡單的卡控用法——無條件阻擋特定類型的操作，常見於需要嚴格管控主檔資料品質的客戶。

---

## B1 查詢與預存程序的銜接方式

除了用於卡控，SP 也可以作為複雜查詢的封裝單元，透過 B1 的查詢產生器（Query Generator）呼叫執行，實現自動化報表或流程觸發。

**步驟一**：建立帶參數的 SP

```sql
CREATE PROCEDURE [_CmSp_GetInvoiceByDate]
    @DocDate AS DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT T0.DocNum, T0.CardName, T0.DocTotal, T0.DocDate
    FROM OINV T0
    WHERE T0.DocDate = @DocDate
      AND T0.Cancelled = 'N'
END
```

**步驟二**：在 B1 查詢中宣告參數並呼叫 SP

```sql
DECLARE @DocDate AS DATE

-- [%0] 是 B1 查詢的使用者輸入提示語法
SET @DocDate = '[%0]'

EXECUTE [_CmSp_GetInvoiceByDate] @DocDate
```

執行這個查詢時，B1 會彈出輸入框要求使用者輸入日期，接著將值傳入 SP 執行，最後在查詢結果視窗中顯示。

這個銜接方式的意義在於：將複雜的 T-SQL 邏輯（多層子查詢、CTE、暫存資料表）封裝在 SP 內，B1 查詢只需幾行程式碼就能觸發，兼顧了可讀性與維護性。

---

## 掛載 SP 後的常見問題

### SP 建立後無法在 SSMS 中找到

建立 SP 後，若在 SSMS 物件瀏覽器中找不到，或執行時出現「無效物件名稱」的錯誤，通常是因為 SSMS 的快取尚未更新。

解決方式：**關閉 SSMS，重新登入**，物件瀏覽器會重新載入所有 SP 清單。

可用以下查詢確認 SP 是否確實已寫入系統：

```sql
SELECT SCHEMA_NAME(schema_id) AS SchemaName, name
FROM sys.procedures
WHERE name = '_CmSp_DataValidation';
```

### 需要刪除並重建 SP

修改已有 SP 時，建議使用標準的「先刪後建」框架，確保腳本可重複執行：

```sql
IF OBJECT_ID('[dbo].[_CmSp_DataValidation]', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE [dbo].[_CmSp_DataValidation];
END;
GO
-- 接著執行 CREATE PROCEDURE ...
```

---

## 常見陷阱

1. **`@list_of_cols_val_tab_del` 的型別是字串**：B1 傳入的主鍵值是 `nvarchar` 格式，若要與數值欄位比較，必須明確轉型，例如 `CAST(@list_of_cols_val_tab_del AS INT)`，否則可能發生隱式轉換錯誤。

2. **沒有檢查 `@transaction_type`**：若只寫 `@object_type` 的條件而忽略 `@transaction_type`，刪除操作也會被同樣的邏輯攔截，常造成使用者無法刪除草稿的問題。

3. **SELECT 而非 SET 設定輸出參數**：在 B1 SP 中，`@error` 與 `@error_message` 是 OUTPUT 參數，必須使用 `SELECT @error = 9999` 而非 `SET @error = 9999`，否則 B1 可能無法正確接收回傳值（這是 B1 特有的行為，與標準 T-SQL 習慣不同）。

4. **加密後無法自行修改**：使用 `WITH ENCRYPTION` 建立的 SP，若沒有保存原始腳本，後續將無法讀取或修改。建議將所有 SP 原始碼納入版本控制（如 Git），加密的 SP 僅部署至客戶環境。

---

## 顧問建議

- **SP 應視為程式碼，納入版本控制**：每次修改都應留下修改記錄，包含修改日期、作者與修改原因，寫在 SP 內的注釋區塊中。
- **先在測試環境驗證，再部署正式環境**：卡控 SP 一旦部署，所有使用者的操作都會受到影響，在正式環境部署前務必完整測試各種交易情境（新增、修改、刪除、取消）。
- **錯誤訊息要對使用者友善**：`@error_message` 是使用者看到的唯一提示，應明確說明「什麼情況不被允許」以及「應該怎麼做」，避免只寫「錯誤」這類無意義的訊息。
- **與 FMS 搭配形成完整的資料品質防線**：FMS 負責「輸入時自動帶值」，SP 負責「儲存前驗證規則」，兩者配合可以涵蓋 B1 客製化需求中最常見的 80% 場景，且完全不需要額外的 Add-on 授權費用。

---

## 來源筆記

- [[SP_預存程序]]
- [[SP_How to check object type]]
- [[SP_擷發_資料卡控語法]]
- [[SQL_掛載預存程序的注意事項]]
- [[20250829_如何在B1 中 呼叫SP]]
