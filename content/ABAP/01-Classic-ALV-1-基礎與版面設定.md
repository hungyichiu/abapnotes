---
title: "Classic ALV:基礎與版面設定"
tags:
  - SAP
  - ABAP
  - ALV
created: 2026-05-15
status: active
area: resources
publish: true
---

# Classic ALV:基礎與版面設定

> 本篇是「Classic ALV」系列第 1 篇,共 3 篇:基礎與版面設定(本篇)→ [[01-Classic-ALV-2-互動與跳轉|互動與跳轉]] → [[01-Classic-ALV-3-可編輯ALV與資料回寫|可編輯 ALV 與資料回寫]]

## 【So What】為什麼用 ALV

ABAP 最原始的報表輸出是 `WRITE` 語句——把資料一行一行寫到畫面上。這在功能上沒問題,但缺少排序、篩選、匯出 Excel、加總等功能,使用者每次都要手動處理。

**ABAP List Viewer(ALV)** 是 SAP 提供的標準報表框架,內建這些功能,不需要自己寫。對顧問而言,這也是幾乎每個客製報表需求都會用到的基本工具——省下重造排序、篩選、匯出邏輯的時間。一張 ALV 報表,使用者可以:

- 點擊欄位標題排序
- 設定篩選條件
- 匯出成 Excel / CSV
- 設定群組小計
- 調整欄位顯示順序與寬度

Classic ALV 指的是以 `REUSE_ALV_*` 系列 Function Module 為核心的傳統實作方式,是 ABAP 顧問最常接觸的 ALV 形式。本篇先處理「顯示一份資料」需要的基礎設定,第 2、3 篇再進入互動與可編輯功能。

---

## 【What】ALV 的兩件事

不管用哪種 ALV 函數,核心只有兩件事:

1. **Field Catalog**:告訴 ALV 每個欄位的設定(標題、寬度、對齊、是否可排序)
2. **資料綁定**:把 internal table 傳給 ALV 顯示

```abap
" 一個最小的 ALV 呼叫
CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    it_fieldcat = lt_fcat      " Field Catalog
  TABLES
    t_outtab    = gt_data.     " 要顯示的資料
```

---

## Field Catalog:手動 vs 自動合併

### 自動合併(REUSE_ALV_FIELDCATALOG_MERGE)

讓 SAP 自動從 DDIC 結構讀取欄位定義,再手動調整特定欄位:

```abap
DATA: lt_fcat TYPE slis_t_fieldcat_alv.

CALL FUNCTION 'REUSE_ALV_FIELDCATALOG_MERGE'
  EXPORTING
    i_program_name         = sy-repid
    i_internal_tabname     = 'GT_DATA'   " internal table 名稱(大寫字串)
    i_inclname             = sy-repid
  CHANGING
    ct_fieldcat            = lt_fcat.
```

優點:快速。缺點:欄位順序由 DDIC 決定,欄位名稱也直接沿用,較難控制呈現。

### 手動建立(實務首選)

直接宣告每個欄位的設定,完全掌控:

```abap
DATA: lt_fcat TYPE slis_t_fieldcat_alv,
      ls_fcat TYPE slis_fieldcat_alv.

" 欄位 1:採購單號
CLEAR ls_fcat.
ls_fcat-fieldname   = 'EBELN'.       " 對應 internal table 的欄位名稱
ls_fcat-seltext_m   = '採購單號'.    " 欄位標題(中)
ls_fcat-outputlen   = 10.            " 欄位寬度
ls_fcat-col_pos     = 1.             " 欄位位置
APPEND ls_fcat TO lt_fcat.

" 欄位 2:供應商
CLEAR ls_fcat.
ls_fcat-fieldname   = 'LIFNR'.
ls_fcat-seltext_m   = '供應商'.
ls_fcat-outputlen   = 10.
ls_fcat-col_pos     = 2.
APPEND ls_fcat TO lt_fcat.

" 欄位 3:金額(數值欄位)
CLEAR ls_fcat.
ls_fcat-fieldname   = 'NETWR'.
ls_fcat-seltext_m   = '淨值'.
ls_fcat-outputlen   = 15.
ls_fcat-col_pos     = 3.
ls_fcat-do_sum      = 'X'.           " 顯示總計
ls_fcat-datatype    = 'CURR'.        " 貨幣格式
APPEND ls_fcat TO lt_fcat.
```

手動建立雖然比較長,但欄位順序、標題、格式完全自訂,是現場最常見的做法。

**加總的分組邏輯**:數量欄位綁定單位欄(`qfieldname`)、金額欄位綁定幣別欄(`cfieldname`),ALV 才會依單位/幣別分組加總,不會把不同單位或幣別的數字混加:

```abap
FIELD-SYMBOLS: <fs_fc> TYPE slis_fieldcat_alv.
READ TABLE lt_fcat ASSIGNING <fs_fc> WITH KEY fieldname = 'MENGE'.
IF sy-subrc = 0.
  <fs_fc>-qfieldname = 'MEINS'.   " 數量欄綁定單位欄
  <fs_fc>-do_sum     = 'X'.
ENDIF.
```

---

## LIST vs GRID

Classic ALV 有兩個主要的顯示函數:

| 函數 | 特性 | 使用時機 |
|------|------|----------|
| `REUSE_ALV_LIST_DISPLAY` | 純文字清單,類似 WRITE | 僅需簡單報表,不需互動 |
| `REUSE_ALV_GRID_DISPLAY` | 表格介面,支援滑鼠操作 | 絕大多數情況的首選 |

```abap
" LIST:簡單
CALL FUNCTION 'REUSE_ALV_LIST_DISPLAY'
  EXPORTING
    it_fieldcat = lt_fcat
  TABLES
    t_outtab    = gt_data.

" GRID:互動
CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    i_callback_program = sy-repid   " 提供 callback 必填
    it_fieldcat        = lt_fcat
  TABLES
    t_outtab           = gt_data.
```

---

## Layout 設定

`REUSE_ALV_GRID_DISPLAY` 接受一個 `is_layout` 參數,控制整體顯示行為:

```abap
DATA: ls_layout TYPE slis_layout_alv.

ls_layout-zebra          = 'X'.   " 交替行背景色
ls_layout-colwidth_optimize = 'X'. " 自動欄寬
ls_layout-cell_merge     = 'X'.   " 相同值的儲存格合併顯示
ls_layout-box_fieldname  = 'SEL'. " 指定勾選框欄位名稱(多選用)

CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    is_layout   = ls_layout
    it_fieldcat = lt_fcat
  TABLES
    t_outtab    = gt_data.
```

`i_save` 參數控制版面能不能被使用者儲存:

| 值 | 說明 |
|---|---|
| `'A'` | 允許儲存個人版面與全域版面 |
| `'U'` | 只允許儲存個人版面 |
| `'X'` | 只允許儲存全域版面 |
| `' '` | 不允許儲存版面 |

---

## 排序與小計

透過 `it_sort` 參數預設排序條件:

```abap
DATA: lt_sort TYPE slis_t_sortinfo_alv,
      ls_sort TYPE slis_sortinfo_alv.

" 依採購單號升冪排序,並在此欄位設群組小計
ls_sort-fieldname  = 'EBELN'.
ls_sort-up         = 'X'.     " 升冪(down = 降冪)
ls_sort-subtot     = 'X'.     " 每個採購單號顯示小計
ls_sort-spos       = 1.       " 排序優先順序
APPEND ls_sort TO lt_sort.

CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    it_fieldcat = lt_fcat
    it_sort     = lt_sort
  TABLES
    t_outtab    = gt_data.
```

小計功能需要搭配 Field Catalog 中對應欄位設定 `do_sum = 'X'` 才會顯示。

---

## 【What For】完整最小程式範本

以下是一個可直接執行的最小 Classic ALV 程式,展示完整的使用模式,先撈資料、建 Field Catalog、設定 Layout,再一次呼叫顯示:

```abap
REPORT z_alv_demo.

TYPES: BEGIN OF ty_data,
  ebeln TYPE ekko-ebeln,
  lifnr TYPE ekko-lifnr,
  netwr TYPE ekko-netwr,
  waers TYPE ekko-waers,
END OF ty_data.

DATA: gt_data   TYPE TABLE OF ty_data,
      lt_fcat   TYPE slis_t_fieldcat_alv,
      ls_fcat   TYPE slis_fieldcat_alv,
      ls_layout TYPE slis_layout_alv.

START-OF-SELECTION.

  " 取資料
  SELECT ebeln, lifnr, netwr, waers
    FROM ekko
    INTO TABLE @gt_data
    WHERE bstyp = 'F'
      AND loekz = ''
    UP TO 100 ROWS.

  " Field Catalog
  DEFINE add_field.
    CLEAR ls_fcat.
    ls_fcat-fieldname = &1.
    ls_fcat-seltext_m = &2.
    ls_fcat-outputlen = &3.
    ls_fcat-col_pos   = &4.
    APPEND ls_fcat TO lt_fcat.
  END-OF-DEFINITION.

  add_field 'EBELN' '採購單號' 10 1.
  add_field 'LIFNR' '供應商'   10 2.
  add_field 'NETWR' '淨值'     15 3.

  " 淨值欄位加總
  READ TABLE lt_fcat WITH KEY fieldname = 'NETWR'
       ASSIGNING FIELD-SYMBOL(<ls_fcat>).
  IF sy-subrc = 0.
    <ls_fcat>-do_sum    = 'X'.
    <ls_fcat>-datatype  = 'CURR'.
    <ls_fcat>-cfieldname = 'WAERS'.  " 貨幣欄位
  ENDIF.

  " Layout
  ls_layout-zebra             = 'X'.
  ls_layout-colwidth_optimize = 'X'.

  " 顯示
  CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
    EXPORTING
      i_callback_program = sy-repid
      is_layout          = ls_layout
      it_fieldcat        = lt_fcat
    TABLES
      t_outtab           = gt_data.
```

---

## 常見陷阱

- **Field Catalog 欄位名稱與 internal table 不符**:`fieldname` 必須與 internal table 的欄位名稱完全一致(包含大小寫),否則欄位會顯示空白
- **`SELECT` 欄位順序與結構不一致**:用 `INTO TABLE` 時 SAP 依位置對應欄位,順序錯了會報型別不符,改用 `INTO CORRESPONDING FIELDS OF TABLE` 或確保順序一致可避免

---

## 來源筆記

- [[6. ABAP List Viwer(ALV) 1-30]]
- [[ALV]]
- [[Day9 ALV Grid Reports]]
- [[abap-alv-scenario-01]]

**下一篇**:[[01-Classic-ALV-2-互動與跳轉]]
