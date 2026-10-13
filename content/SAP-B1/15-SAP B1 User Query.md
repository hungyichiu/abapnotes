---
title: SAP B1 User Query：從查詢報表到 FMS 到核決觸發
description: "整理 SAP B1 User Query 三種用法：查詢報表（OUQR）、FMS 的 $[...] 動態語法與 CSHS 掛載盤點、核准範本觸發條件（回傳 TRUE），接手舊系統或設定核准流程時照這份查。"
keywords:
  - SAP B1 User Query
  - FMS 格式化搜尋
  - 核准範本觸發條件
  - OUQR CSHS
  - 動態語法
tags:
  - SAP
  - B1
  - FMS
created: 2026-03-21
status: active
area: public
publish: false
source:
  - "[[B1-User Query]]"
  - "[[B1-20250814-如何找出SAP B1 FMS掛載的位置]]"
  - "[[20250529_綜美_核准範本_User Queries]]"
  - "[[擷發_20251001_SP教育訓練]]"
  - "[[SQL-FMS_簡易教學]]"
  - "[[B1-Dynamic Syntax]]"
---

# SAP B1 User Query：從查詢報表到 FMS 到核准觸發

## 【What】什麼是 User Query

SAP Business One 的 **User Query（使用者查詢）** 是一個內建的 SQL 查詢工具，讓顧問和使用者不需要寫 Add-on，只要一段 SQL，就能從系統資料庫中擷取、計算、呈現所需資料。

查詢儲存在 `OUQR`（使用者查詢主檔），以分類（`OQCN`）管理。進入路徑：

> [!info]
> 工具 → 查詢 → 查詢產生工具   ← 新增與測試
> 工具 → 查詢 → 查詢管理員     ← 執行已存檔的查詢

![[SAP B1 User Query_Query_Tool.webp]]

---

## 【So What】為什麼現場顧問離不開它

沒有 User Query 的話，顧問要客製一份報表或做欄位連動，只能等 IT 開發 Add-on 或求助 SAP 原廠，開發週期動輒數天。User Query 讓現場顧問自己在幾分鐘內完成，這是它在 B1 導入案中被大量使用的原因。

而且同一個查詢機制有三種用法：當報表、掛到表單欄位（FMS）做連動、當核准範本的觸發條件。三種應用共用同一套 SQL，各自的動態語法不同，本文分三節講。

---

## 如何找到資料表與欄位名稱

在撰寫 User Query 之前，需要先知道資料表和欄位的確切名稱。有兩個方法：

**方法一：查詢產生工具**

在查詢產生工具的資料表輸入框中，輸入 `OCRD` 再按 Tab 鍵，系統會自動列出該資料表的所有欄位，點擊即可加入查詢。

![[SAP B1 User Query_table_column.webp]]

**方法二：系統資訊（System Information）**

從選單列「檢視 → 系統資訊」勾選，或按 `Ctrl+Shift+I`，B1 左下角就會即時顯示游標所在欄位的資料表與欄位名稱，格式為 `Table.FieldName`（如 `OCRD.Balance`）。

![[SAP B1 User Query_sytem_info.webp]]

![[SAP B1 User Query_column_name.webp]]

---

## 【What For】應用一：查詢報表（Query Report）

最直觀的用法：把 SQL 結果呈現成一份可執行、可儲存、可分享的報表。

**案例：業務夥伴科目餘額報表**

業務夥伴主檔（`OCRD`）中，抓取代碼、名稱與科目餘額：

![[SAP B1 User Query_operation.webp]]

執行後的結果可直接匯出 Excel，或存成常用查詢，供日後在查詢管理員中快速呼叫：

![[SAP B1 User Query_query_review.webp]]

![[SAP B1 User Query_save_as_report.webp]]

**使用參數，提高靈活度**

User Query 支援最多 20 個查詢參數，依序為 `[%0]` 到 `[%19]`。執行時系統會跳出輸入視窗，讓使用者輸入篩選條件，例如指定銷售人員：

![[SAP B1 User Query_join.webp]]

![[SAP B1 User Query_parameters.webp]]

這讓同一支 SQL 可以服務不同的篩選需求，不必為每個條件另存一支查詢。

---

## 應用二：Formatted Search（FMS，格式化搜尋）

FMS 是把 User Query 掛載到表單欄位的機制。使用者在 A 欄位輸入值後，系統自動執行 SQL，把結果填入 B 欄位，做到欄位連動。

### `$[...]` 動態語法

FMS 透過 `$[...]` 語法，在 SQL 執行前把畫面上的欄位值帶入查詢條件：

> [!example]
> $[$<ItemUID>.<ColumnUID>.<DataType>]

DataType 常用四種：`0` 原樣帶入（字串）、`NUMBER` 去掉千分位當數值、`DATE` 日期、`CURRENCY` 金額的幣別。例如 `$[$38.1.0]` 是明細第 1 欄原樣帶入。

確認 ItemUID 的方式：開啟系統資訊（`Ctrl+Shift+I`），游標移到目標欄位，左下角會顯示 Item 和 Column 編號。

### 掛載模式

- **Auto Refresh**：勾了才會自動執行，要指定一個觸發欄位，那個欄位變動時跑 SQL。
	- **Refresh Regularly**：觸發欄位每次變動都重跑，目標欄位已經有值也會被蓋掉。
	- **Display Saved Values**：已存檔的單據顯示當初存的值，不重跑。
- 兩個都不勾，就只能在欄位上按 `Shift+F2` 手動觸發。

### FMS 查詢類型

以下是本文自訂的分類，不是 B1 的官方名詞：

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
SELECT T0.DflBankAct
FROM OCRD T0
WHERE T0.CardCode = $[$4.0.0]
```

業務夥伴主檔 `OCRD` 的 `DflBankCod`、`DflBankAct` 就是預設銀行和帳號，不用去 `OCRB` 翻。要列出全部帳號讓使用者選（TYPE 2）才查 `OCRB`，注意它的業務夥伴欄位叫 `BPCode` 不是 `CardCode`。

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

接手維護案或審查 Add-on 時，先執行這支 SQL，摸清既有 FMS 的位置再動手，避免改壞現有設定。

---

## 應用三：核准範本觸發條件（User Query in Approval Template）

### 核准範本的四個設定頁

在設定核准範本時，B1 提供四個頁籤：

| 頁籤 | 說明 |
|------|------|
| **創始者** | 誰送的單會套用這個範本 |
| **文件** | 這個範本管哪些文件種類 |
| **階段** | 走哪些核准階段、什麼順序 |
| **條件** | 什麼情況觸發：金額門檻、特定使用者，或 **User Query** |

階段和核准人員的盤點見 [[24-如何設計核准範本|核准範本盤點]]。

**條件**頁籤是 User Query 的掛載位置。系統在建立單據時執行這段 SQL，回傳 `'TRUE'` 才啟動這個範本。

這讓你可以同時結合多個維度（部門代碼、金額區間、倉庫、UDF 欄位）當觸發條件，標準欄位做不到這麼細。

### 語法模式

```sql
SELECT DISTINCT 'TRUE'
FROM [單據資料表]
WHERE
    $[單據資料表.UDF欄位] IN ('值1', '值2')
    AND CAST($[單據資料表.DocTotal] AS NUMERIC) BETWEEN [下限] AND [上限]
```

`$[OPRQ.U_OPRQUDF01]`、`$[OPRQ.DocTotal]` 用的是 `$[Table.Field]` 寫法，和 FMS 的 `$[$ItemUID…]` 是同一套動態引用機制。都是在 SQL 執行前，由系統把畫面上的當前值帶入。

### 實戰範例：按部門與金額分流核准

採購申請單（`OPRQ`）依申請部門（UDF 欄位 `U_OPRQUDF01`）與金額，分配到不同的核准階段。一個部門一個金額區間就是一個範本，每個範本的 User Query 長得一樣，只差部門值和金額：

```sql
-- P2 部門，金額 1,556 到 15,566
SELECT DISTINCT 'TRUE'
FROM OPRQ
WHERE
    $[OPRQ.U_OPRQUDF01] IN ('3','4')
    AND CAST($[OPRQ.DocTotal] AS NUMERIC) BETWEEN 1556.663 AND 15566.625
```

其他三個範本把部門值和金額換掉就好：

| 範本 | 部門值（`U_OPRQUDF01`） | 金額條件 |
|---|---|---|
| P2 部門，低區間 | `'3','4'` | `BETWEEN 1556.663 AND 15566.625` |
| P2 部門，高區間 | `'3','4'` | `> 15566.625` |
| KS 部門，低區間 | `'5'` | `BETWEEN 15566.625 AND 31133.625` |
| KS 部門，高區間 | `'5'` | `> 31133.625` |

`DocTotal` 用 `$[...]` 帶進來是字串，做數值比較前要 `CAST(... AS NUMERIC)`。金額有千分位逗號時 CAST 會失敗，改用 `$[OPRQ.DocTotal.NUMBER]` 讓 B1 先去掉逗號再帶入。

### 測試 User Query 觸發條件

設定好觸發條件後，先驗證 SQL 真的會回傳 `TRUE`，再掛到範本上。

**Step 1：先開著一張單據**

![[15-User-Query-驗證步驟-1.webp]]

切換到對應的單據畫面（例如一張填好的採購申請單），讓系統知道 `$[OPRQ…]` 要從哪張表單取值。沒有開單據直接執行，`$[...]` 會是空的。

**Step 2：從查詢管理員執行那段 User Query**

![[15-User-Query-驗證步驟-2.webp]]

工具 → 查詢 → 查詢管理員，選存好的那支查詢，執行。

**Step 3：看結果**

![[15-User-Query-驗證步驟-3.webp]]

結果視窗會把 `$[...]` 代入後的值和查詢結果一起列出來。符合條件就會看到一列 `TRUE`，沒有就是空的，回頭檢查部門值和金額區間。

---

## 常見陷阱

- **FMS 的 `$[...]` 引用了錯誤的 ItemUID**。
	- 不同表單、不同版本的 B1，ItemUID 可能有差異，用系統資訊確認，不要憑記憶寫。
- **FMS 掛載但不觸發**。
	- 最常見原因是 Auto Refresh 的觸發來源欄位沒有設對。
- **TYPE 1 回傳多筆資料**。
	- SQL 結果超過一筆時只取第一筆，WHERE 條件要精確，或用 `SELECT TOP 1`。
- **核准 User Query 忘記轉型**。
	- `CAST(... AS NUMERIC)` 漏掉，數值比較的結果不可預期。
- **參數 `[%0]` 與動態 `$[...]` 混用**。
	- `[%0]` 是執行時手動輸入的參數，`$[...]` 是自動帶入畫面欄位值，用途不同。

---

## 實作提醒

- **接手維護案先執行 FMS 清查 SQL**。
	- 摸清既有掛載位置再動手，避免改壞現有設定。
- **建立 FMS 命名規範**。
	- 查詢名稱包含觸發欄位與目標欄位，例如 `FMS_CardCode_CreditLine`。
- **核准 User Query 設定完立即測試**。
	- 在對應單據畫面執行查詢，確認回傳 `TRUE`，不要等上線後才發現條件寫錯。
- **以 UDF 搭配 FMS 擴充原生欄位**。
	- 不用動程式碼，是最低成本的畫面擴充方案。
