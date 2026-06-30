---
tags:
  - SAP
  - ABAP
  - ALV
created: 2026-05-15
status: draft
area: resources
publish: false
---

# Classic ALV：從 Field Catalog 到互動報表

## 為什麼用 ALV

ABAP 最原始的報表輸出是 `WRITE` 語句——把資料一行一行寫到畫面上。這在功能上沒問題，但缺少排序、篩選、匯出 Excel、加總等功能，使用者每次都要手動處理。

**ABAP List Viewer（ALV）** 是 SAP 提供的標準報表框架，內建這些功能，不需要自己寫。一張 ALV 報表，使用者可以：

- 點擊欄位標題排序
- 設定篩選條件
- 匯出成 Excel / CSV
- 設定群組小計
- 調整欄位顯示順序與寬度

Classic ALV 指的是以 `REUSE_ALV_*` 系列 Function Module 為核心的傳統實作方式，是 ABAP 顧問最常接觸的 ALV 形式。

---

## ALV 的兩件事

不管用哪種 ALV 函數，核心只有兩件事：

1. **Field Catalog**：告訴 ALV 每個欄位的設定（標題、寬度、對齊、是否可排序）
2. **資料綁定**：把 internal table 傳給 ALV 顯示

```abap
" 一個最小的 ALV 呼叫
CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    it_fieldcat = lt_fcat      " Field Catalog
  TABLES
    t_outtab    = gt_data.     " 要顯示的資料
```

---

## Field Catalog：手動 vs 自動合併

### 自動合併（REUSE_ALV_FIELDCATALOG_MERGE）

讓 SAP 自動從 DDIC 結構讀取欄位定義，再手動調整特定欄位：

```abap
DATA: lt_fcat TYPE slis_t_fieldcat_alv.

CALL FUNCTION 'REUSE_ALV_FIELDCATALOG_MERGE'
  EXPORTING
    i_program_name         = sy-repid
    i_internal_tabname     = 'GT_DATA'   " internal table 名稱（大寫字串）
    i_inclname             = sy-repid
  CHANGING
    ct_fieldcat            = lt_fcat.
```

優點：快速。缺點：欄位順序由 DDIC 決定，欄位名稱也直接沿用，較難控制呈現。

### 手動建立（實務首選）

直接宣告每個欄位的設定，完全掌控：

```abap
DATA: lt_fcat TYPE slis_t_fieldcat_alv,
      ls_fcat TYPE slis_fieldcat_alv.

" 欄位 1：採購單號
CLEAR ls_fcat.
ls_fcat-fieldname   = 'EBELN'.       " 對應 internal table 的欄位名稱
ls_fcat-seltext_m   = '採購單號'.    " 欄位標題（中）
ls_fcat-outputlen   = 10.            " 欄位寬度
ls_fcat-col_pos     = 1.             " 欄位位置
APPEND ls_fcat TO lt_fcat.

" 欄位 2：供應商
CLEAR ls_fcat.
ls_fcat-fieldname   = 'LIFNR'.
ls_fcat-seltext_m   = '供應商'.
ls_fcat-outputlen   = 10.
ls_fcat-col_pos     = 2.
APPEND ls_fcat TO lt_fcat.

" 欄位 3：金額（數值欄位）
CLEAR ls_fcat.
ls_fcat-fieldname   = 'NETWR'.
ls_fcat-seltext_m   = '淨值'.
ls_fcat-outputlen   = 15.
ls_fcat-col_pos     = 3.
ls_fcat-do_sum      = 'X'.           " 顯示總計
ls_fcat-datatype    = 'CURR'.        " 貨幣格式
APPEND ls_fcat TO lt_fcat.
```

手動建立雖然比較長，但欄位順序、標題、格式完全自訂，是現場最常見的做法。

---

## LIST vs GRID

Classic ALV 有兩個主要的顯示函數：

| 函數 | 特性 | 使用時機 |
|------|------|----------|
| `REUSE_ALV_LIST_DISPLAY` | 純文字清單，類似 WRITE | 僅需簡單報表，不需互動 |
| `REUSE_ALV_GRID_DISPLAY` | 表格介面，支援滑鼠操作 | 絕大多數情況的首選 |

```abap
" LIST：簡單
CALL FUNCTION 'REUSE_ALV_LIST_DISPLAY'
  EXPORTING
    it_fieldcat = lt_fcat
  TABLES
    t_outtab    = gt_data.

" GRID：互動
CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    i_callback_program = sy-repid   " 提供 callback 必填
    it_fieldcat        = lt_fcat
  TABLES
    t_outtab           = gt_data.
```

---

## Layout 設定

`REUSE_ALV_GRID_DISPLAY` 接受一個 `is_layout` 參數，控制整體顯示行為：

```abap
DATA: ls_layout TYPE slis_layout_alv.

ls_layout-zebra          = 'X'.   " 交替行背景色
ls_layout-colwidth_optimize = 'X'. " 自動欄寬
ls_layout-cell_merge     = 'X'.   " 相同值的儲存格合併顯示
ls_layout-box_fieldname  = 'SEL'. " 指定勾選框欄位名稱（多選用）

CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    is_layout   = ls_layout
    it_fieldcat = lt_fcat
  TABLES
    t_outtab    = gt_data.
```

---

## 排序與小計

透過 `it_sort` 參數預設排序條件：

```abap
DATA: lt_sort TYPE slis_t_sortinfo_alv,
      ls_sort TYPE slis_sortinfo_alv.

" 依採購單號升冪排序，並在此欄位設群組小計
ls_sort-fieldname  = 'EBELN'.
ls_sort-up         = 'X'.     " 升冪（down = 降冪）
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

## 互動 ALV：PF Status 與 User Command

讓 ALV 回應使用者操作（例如點擊自訂按鈕、按快速鍵），需要設定兩個 callback：

```abap
CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    i_callback_program        = sy-repid
    i_callback_pf_status_set  = 'PF_STATUS_SET'   " 設定工具列
    i_callback_user_command   = 'USER_COMMAND'     " 處理使用者動作
    it_fieldcat               = lt_fcat
  TABLES
    t_outtab                  = gt_data.
```

### PF Status 設定

在 Menu Painter（SE41）建立一個 PF Status，加入自訂功能鍵，再在 callback 中套用：

```abap
FORM pf_status_set USING rt_extab TYPE slis_t_extab.
  SET PF-STATUS 'MY_STATUS'.
ENDFORM.
```

若不需要自訂按鈕，可以直接複製 SAP 標準 ALV 的 PF Status（程式 `SAPLSALV`，Status `STANDARD`）再加工，省去從頭建立的時間。

### User Command 處理

```abap
FORM user_command USING r_ucomm     TYPE sy-ucomm
                        rs_selfield TYPE slis_selfield.

  CASE r_ucomm.
    WHEN 'MY_FCODE'.               " 自訂功能碼
      " 取得使用者選取的那一行資料
      READ TABLE gt_data INDEX rs_selfield-tabindex
           INTO DATA(ls_row).
      " 執行對應邏輯...

    WHEN '&IC1'.                   " 雙擊事件的固定功能碼
      READ TABLE gt_data INDEX rs_selfield-tabindex
           INTO DATA(ls_row).
      " 執行明細跳轉...
  ENDCASE.

ENDFORM.
```

**注意**：取得選取行時，使用 `rs_selfield-tabindex`（行號），而非 `rs_selfield-value`（欄位值）。`tabindex` 更可靠，因為 value 只帶當前點擊欄的顯示值。

---

## Hotspot：點擊欄位跳轉

Hotspot 讓某個欄位的值顯示為藍色超連結，點擊後觸發 `&IC1` 雙擊事件：

```abap
" 在 Field Catalog 設定 hotspot
ls_fcat-fieldname = 'EBELN'.
ls_fcat-hotspot   = 'X'.       " 顯示為可點擊的連結
APPEND ls_fcat TO lt_fcat.
```

搭配 `USER_COMMAND` 中的 `'&IC1'` 處理，可實現「點擊採購單號跳轉到 ME23N」的效果：

```abap
WHEN '&IC1'.
  READ TABLE gt_data INDEX rs_selfield-tabindex INTO DATA(ls_row).
  SET PARAMETER ID 'BES' FIELD ls_row-ebeln.   " 傳入 Parameter ID
  CALL TRANSACTION 'ME23N' AND SKIP FIRST SCREEN.
```

---

## 完整最小程式範本

以下是一個可直接執行的最小 Classic ALV 程式，展示完整的使用模式：

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

- **`i_callback_program` 忘記填**：設定互動 callback 時必須填 `sy-repid`，否則 callback 找不到 FORM
- **FORM 名稱大小寫**：callback 參數填入的 FORM 名稱必須大寫，且 ENDFORM 必須存在，否則 runtime error
- **Field Catalog 欄位名稱與 internal table 不符**：`fieldname` 必須與 internal table 的欄位名稱完全一致（包含大小寫）
- **Hotspot 沒反應**：確認 `i_callback_user_command` 已設定，且 FORM 中有處理 `'&IC1'`

---

## 來源筆記

- [[6. ABAP List Viwer(ALV) 1-30]]
- [[ALV]]
- [[Day9 ALV Grid Reports]]
