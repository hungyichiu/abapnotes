---
title: "B1 Token 機制：讓報表參數動態化"
tags:
  - SAP
  - B1
  - Crystal_Reports
created: 2026-03-17
status: completed
area: resources
publish: true
---

# B1 Token 機制：讓報表參數動態化

## 前言

在 SAP Business One 中，Crystal Reports 報表可以透過「Token」機制，讓使用者在執行報表前透過標準的 B1 介面輸入篩選條件，而不是在 CR Designer 裡硬編碼固定值。

這個機制的重要性在於：**Token 讓報表的篩選介面「長得像 B1」**。使用者不需要學習額外的操作，就能用熟悉的「選擇清單（Choose from List）」或「日曆控件」來設定查詢範圍。對顧問而言，Token 是銜接 Crystal Reports 與 B1 原生體驗的關鍵橋樑。

---

## 什麼是 Token

SAP Business One 提供了一組特殊的參數語法，稱為 Token，用來在 Crystal Reports 報表中建立標準的 B1 控件（Control）。

當報表執行時，B1 會根據 Token 的定義，自動產生對應的輸入介面：可能是一個下拉選單、一個選擇清單按鈕、一個日期選擇器，甚至是科目樹狀結構。使用者在這個介面選擇條件後，B1 再將選取的值傳入報表的 SQL 查詢中。

---

## Token 語法組成

Token 的基本語法格式如下：

> [!example]
> <parameter_name>@<SQL_Expression>

其中有幾條必須遵守的規則：

- **參數名稱**必須以英數字或底線（`_`）開頭
- **`@` 符號是保留字**，緊接在參數名稱後面，中間不能有空格
- **`@` 後面直接接 SQL 語法**，同樣不能有空格
- SQL 語法通常是 `SELECT ... FROM ... WHERE ...` 的形式，但並非所有資料表都需要完整的 SELECT 語法

範例：
> [!example]
> CardFrom@FROM OCRD WHERE cardType='c'
這個 Token 名稱是 `CardFrom`，它會在 B1 報表執行時，產生一個讓使用者從客戶主檔（OCRD）選取客戶的控件，且只顯示「客戶（cardType='c'）」類型的商業夥伴。

---

## 主要 Token 類型

### 1. 物料選擇（OITM）

```sql
ItemFrom@SELECT * FROM OITM
```

使用 `SELECT *` 而不指定欄位時，B1 會產生一個「選擇清單」按鈕（Choose from List），點擊後開啟標準的物料清單視窗。這是最直觀的使用者體驗，讓使用者用熟悉的物料搜尋方式選取。

若改為指定欄位（例如 `SELECT ItemCode, ItemName FROM OITM`），則會變成下拉選單，第一欄為 Key，第二欄為顯示文字。

### 2. 商業夥伴選擇（OCRD）

```sql
CardFrom@FROM OCRD
```

注意：OCRD 不需要 `SELECT`，直接從 `FROM` 開始。可加 WHERE 條件進一步限定類型：

| 目的 | Token 語法 |
|------|------------|
| 所有商業夥伴 | `xx@FROM OCRD` |
| 僅客戶 | `xx@FROM OCRD WHERE cardType='c'` |
| 僅供應商 | `xx@FROM OCRD WHERE cardType='s'` |

### 3. 日期選擇（DATE / OFPR）

Token 提供兩種日期輸入方式：

**自由輸入**（使用者可任意輸入日期）：
```sql
DateFrom@
```
不接任何 SQL，B1 會提供一個日曆控件讓使用者自由選日期。

**限定為過帳期間**（只能選已定義的財務期間）：
```sql
PeriodFrom@SELECT * FROM OFPR
```
這種方式適合財務報表，確保使用者選的是合法的會計期間。

### 4. 會計科目（OACT）

```sql
AcctFrom@SELECT * FROM OACT
```

OACT 同樣不需要 SELECT 開頭，但加上 `SELECT *` 也可以。B1 會產生科目樹狀選擇介面，方便使用者瀏覽科目結構後選取。

### 5. 倉庫選擇（OWHS）

```sql
WhsFrom@SELECT * FROM OWHS
```

產生倉庫選擇控件，適合用在庫存相關報表。B1 同時支援「依地點」和「依倉庫」兩種顯示模式。

---

## 四個應用場景

### 場景一：客戶篩選（Between 範圍）

```sql
-- CR Parameter 設定：
CARDFROM@FROM OCRD WHERE cardType='c'
CARDTO@FROM OCRD WHERE cardType='c'

-- CR Selection Expert / SQL WHERE 條件：
{OINV.CardCode} >= {?CARDFROM} AND {OINV.CardCode} <= {?CARDTO}
```

![[bp_criteria.png]]

實務中常用「起始值到結束值」的 Between 設計，讓使用者可以選擇單一客戶（起始=結束）或客戶範圍。

### 場景二：期間篩選

```sql
-- CR Parameter：
DAYFROM@
DAYTO@

-- SQL WHERE：
{OINV.DocDate} >= {?DAYFROM} AND {OINV.DocDate} <= {?DAYTO}
```
![[date_pick_free.png]]

日期範圍是最常見的篩選需求，幾乎所有業務報表都會用到。

### 場景三：物料篩選

```sql
ItemCode@SELECT * FROM OITM
```

若報表需要讓使用者選取特定物料後，再顯示該物料的相關交易紀錄，就使用這個 Token 搭配 `WHERE INV1.ItemCode = '{?ItemCode}'` 的條件。

### 場景四：倉庫篩選

```sql
WhsCode@SELECT * FROM OWHS
```

庫存移轉、盤點、庫齡分析等報表，通常會加入倉庫篩選，讓倉管人員只看到自己負責的倉庫資料。

---

## 特殊 Token：DocKey@ 與 ObjectId@

除了查詢用的篩選 Token，B1 還有兩個特殊用途的 Token，主要用在「版面配置（Layout）」模式的報表（例如發票列印格式）：

- **DocKey@**：這是 Layout 報表的**必填** Token，用來識別目前正在預覽或列印的文件。在 Selection Expert 中需設定：`{OINV.DocEntry} = {?DocKey@}`
- **ObjectId@**：選填，用在同一份 .rpt 檔案需對應多種文件類型時，讓報表能根據文件類型動態調整標題或欄位

---

## Token 與 FMS 的區別

許多 B1 顧問對 Token 與 FMS（Formatted Search，格式化搜尋）的用途感到混淆，以下做個比較：

| 特性 | Token | FMS |
|------|-------|-----|
| 使用場景 | Crystal Reports 報表參數 | B1 畫面欄位輔助輸入 |
| 觸發時機 | 執行報表前 | 在 B1 表單欄位中觸發 |
| 資料寫入 | 傳入報表 SQL，不寫入資料庫 | 可將結果填入畫面欄位 |
| 介面形式 | B1 報表參數視窗 | 下拉選單或選擇清單 |
| SQL 撰寫位置 | CR Designer 的參數設定 | B1 管理介面的查詢設定 |

簡單說：**Token 是「報表執行前的輸入介面」，FMS 是「表單填寫時的輔助查詢」**。兩者都是透過 SQL 驅動，但作用域完全不同。

---

## 常見陷阱

- **`@` 後面不能有空格**：`CardFrom@ FROM OCRD` 是錯的，必須是 `CardFrom@FROM OCRD`，這是初學者最常犯的語法錯誤
- **Token 只能用於 B1 整合的報表**：如果 .rpt 檔案是在 B1 系統外獨立執行（例如用 CR Designer 直接預覽），Token 不會產生 B1 介面，需改用 CR 原生參數測試
- **多值選擇（Multi-value）需在 CR Parameter 設定**：若要讓使用者選多個值，需在 CR Designer 的參數設定中勾選「允許多個值」，否則 B1 介面只會讓使用者選一個
- **OCRD Token 不加 SELECT**：OCRD 和 OACT 是例外，直接從 `FROM` 開始，加了 `SELECT *` 反而可能造成問題

---

## 實作提醒

Token 機制是一個「看起來簡單、用起來有細節」的功能。建議在每個新專案中，建立一份常用 Token 的參考清單，包含參數名稱、SQL 語法、對應的 B1 介面類型，這樣在設計新報表時可以直接套用，減少每次都要查文件的時間。

更進階的應用是讓 Token 互相依賴，例如先選國家、再根據國家篩選州別，這需要在第二個 Token 的 SQL 中引用第一個 Token 的值（`WHERE Country = '@Country'`）。這種做法能大幅提升報表的使用便利性，非常適合用在地區業務分析等場景。

---

## 來源筆記

- [[Syntax and Rules for Defining Tokens]]
- [[Tokens for Creating SAP Business One Controls]]
- [[@beginDate = MIN(F_RefDate), @endDate = MAX(T_RefDate)]]
