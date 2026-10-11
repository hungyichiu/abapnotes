---
title: "RFC 與 BAPI：SAP 對外通訊的標準介面"
tags:
  - SAP
  - ABAP
  - RFC
  - BAPI
created: 2026-05-15
status: draft
area: public
publish: false
source:
  - "[[ABAP-AS ABAP 架構組件總覽]]"
  - "[[ABAP-學習-開發核心：RICEFW 學習路徑指南]]"
---

## 【So What】為什麼不能讓外部系統直接存取 SAP 資料表

SAP 系統與外部系統整合時，不能讓對方直接讀寫底層資料表（如 `VBAK`、`EKKO`）。沒有商業邏輯檢查、沒有相容性保證，SAP 版本升級或欄位異動很容易讓外部程式全部壞掉。

RFC 與 BAPI 就是官方提供的「穩定對外窗口」。外部系統只透過這組封裝過、測試過的介面溝通，底層資料結構怎麼變動都不影響呼叫端。

## 【What】RFC 與 BAPI 的關係

SAP 系統與外部系統（ERP、MES、電商平台、報表工具）溝通，主要透過兩種機制：

- **RFC（Remote Function Call）**：讓一個 ABAP 系統呼叫另一個系統上的 Function Module，或讓外部程式呼叫 SAP Function Module
- **BAPI（Business Application Programming Interface）**：BAPI 是 **RFC-enabled Function Module 的子集**，由 SAP 官方定義、命名、測試，代表穩定的業務介面

簡單說：BAPI 是一種特殊的 RFC。不是所有 RFC Function Module 都是 BAPI，但所有 BAPI 都是 RFC-enabled Function Module。

```
RFC-enabled Function Module
│
├── 自行開發的 RFC（Z 開頭）
│
└── BAPI（SAP 官方定義，穩定的業務介面）
    ├── BAPI_SALESORDER_CREATEFROMDAT2
    ├── BAPI_PO_CREATE1
    └── BAPI_GOODSMVT_CREATE
    ...
```

---

## RFC 的四種類型

依通訊方式，RFC 有四種類型：

| 類型 | 說明 | 適用場景 |
|------|------|----------|
| **sRFC**（同步） | 呼叫後等待對方回應再繼續 | 需要即時回傳結果（查詢、驗證） |
| **aRFC**（非同步） | 呼叫後不等待，繼續執行 | 觸發對方執行，不需要回傳值 |
| **tRFC**（事務性） | 保證執行一次且只一次（Exactly Once），網路中斷會排隊重送、不會重複過帳 | 資料傳輸、財務過帳 |
| **qRFC**（佇列式） | tRFC 加上執行順序保證（Exactly Once In Order） | 需要按序執行的批次作業 |

日常開發中最常遇到的是 sRFC（直接呼叫取得結果）和 tRFC（資料整合）。

---

## 【What For】建立 RFC Function Module

若需要讓外部系統呼叫你的 SAP 邏輯，需要建立一個 Remote-Enabled Function Module：

### Step 1：SE37 建立 Function Module

```
SE37 → 輸入 Function Module 名稱（Z_ 開頭）→ Create
```

在 **Attributes** 頁籤，將 Processing Type 設為：
- `Remote-Enabled Module`：允許 RFC 呼叫

### Step 2：定義 Interface

RFC Function Module 的 Interface 有一條硬限制：**所有參數必須 Pass by Value**（加 `VALUE(…)`），不能用 Reference。沒加的話，啟用時語法檢查就會擋下來。

`SYSTEM_FAILURE` 和 `COMMUNICATION_FAILURE` 不是在 FM 介面宣告的，那是呼叫端 `CALL FUNCTION … DESTINATION` 時要接的系統例外，見下面「呼叫遠端系統」。FM 自己只宣告業務例外：

```abap
FUNCTION z_get_vendor_info.
*"---
*"*"Local Interface:
*"  IMPORTING
*"     VALUE(iv_lifnr) TYPE  LFA1-LIFNR
*"  EXPORTING
*"     VALUE(es_vendor) TYPE  LFA1
*"  EXCEPTIONS
*"     VENDOR_NOT_FOUND
*"---

  SELECT SINGLE * FROM lfa1
    INTO @es_vendor
    WHERE lifnr = @iv_lifnr.

  IF sy-subrc <> 0.
    RAISE vendor_not_found.
  ENDIF.

ENDFUNCTION.
```

---

## 呼叫 RFC 的模式

### 前置：設定 RFC 連線（SM59）

要呼叫另一個 SAP 系統的 Function Module，先在 **SM59** 建立 RFC Destination，設定目標系統的 Host、System Number、Logon 資訊。本機呼叫不需要。

### 呼叫同系統（本機）

```abap
" 呼叫本系統的 Function Module（一般呼叫，不需要 RFC）
CALL FUNCTION 'Z_GET_VENDOR_INFO'
  EXPORTING  iv_lifnr = '0001000001'
  IMPORTING  es_vendor = ls_vendor
  EXCEPTIONS vendor_not_found = 1
             OTHERS            = 2.
```

### 呼叫遠端系統（RFC）

```abap
" 指定 RFC Destination（在 SM59 設定的連線名稱）
CALL FUNCTION 'Z_GET_VENDOR_INFO'
  DESTINATION 'PROD_RFC_DEST'           " RFC Destination 名稱
  EXPORTING  iv_lifnr = '0001000001'
  IMPORTING  es_vendor = ls_vendor
  EXCEPTIONS vendor_not_found       = 1
             system_failure         = 2 MESSAGE lv_msg
             communication_failure  = 3 MESSAGE lv_msg
             OTHERS                 = 4.

IF sy-subrc <> 0.
  " 處理通訊失敗
ENDIF.
```

---

## BAPI：SAP 官方業務介面

### 找到正確的 BAPI

```
交易碼 BAPI → BAPI Explorer
```

BAPI Explorer 以業務物件樹狀結構組織，例如：
- `SalesOrder` → `CreateFromDat2`（建立銷售訂單）
- `PurchaseOrder` → `Create1`（建立採購單）
- `GoodsMovement` → `Create`（貨物移動）

### BAPI 呼叫的標準模式

BAPI 呼叫有固定的三步驟，不可省略：

```abap
" 只示範流程，欄位值依你的系統設定而定
DATA: ls_header   TYPE bapisdhd1,            " CREATEFROMDAT2 用 BAPISDHD1，不是 BAPISDHEAD1
      lt_items    TYPE TABLE OF bapisditm,
      lt_schedule TYPE TABLE OF bapischdl,
      lt_partners TYPE TABLE OF bapiparnr,
      lt_return   TYPE TABLE OF bapiret2,
      lv_vbeln    TYPE vbeln_va.

" Step 1：填入業務資料
ls_header-doc_type   = 'TA'.       " 銷售文件類型
ls_header-sales_org  = '1000'.
ls_header-distr_chan = '10'.
ls_header-division   = '00'.

APPEND VALUE #( itm_number = '000010'
                material   = 'MAT001'
                target_qty = 10 ) TO lt_items.
APPEND VALUE #( itm_number = '000010'
                req_qty    = 10 ) TO lt_schedule.
APPEND VALUE #( partn_role = 'AG'              " Sold-to party，必填
                partn_numb = '0000001234' ) TO lt_partners.

" Step 2：呼叫 BAPI
CALL FUNCTION 'BAPI_SALESORDER_CREATEFROMDAT2'
  EXPORTING
    order_header_in    = ls_header
  IMPORTING
    salesdocument      = lv_vbeln   " 回傳的銷售訂單號
  TABLES
    order_items_in     = lt_items
    order_schedules_in = lt_schedule
    order_partners     = lt_partners
    return             = lt_return. " 執行結果訊息

" Step 3：檢查 RETURN table，決定是否 Commit
READ TABLE lt_return WITH KEY type = 'E'
     TRANSPORTING NO FIELDS.

IF sy-subrc <> 0.
  " 沒有 Error 訊息 → Commit
  CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'
    EXPORTING wait = 'X'.         " wait = 'X'：等待 Commit 完成
ELSE.
  " 有 Error → Rollback
  CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
ENDIF.
```

**關鍵原則**：
- BAPI 呼叫本身不會自動 Commit，必須明確呼叫 `BAPI_TRANSACTION_COMMIT`
- 必須先檢查 `lt_return` 中是否有 `type = 'E'`（Error）的訊息，再決定 Commit 或 Rollback
- `wait = 'X'` 確保 Commit 在後台完成後才繼續執行，避免後續查詢讀到 Commit 前的狀態

### 解讀 RETURN Table

```abap
LOOP AT lt_return INTO DATA(ls_return).
  WRITE: / ls_return-type,    " 訊息類型：E/W/I/S
           ls_return-id,      " 訊息類別
           ls_return-number,  " 訊息號碼
           ls_return-message. " 訊息文字
ENDLOOP.
```

| Type | 意義 |
|------|------|
| `E` | Error — BAPI 執行失敗，需要 Rollback |
| `W` | Warning — 執行成功但有警告 |
| `I` | Info — 一般資訊 |
| `S` | Success — 成功訊息 |

---

## 常見場景：BAPI 建立採購單

```abap
DATA: ls_header  TYPE bapimepoheader,
      ls_headerx TYPE bapimepoheaderx,
      lt_items   TYPE TABLE OF bapimepoitem,
      lt_itemsx  TYPE TABLE OF bapimepoitemx,
      lt_return  TYPE TABLE OF bapiret2,
      lv_ebeln   TYPE ebeln.

" Header
ls_header-comp_code  = '1000'.
ls_header-doc_type   = 'NB'.
ls_header-vendor     = '0001000001'.
ls_header-purch_org  = '1000'.
ls_header-pur_group  = '001'.
ls_header-doc_date   = sy-datum.

" HeaderX（必須同步勾選哪些欄位有傳值）
ls_headerx-comp_code = 'X'.
ls_headerx-doc_type  = 'X'.
ls_headerx-vendor    = 'X'.
ls_headerx-purch_org = 'X'.
ls_headerx-pur_group = 'X'.
ls_headerx-doc_date  = 'X'.

CALL FUNCTION 'BAPI_PO_CREATE1'
  EXPORTING
    poheader  = ls_header
    poheaderx = ls_headerx
  IMPORTING
    exppurchaseorder = lv_ebeln
  TABLES
    poitem   = lt_items
    poitemx  = lt_itemsx
    return   = lt_return.

READ TABLE lt_return WITH KEY type = 'E'
     TRANSPORTING NO FIELDS.
IF sy-subrc <> 0.
  CALL FUNCTION 'BAPI_TRANSACTION_COMMIT' EXPORTING wait = 'X'.
ELSE.
  CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
ENDIF.
```

**X-Structure 說明**：許多 BAPI（特別是 Change 類型）搭配一個 `HeaderX` / `ItemX` 結構，用 `'X'` 標記哪些欄位實際傳了值，讓 SAP 知道應該更新哪些欄位。沒有標記 `'X'` 的欄位即使有值也不會被更新。

---

## 常見陷阱

**陷阱一：忘記 Commit、只看 sy-subrc**

上面「關鍵原則」的兩條就是最常見的錯：沒呼叫 `BAPI_TRANSACTION_COMMIT` 資料不會寫入；`sy-subrc = 0` 只代表 FM 呼叫成功，業務錯誤在 `lt_return` 的 `type = 'E'` 裡。

**陷阱二：RFC 參數使用 Reference 傳遞**

RFC Function Module 的所有參數必須是 Pass by Value。不加 `VALUE(...)`，啟用 FM 時語法檢查就會報錯。

**陷阱三：X-Structure 未同步更新**

使用帶 X-Structure 的 BAPI 時，新增了資料欄位但忘記在對應的 X-Structure 欄位標 `'X'`，導致資料沒有被更新。

---

## 實作提醒

- **先在 SE37 測試 BAPI**。
	- 確認參數和回傳值格式，再寫程式。
	- SE37 單測 BAPI 不會 commit。要真的寫入，用 Test Sequence 把 `BAPI_TRANSACTION_COMMIT` 排在後面一起跑。
- **RETURN table 的訊息要顯示給使用者**。
	- 不要靜默丟棄，至少 LOG 下來或顯示在畫面上，方便 trace 問題。
- **tRFC 用於資料整合**。
	- 擔心網路中斷造成資料遺失或重複，改用 tRFC，SAP 保證執行一次且只一次。

---

## 相關閱讀

- [[00-SAP-AS-ABAP架構組件總覽]]：RFC 在 AS ABAP 架構裡的位置
- [[07-Custom-BAPI]]：自己建一個 BAPI
- [[Find-BAPI]]：怎麼找到對的標準 BAPI
