---
title: "Crystal Reports 在 SAP B1 中的完整應用指南"
tags:
  - SAP
  - B1
  - Crystal_Reports
created: 2026-03-15
status: completed
area: resources
publish: true
---

# Crystal Reports 在 SAP B1 中的完整應用指南

## 前言

Crystal Reports（CR）是 SAP Business One 原生支援的報表工具，也是顧問在專案中使用最頻繁的客製化手段之一。它能做到 B1 內建報表做不到的事：精確控制版面、複雜的跨表計算、條件式格式化，以及符合客戶印刷需求的正式文件輸出。

這篇文章的目標是建立一套清晰的工作框架，從部署方式、連線設定、設計流程，到常見的格式化技巧與發佈管理。如果你剛開始接觸 SAP B1 的 CR 報表，這裡是一個完整的起點。

---

## CR 在 SAP B1 中的部署方式

CR 報表在 B1 環境中有三種主要的使用方式，選擇哪一種取決於公司的 IT 架構：

| 部署方式 | 說明 | 適用情境 |
|----------|------|----------|
| 本地端（Local） | 在顧問或使用者的個人電腦安裝 CR Designer，直接連接資料庫設計與預覽 | 開發、測試階段 |
| 伺服器端（Server） | 報表 .rpt 檔案上傳至 B1 伺服器，由 B1 Client 呼叫執行 | 正式上線環境 |
| Web（B1 Web Client） | 透過瀏覽器執行，報表需符合 B1 Web 的執行條件 | 雲端或遠端存取需求 |

實務上，大多數台灣中小企業採用「伺服器端」部署：顧問在本地設計好報表，再上傳至 B1 伺服器，使用者從 B1 Client 呼叫列印。

---

## 連線配置：ODBC vs SQL Server Direct

CR 連線資料庫的方式影響報表的相容性與效能，B1 環境中主要有兩種：

### SQL Server（MS SQL）環境

連線類型使用 **OLE DB (ADO)**，驅動選擇 `Microsoft OLE DB Provider for SQL Server`。在 B1 版本下，連線名稱通常顯示為 `OLED(ADO)`。

設計時指向開發資料庫，上線後只需更換資料來源，Schema 結構不變即可直接使用。

### SAP HANA 環境

HANA 版本的連線需要特別注意。當你從 B1 HANA 系統匯出 CR 報表時，系統會自動將連線名稱改為：

> [!example]
> DRIVER={B1CRHPROXY}:SERVERNODE=192.168.x.x:30013；DATABASE=CompanyDB:databaseName=HDB

這個連線格式只在原系統上有效。若要在其他環境（例如本地 CR Designer）打開並修改報表，必須手動將連線改為標準 HANA ODBC：

> [!example]
> DRIVER={HDBODBC32}:SERVERNODE=192.168.x.x:30015；DATABASENAME=HDB:CURRENTSCHEMA=CompanyDB_OFFICIAL

操作路徑：在 CR Designer 中選取「資料庫 > 設定資料來源位置」，選取原報表連線與新目標連線後執行「更新」即可。

---

## 報表設計流程

一份 CR 報表的開發步驟通常如下：

1. **確認資料需求**：與客戶確認報表欄位、篩選條件、排序規則，以及輸出格式（A4/A3、橫排/直排）
2. **撰寫 SQL Query**：在 SQL Server Management Studio 中驗證資料正確性，再貼入 CR 的 Command 物件
3. **設計版面**：配置 Report Header、Page Header、Details、Group Footer、Report Footer 等節區
4. **設定 Selection Criteria**：使用 Token（適用於 B1 整合報表）或 Crystal 原生參數（適用於獨立報表）
5. **測試與微調**：在 CR Designer 預覽，確認分頁、群組、小計邏輯正確
6. **上傳與指定**：透過 B1 的「報表與版面 > 報表組織工具」上傳 .rpt 檔案，指定給對應模組

---

## 常用格式化公式

Crystal Reports 使用 Crystal 語法（Basic-like），以下是實務中最常用的格式化技巧：

### 交替行背景色（依資料行）

```crystal
select RecordNumber mod 2
case 0: crWhite
case 1: color(222, 222, 222)
```

### 交替行背景色（依群組）

```crystal
select GroupNumber mod 2
case 0: crWhite
case 1: color(222, 222, 222)
```

使用方式：在目標 Section 的「格式化節區 > 背景色」中，勾選「使用公式」並填入上述語法。交替色可以大幅提升報表可讀性，特別是明細行數量多的情況。

### NULL 值處理

當欄位加總結果可能出現 NULL 時（例如某群組下無資料），直接顯示會造成報表版面異常，應使用：

```crystal
if IsNull({field}) then "0" else ToText({field}, 0, "")
```

---

## 移除浮水印「列印由 SAP Business One」

新安裝或 Trial 版本的 B1 環境，CR 報表預覽時會出現「列印由 SAP Business One」的浮水印字樣，這在正式文件中非常不適合。

移除方式非常簡單：

- 路徑：**管理 > 系統初始化 > 列印偏好**
- 取消勾選：「列印 SAP Business One 產生訊息供 Crystal Reports 使用」

這個設定是全公司共用的，只需設定一次即可。

---

## 報表發佈管理

上線後的報表管理是顧問容易忽略的環節，建議建立以下習慣：

1. **版本控管**：每次修改前，保留舊版 .rpt 檔案，以日期命名備份（例如 `Invoice_20260514.rpt`）
2. **測試環境驗證**：先在測試公司（Test Company）驗證後，再更新正式環境
3. **連線一致性**：確認 .rpt 檔案中的資料庫連線帳號，使用的是有適當讀取權限的專用帳號，避免使用個人帳號
4. **報表命名規則**：依照 B1 標準命名，例如報表代碼（ARR021）+ 說明（客戶對帳單）

---

## 常見陷阱

- **HANA 連線匯出後無法在本地開啟**：如前述，需手動更換 ODBC Driver，這是初次接觸 HANA CR 報表的顧問最常踩的坑
- **日期參數格式不符**：CR 的日期參數與 B1 Token 的日期格式略有差異，混用時容易產生型別錯誤，應在 SQL 端用 CONVERT 統一格式
- **節區高度設定為零**：當某節區設定為隱藏（Suppress）但高度不為零，列印時仍會保留空白，需確認高度設為 0
- **中文字型顯示問題**：在部分環境下，PDF 輸出的中文字型可能變成亂碼，需確認報表使用的字型（建議使用「新細明體」或「微軟正黑體」）有嵌入 PDF

---

## 實作提醒

Crystal Reports 的學習曲線比多數人預期的短，但要做出「客戶覺得好用」的報表，需要同時具備三種能力：

1. 理解 B1 資料結構（知道資料從哪來）
2. 熟悉 SQL 查詢（把對的資料查出來）
3. 掌握 CR 版面設計（讓資料好看）

三者缺一不可。許多顧問 SQL 寫得很好，但版面調整不到位；或者版面漂亮，但資料邏輯有誤。建議從真實客戶案例（例如發票、對帳單）入手，完整走過一遍設計到上線的流程，會比看教學影片有效得多。

---

## 來源筆記

- [[Crystal Report]]
- [[CR報表]]
- [[CR報表教育訓練]]
- [[Crystal Report  - B1 HANA 下載的CR報表如何設定連線]]
- [[Crystal Report - 如何移除浮水印_列印由 SAP Business One]]
- [[Crystal Report 常用格式化公式]]
- [[How to Work with SAP Crystal Reports in SAP  Business One]]
- [[如何重新安裝SAP Crystal Report for B1]]
- [[Crystal Report]]
