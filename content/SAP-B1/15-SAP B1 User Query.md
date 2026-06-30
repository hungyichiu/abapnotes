---
tags:
  - SAP
  - B1
  - FMS
created: 2026-03-21
status: draft
area: resources
publish: true
---

# SAP B1 User Query：從查詢報表到 FMS 到核決觸發

## 什麼是 User Query

SAP Business One 的 **User Query（使用者查詢）** 是一個內建的 SQL 查詢工具，讓顧問和使用者不需要寫 Add-on，只要一段 SQL，就能從系統資料庫中擷取、計算、呈現所需資料。

查詢儲存在 `OUQR`（使用者查詢主檔），以分類（`OQCN`）管理。進入路徑：

> [!info]
> 工具 → 查詢 → 查詢產生工具   ← 新增與測試
> 工具 → 查詢 → 查詢管理員     ← 執行已存檔的查詢

![[SAP B1 User Query_Query_Tool.png]]

User Query 的應用範圍遠超過「查詢報表」這一個場景。同一個查詢機制，可以掛載到表單欄位（FMS），也可以作為核決範本的觸發條件，三種應用共享同一個查詢語法體系。

---

## 如何找到資料表與欄位名稱

在撰寫 User Query 之前，需要先知道資料表和欄位的確切名稱。有兩個方法：

**方法一：查詢產生工具**

在查詢產生工具的資料表輸入框中，輸入 `OCRD` 再按 Tab 鍵，系統會自動列出該資料表的所有欄位，點擊即可加入查詢。

![[SAP B1 User Query_table_column.png]]

**方法二：System Information**

從選單列：系統 → 系統資訊（勾選），B1 左下角就會即時顯示游標所在欄位的資料表與欄位名稱，格式為 `Table.FieldName`（如 `OCRD.Balance`）。

![[SAP B1 User Query_sytem_info.png]]

![[SAP B1 User Query_column_name.png]]

---

## 應用一：查詢報表（Query Report）

最直觀的用法：把 SQL 結果呈現成一份可執行、可儲存、可分享的報表。

**案例：業務夥伴科目餘額報表**

業務夥伴主檔（`OCRD`）中，抓取代碼、名稱與科目餘額：

![[SAP B1 User Query_operation.png]]

執行後的結果可直接匯出 Excel，或存成常用查詢，供日後在查詢管理員中快速呼叫：

![[SAP B1 User Query_query_review.png]]

![[SAP B1 User Query_save_as_report.png]]

**使用參數，提高靈活度**

User Query 支援最多 20 個查詢參數，依序為 `[%0]` 到 `[%19]`。執行時系統會跳出輸入視窗，讓使用者輸入篩選條件，例如指定銷售人員：

![[SAP B1 User Query_join.png]]

![[SAP B1 User Query_parameters.png]]

這讓同一支 SQL 可以服務不同的篩選需求，不必為每個條件另存一支查詢。

---

## 應用二：Formatted Search（FMS，格式化搜尋）

FMS 是把 User Query 掛載到表單欄位的機制。使用者在 A 欄位輸入值後，系統自動執行 SQL，將結果填入 B 欄位，實現欄位聯動。

### `$[...]` 動態語法

FMS 透過 `$[...]` 語法，在 SQL 執行前把畫面上的欄位值帶入查詢條件：

> [!example]
> $[$<ItemUID>.<ColumnUID>.<DataType>]

DataType：`0` = 字串、`1` = 日期、`2` = 數值、`3` = 貨幣

確認 ItemUID 的方式：開啟 System Information（Ctrl+Shift+F2），游標移到目標欄位即可看到。

### 掛載模式

- **Auto Refresh**：觸發欄位值變更時，系統自動執行並更新目標欄位
- **Refresh Regularly**：表單資料載入時自動執行一次

### FMS 查詢類型

- **TYPE 1**：SQL 回傳單一值，直接填入目標欄位
- **TYPE 2**：SQL 回傳多筆資料，以下拉選單呈現讓使用者選擇

### 欄位聯動範例

**物料帶出規格描述**（TYPE 1，掛載於銷售訂單明細備註 UDF）

```sql
SELECT T0.U_Spec
FROM OITM T0
WHERE T0.ItemCode = $[$38.1.0]
```

**客戶帶出核准信用額度**（TYPE 1，掛載於銷售文件表頭）

```sql
SELECT T0.CreditLine
FROM OCRD T0
WHERE T0.CardCode = $[$4.0.0]
```

B1 原生的信用管控是儲存時才警示；FMS 讓業務在輸入階段就能看到額度。

**科目帶出科目名稱**（TYPE 1，掛載於日記帳科目欄）

```sql
SELECT T0.AcctName
FROM OACT T0
WHERE T0.AcctCode = $[$46.0.0]
```

**供應商帶出預設銀行帳號**（TYPE 1，掛載於 AP 付款畫面）

```sql
SELECT TOP 1 T0.Account
FROM OCRB T0
WHERE T0.CardCode = $[$4.0.0]
  AND T0.SetAsDef = 'Y'
```

**倉庫帶出倉庫負責人**（TYPE 1，掛載於庫存移轉文件）

```sql
SELECT T0.U_Manager
FROM OWHS T0
WHERE T0.WhsCode = $[$155.0.0]
```

### 盤點系統中所有 FMS

FMS 掛載位置記錄在 `CSHS`，可搭配 `OUQR`、`OQCN` 一次列出所有設定：

```sql
SELECT
    T0.CatName      AS 查詢分類,
    T1.QName        AS 查詢名稱,
    T2.FormID       AS 表單ID,
    T2.ItemID       AS 掛載欄位,
    T2.Refresh      AS 自動重整,
    T2.FrceRfrsh    AS 定期重整,
    T2.ByField      AS 觸發來源欄位,
    T1.QString      AS 查詢內容
FROM OQCN T0
INNER JOIN OUQR T1 ON T0.CategoryId = T1.QCategory
INNER JOIN CSHS T2 ON T1.IntrnalKey = T2.QueryId
WHERE T0.CategoryId != -2
ORDER BY T1.QName
```

接手 MA 案或審查 Add-on 時，先執行這支 SQL，摸清既有 FMS 的位置再動手，避免改壞現有設定。

---

## 應用三：核決範本觸發條件（User Query in Approval Template）

### 核決範本的四個設定頁

在設定核決範本時，B1 提供四個頁籤：

| 頁籤 | 說明 |
|------|------|
| **創始者** | 設定「誰建立的單據」需要觸發此範本，可限定特定使用者或群組 |
| **文件** | 設定此範本規範的文件種類（如採購申請單、採購訂單） |
| **階段** | 設定此範本會套用哪些核決階段、執行順序，多階段時依序進行 |
| **條件** | 設定觸發簽核的條件：金額門檻、特定使用者，或 **User Query** |

**條件**頁籤是 User Query 的掛載位置。當條件中設定了 User Query，系統在建立單據時會自動執行 SQL——若回傳 `'TRUE'`，才啟動此核決範本。

核決範本的觸發條件，除了金額門檻與特定使用者，第三種是 **User Query**：當 SQL 回傳 `'TRUE'` 時，才啟動該核決範本。

這讓你可以同時結合多個維度（部門代碼、金額區間、倉庫、UDF 欄位）作為觸發條件，遠超過標準欄位能設定的範圍。

### 語法模式

```sql
SELECT DISTINCT 'TRUE'
FROM [單據資料表]
WHERE
    $[單據資料表.UDF欄位] IN ('值1', '值2')
    AND CAST($[單據資料表.DocTotal] AS NUMERIC) BETWEEN [下限] AND [上限]
```

此處的 `$[OPRQ.U_OPRQUDF01]` 與 `$[OPRQ.DocTotal]` 使用的是 `$[Table.Field]` 語法，與 FMS 的 `$[$ItemUID...]` 是同一套動態引用機制的不同寫法——皆在 SQL 執行前，由系統把畫面上的當前值帶入。

### 實戰範例：按部門與金額分流核決

採購申請單（`OPRQ`）依申請部門（UDF 欄位 `U_OPRQUDF01`）與金額，分配到不同的核決階段：

**P2 部門，金額 1,556–15,566**
```sql
SELECT DISTINCT 'TRUE'
FROM OPRQ
WHERE
    $[OPRQ.U_OPRQUDF01] IN ('3','4')
    AND CAST($[OPRQ.DocTotal] AS NUMERIC) BETWEEN 1556.663 AND 15566.625
```

**P2 部門，金額 > 15,566**
```sql
SELECT DISTINCT 'TRUE'
FROM OPRQ
WHERE
    $[OPRQ.U_OPRQUDF01] IN ('3','4')
    AND CAST($[OPRQ.DocTotal] AS NUMERIC) > 15566.625
```

**KS 部門，金額 15,566–31,133**
```sql
SELECT DISTINCT 'TRUE'
FROM OPRQ
WHERE
    $[OPRQ.U_OPRQUDF01] IN ('5')
    AND CAST($[OPRQ.DocTotal] AS NUMERIC) BETWEEN 15566.625 AND 31133.625
```

**KS 部門，金額 > 31,133**
```sql
SELECT DISTINCT 'TRUE'
FROM OPRQ
WHERE
    $[OPRQ.U_OPRQUDF01] IN ('5')
    AND CAST($[OPRQ.DocTotal] AS NUMERIC) > 31133.625
```

注意：`DocTotal` 在 `$[...]` 引用後為字串型態，做數值比較前必須 `CAST(... AS NUMERIC)`，否則比較結果不可預期。

### 測試 User Query 觸發條件

設定好觸發條件後，必須在儲存前驗證 SQL 是否正確。

**Step 1：Active Window**

![[20250529_綜美_核准範本_User Queries-1.png]]

先切換到對應的單據畫面（如採購申請單），讓系統知道 `$[OPRQ...]` 應從哪張表單取值。

**Step 2：Run the Query**

![[20250529_綜美_核准範本_User Queries.png]]

選擇事先已經寫好並儲存的User Query後執行。

**Step 3：Check the Outcome**

![[20250529_綜美_核准範本_User Queries-2.png]]

此時查詢結果會依照先前寫的User Query，將相關欄位的值帶出來，可以由此來檢視User Query 執行的結果是否和預期的一致。

---

## 常見陷阱

- **FMS 的 `$[...]` 引用了錯誤的 ItemUID**：不同表單、不同版本的 B1，ItemUID 可能有差異，建議透過 System Information 確認，不要憑記憶撰寫
- **FMS 掛載但不觸發**：最常見原因是 Auto Refresh 的觸發來源欄位沒有正確設定
- **TYPE 1 回傳多筆資料**：SQL 結果超過一筆，TYPE 1 只取第一筆，應確保 WHERE 條件精確或使用 `SELECT TOP 1`
- **核決 User Query 忘記轉型**：`CAST(... AS NUMERIC)` 遺漏後數值比較行為不可預期
- **參數 `[%0]` 與動態 `$[...]` 混用**：`[%0]` 是執行時手動輸入的參數，`$[...]` 是自動帶入畫面欄位值，兩者用途不同，不可混淆

---

## 顧問建議

- **接手 MA 案先執行 FMS 清查 SQL**：摸清既有掛載位置再動手，避免改壞現有設定
- **建立 FMS 命名規範**：查詢名稱建議包含觸發欄位與目標欄位，例如 `FMS_CardCode_CreditLine`，方便後續維護
- **核決 User Query 設定完立即測試**：在對應單據畫面執行查詢，確認回傳 `TRUE`，不要等上線後才發現觸發條件寫錯
- **以 UDF 搭配 FMS 擴充原生欄位**：不需動程式碼，是最低成本的畫面擴充方案

---

## 來源筆記

- [[SAP B1 User Query]]
- [[20250814_如何找出SAP B1 FMS掛載的位置]]
- [[20250529_綜美_核准範本_User Queries]]
- [[擷發_SP教育訓練_20251001]]
- [[FMS_簡易教學]]
- [[SAP Business One Dynamic Syntax]]
