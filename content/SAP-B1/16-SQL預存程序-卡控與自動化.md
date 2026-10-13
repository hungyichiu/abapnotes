---
title: "SQL 預存程序在 SAP B1 中的應用：卡控與自動化"
description: "整理用 SBO_SP_TransactionNotification 掛載客製 SP 做資料卡控的方法：參數簽章、_CmSp_ 命名、錯誤碼慣例，附統編不可重複等四個案例與常見寫錯法，上線前對照檢查。"
keywords:
  - SAP B1 預存程序
  - SBO_SP_TransactionNotification
  - 資料卡控
  - Transaction Notification
  - OCRD LicTradNum
tags:
  - SAP
  - B1
  - SP
created: 2026-03-23
status: active
area: public
publish: false
source:
  - "[[SQL-SP-預存程序]]"
  - "[[SQL-SP-How to check object type]]"
  - "[[SQL-SP-擷發_資料卡控語法]]"
  - "[[SQL-掛載預存程序的注意事項]]"
  - "[[B1-20250829-如何在B1 中 呼叫SP]]"
---

## 前言

SAP Business One 可以在使用者新增、修改或刪除資料的瞬間，用 SQL Stored Procedure（預存程序，簡稱 SP）驗證業務規則，不符合就擋下來。

這不需要 Add-on，也不需要改 B1 原始碼。SAP 預留了一個內建預存程序 `SBO_SP_TransactionNotification`，每一筆交易存檔時都會被呼叫。顧問寫自己的客製 SP，在 `SBO_SP_TransactionNotification` 裡呼叫它，就能在 B1 的標準流程中插入業務規則驗證。

本文說明這個機制的運作原理、撰寫規範、常見的實際案例，以及怎麼讓 B1 查詢直接呼叫 SP。

---

## 【So What】為什麼 B1 顧問需要這個

B1 的標準功能擋不住的規則很多：統編不能重複、某些單據只能特定人存、主檔不准隨便改。

- 使用者定義欄位的有效值、FMS 只能「帶值」，不能「拒絕存檔」。
- 核准程序能擋，但要走流程，不適合純粹的資料檢查。
- 寫 Add-on 要開發、要授權費、要維護。

Transaction Notification 的 SP 補的就是這個缺口：一段 SQL，存檔當下檢查，不過就跳錯誤訊息。客戶不用多買東西，顧問也不用碰 SDK。

順帶的好處是規則集中在一支 SP，改規則只改一個地方；必要時可以用 `WITH ENCRYPTION` 加密，保護顧問公司的邏輯。

---

## 【What】B1 的 SP 掛載機制

SAP B1 的交易通知機制（Transaction Notification）運作方式如下：

1. 使用者在 B1 介面執行新增（A）、修改（U）、刪除（D）或取消（C）動作。
2. B1 把資料寫進資料庫，但交易還沒 commit，這時呼叫 `SBO_SP_TransactionNotification`。
	- 所以 SP 裡可以用 `DocEntry` 查到這張單的內容，後面的案例二、三就是這樣查的。
3. 若 SP 回傳 `@error != 0`，B1 rollback 本次交易，並把 `@error_message` 顯示給使用者。
4. 若 `@error = 0`，B1 commit，資料正式寫入。

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

`@object_type` 是識別文件類型的關鍵：`'2'` 代表業務夥伴（OCRD）、`'4'` 代表物料主檔（OITM）、`'18'` 代表 AP 發票（OPCH）。

要查某種文件的 object type，在 B1 按 `Ctrl+Shift+I` 開啟系統資訊，再開「管理 → 系統初始化 → 文件編號」，滑鼠移到那一列，左下角狀態列就會顯示 object type。

### 把客製 SP 掛進 SBO_SP_TransactionNotification

客製 SP 寫好後不會自己生效，要在 SSMS 打開 `SBO_SP_TransactionNotification`（在公司資料庫的 Programmability → Stored Procedures 底下），找到 `-- ADD YOUR CODE HERE` 那一段，加一行呼叫：

```sql
--------------------------------------------------------------------------------------------------------------------------------
--	ADD	YOUR	CODE	HERE
EXEC [_CmSp_DataValidation]
    @object_type, @transaction_type, @num_of_cols_in_key,
    @list_of_key_cols_tab_del, @list_of_cols_val_tab_del,
    @error OUTPUT, @error_message OUTPUT
--------------------------------------------------------------------------------------------------------------------------------
```

之後所有規則都寫在 `_CmSp_DataValidation` 裡，`SBO_SP_TransactionNotification` 本身不再動。這樣升級 B1 或別的顧問接手時，只要看一支 SP。

---

## 【What For】編寫標準

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
    -- 業務夥伴傳進來的主鍵值是 CardCode，先用它查出這筆的統編
    DECLARE @LicTradNum NVARCHAR(32);
    SELECT @LicTradNum = LicTradNum
    FROM OCRD
    WHERE CardCode = @list_of_cols_val_tab_del;

    -- 再看有沒有「別的」業務夥伴用同一個統編
    IF ISNULL(@LicTradNum, '') <> ''
       AND EXISTS (
           SELECT 1 FROM OCRD
           WHERE LicTradNum = @LicTradNum
             AND CardCode <> @list_of_cols_val_tab_del
       )
    BEGIN
        SELECT @error = 9999;
        SELECT @error_message = N'業務夥伴的稅籍 ID（統編）已存在，請確認！';
        RETURN;
    END;
END
```

**為什麼這樣做**：統編是業務夥伴的唯一識別碼，重複建立會導致財務報表與稅務申報出現錯誤。B1 原生欄位未強制唯一性，需透過 SP 補強。

**常見的寫錯法**：直接寫 `WHERE LicTradNum = @list_of_cols_val_tab_del`。業務夥伴的 `@list_of_cols_val_tab_del` 是 CardCode 不是統編，這個條件永遠比不到，規則等於沒掛。

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

這是最簡單的卡控用法：無條件阻擋特定類型的操作，常見於需要嚴格管控主檔資料品質的客戶。

---

## B1 查詢與預存程序的銜接方式

除了卡控，SP 也可以當複雜查詢的封裝單元，透過 B1 的查詢管理員呼叫執行，當成報表用。

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
      AND T0.CANCELED = 'N'
END
```

**步驟二**：在 B1 查詢中宣告參數並呼叫 SP

```sql
DECLARE @DocDate AS DATE

-- [%0] 是 B1 查詢的使用者輸入提示語法
-- 前面那段註解讓 B1 知道這個參數是 OINV.DocDate，才會跳出日期選擇器而不是文字框
SET @DocDate = /* SELECT 1 FROM OINV T0 WHERE T0."DocDate" */ '[%0]'

EXECUTE [_CmSp_GetInvoiceByDate] @DocDate
```

執行這個查詢時，B1 會彈出日期輸入框，把值傳進 SP 執行，結果顯示在查詢結果視窗。

這樣做的好處是複雜的 T-SQL（多層子查詢、CTE、暫存資料表）都包在 SP 裡，B1 查詢只剩三行。

---

## 掛載 SP 後的常見問題

### SP 建立後無法在 SSMS 中找到

建立 SP 後，若在 SSMS 物件總管中找不到，通常只是清單沒重新整理。在「Stored Procedures」節點上按 F5 就會出現。

執行時出現「無效物件名稱」則是另一回事：多半是建在別的資料庫（例如 master）。建 SP 前先確認 SSMS 上方的資料庫下拉選到公司資料庫。

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

1. **`@list_of_cols_val_tab_del` 的型別是字串**。
	- B1 傳入的主鍵值是 `nvarchar`，要和數值欄位比較就明確轉型，例如 `CAST(@list_of_cols_val_tab_del AS INT)`。
2. **沒有檢查 `@transaction_type`**。
	- 只寫 `@object_type` 的條件，刪除、取消也會被同一條規則攔下，常見症狀是使用者刪不掉草稿。
3. **`@list_of_cols_val_tab_del` 對業務夥伴是 CardCode，對單據是 DocEntry**。
	- 每種物件的主鍵不一樣，先確認再比對，案例一的錯法就是這個。
4. **`SELECT @error = …` 和 `SET @error = …` 都可以**。
	- SAP 範本用 `SELECT` 是慣例，一行能同時設兩個變數；不是 B1 只認 `SELECT`。
5. **加密後無法自行修改**。
	- `WITH ENCRYPTION` 的 SP 沒留原始腳本就讀不回來，原始碼納入版本控制，加密版只部署到客戶環境。

---

## 實作提醒

- **SP 當程式碼管，納入版本控制**。
	- 每次修改在 SP 的註解區留日期、作者、原因。
- **先在測試環境驗證，再部署正式環境**。
	- 卡控 SP 一部署就影響所有使用者，新增、修改、刪除、取消四種情境都要測。
- **錯誤訊息要讓使用者知道怎麼辦**。
	- `@error_message` 是使用者唯一看到的提示，寫「什麼情況不允許」和「該怎麼做」，不要只寫「錯誤」。
- **和 FMS 分工**。
	- FMS 負責輸入時自動帶值，SP 負責儲存前驗證規則，兩者都不用 Add-on 授權。
