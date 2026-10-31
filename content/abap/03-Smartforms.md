---
title: "Smart Forms：採購單批次列印與 control_parameters"
description: "整理 Smart Forms 採購單批次列印：SSF_FUNCTION_MODULE_NAME 動態取 FM 名稱、control_parameters 的 no_open 與 no_close 搭配 AT FIRST、AT LAST 合併成單一 Spool Job，附 SP01 排查，做批次列印前照這份設計。"
keywords:
  - Smart Forms 批次列印
  - control_parameters
  - SSF_FUNCTION_MODULE_NAME
  - Spool Job
  - SMARTFORMS
tags:
  - SAP
  - ABAP
  - Smartforms
created: 2026-05-15
status: active
area: public
publish: true
source:
  - "[[ABAP-可重用開發技巧 - PO Print 案例]]"
  - "[[ABAP-課程-12. Smartforms]]"
---

## 【So What】為什麼需要控制列印行為

單次列印一份文件時，Smart Forms 的預設行為已經足夠。但實務上常需要一次列印上百份採購單。不特別處理的話，每份文件都會各自產生一個獨立 Spool Job，使用者得在列印佇列裡逐一放行。

這篇整理 Smart Forms 批次列印的做法：怎麼透過 `control_parameters` 讓整批文件合併成單一 Spool Job，並避開其中的資料準備陷阱。

---

## 【What】Smart Forms 的兩層架構

Smart Forms 的開發分為兩層，這個分層是理解所有後續技巧的基礎。

- **設計層（Form Builder）**：在交易碼 `SMARTFORMS` 設計表單，定義版面、文字節點、迴圈、條件。
	- 這一層決定「長什麼樣子」。
	- 驅動程式要傳進來的 `is_header`、`it_items` 這些參數，也是在這裡的 Form Interface 頁籤先定義好 Import／Export／Tables。
- **驅動程式層（Driver Program）**：獨立的 ABAP 程式，負責取資料、組資料結構、呼叫 Smart Forms。
	- 這一層決定「誰來印」。

交易碼別搞混：`SE71` 是舊一代 SAPscript 的 Form Painter，Smart Forms 用 `SMARTFORMS`。

Smart Forms 本身不會直接執行。系統在 Activate 時，會根據 Form 定義**自動產生一個 Function Module**，驅動程式呼叫這個 FM 完成列印。

這個設計讓版面和程式邏輯分開：只調版面不用動驅動程式，但 Form Interface 的參數改了，兩邊要一起改。

---

## 動態取得 Function Module 名稱

Smart Forms 產生的 Function Module 名稱由系統決定，格式類似 `/1BCDWB/SF00000123`，**不能寫死在程式裡**。每個系統環境（DEV、QA、PRD）是在啟用時各自產生名稱，可能不同，沒辦法保證一樣。

正確做法是用 `SSF_FUNCTION_MODULE_NAME` 取得名稱，再動態呼叫：

```abap
DATA: lv_fname TYPE rs38l_fnam.

CALL FUNCTION 'SSF_FUNCTION_MODULE_NAME'
  EXPORTING
    formname = 'ZPO'          " Smart Form 的名稱（SMARTFORMS 裡的名稱）
  IMPORTING
    fm_name  = lv_fname       " 系統回傳的動態 FM 名稱
  EXCEPTIONS
    no_form            = 1
    no_function_module = 2
    OTHERS             = 3.

IF sy-subrc <> 0.
  MESSAGE ID sy-msgid TYPE sy-msgty NUMBER sy-msgno
    WITH sy-msgv1 sy-msgv2 sy-msgv3 sy-msgv4.
  RETURN.
ENDIF.

" 之後用 lv_fname 動態呼叫
CALL FUNCTION lv_fname
  EXPORTING ...
```

**錯誤轉拋模式**：呼叫 FM 失敗後，直接把系統變數 `sy-msgid`、`sy-msgty`、`sy-msgno`、`sy-msgv1~v4` 整包傳給 `MESSAGE`，不需要另外翻譯錯誤內容。

這招只在 FM 用 `MESSAGE ... RAISING` 丟例外時有效，這時系統訊息欄位才有值。FM 若只用單純的 `RAISE`，`sy-msgid` 可能是空的或是上一則訊息，顯示出來的內容會是錯的。不確定的話，先判斷 `sy-msgid` 有沒有值，沒有就自己寫錯誤訊息。

---

## control_parameters：控制列印行為

Smart Forms FM 有一個核心參數 `control_parameters`，型別為 `SSFCTRLOP`，控制整個列印行為：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `no_open` | `X`/空 | `X`：不開啟新 spool job；空：開啟新 spool |
| `no_close` | `X`/空 | `X`：不關閉 spool job；空：關閉 spool |
| `preview` | `X`/空 | `X`：顯示列印預覽視窗 |
| `no_dialog` | `X`/空 | `X`：靜默列印，跳過「列印設定」對話框 |

單次列印時這些欄位通常保持空值，讓系統自動開關 spool。批次列印才會用到 `no_open`、`no_close`。

另一個參數 `output_options`（型別 `SSFCOMPOP`）管的是輸出設備：`tddest` 印表機、`tdcopies` 份數、`tdimmed` 立即列印。本篇範例有傳但不展開。

---

## 【What For】批次列印：合併為單一 Spool Job

列印多份採購單時，最直覺的寫法是在 LOOP 裡直接呼叫 Smart Forms。問題是預設每次呼叫都會開啟、關閉一個獨立的 spool job，100 份採購單就產生 100 個 spool job。

解法是用 `no_open` / `no_close` 搭配 `AT FIRST` / `AT LAST`，讓所有文件共享同一個 spool job：

```abap
SORT gt_header BY ebeln.

LOOP AT gt_header ASSIGNING FIELD-SYMBOL(<ls_header>).

  " 預設：不開、不關（中間的文件接續同一個 spool）
  ls_ctrl_para-no_open  = 'X'.
  ls_ctrl_para-no_close = 'X'.

  AT FIRST.
    CLEAR ls_ctrl_para-no_open.   " 第一份：開啟 spool
  ENDAT.

  AT LAST.
    CLEAR ls_ctrl_para-no_close.  " 最後一份：關閉 spool
  ENDAT.

  CALL FUNCTION lv_fname
    EXPORTING
      control_parameters = ls_ctrl_para
      ...
ENDLOOP.
```

三種狀態的組合：

| 文件 | no_open | no_close | 效果 |
|------|---------|----------|------|
| 第一份 | ` `（空）| `X` | 開啟新 spool，繼續 |
| 中間份 | `X` | `X` | 接續同一 spool |
| 最後份 | `X` | ` `（空）| 接續並關閉 spool |

結果：所有採購單合併在同一個 spool job，使用者一次送出整批列印。

---

## 準備每份文件的明細資料

Smart Forms 的 TABLES 參數需要傳入「只屬於當前 header」的明細資料。常見做法是在 LOOP 外一次取出所有明細（`gt_all_items`），再在 LOOP 內過濾：

```abap
LOOP AT gt_header ASSIGNING FIELD-SYMBOL(<ls_header>).

  DATA(lt_items) = gt_all_items.                          " 複製全部明細
  DELETE lt_items WHERE ebeln <> <ls_header>-ebeln.       " 刪掉不屬於此採購單的

  CALL FUNCTION lv_fname
    EXPORTING
      is_header = <ls_header>
    TABLES
      it_items  = lt_items
    ...

ENDLOOP.
```

**另一種寫法：巢狀 LOOP**

```abap
LOOP AT gt_header INTO ls_header.
  CLEAR lt_items.
  LOOP AT gt_all_items INTO ls_item WHERE ebeln = ls_header-ebeln.
    APPEND ls_item TO lt_items.
  ENDLOOP.
  " 接著呼叫 lv_fname，同上
ENDLOOP.
```

兩種寫法在標準內表上都是每個 header 掃一次全部明細，幾千筆以下差異感受不到，挑讀起來順的就好。

明細量大時，把 `gt_all_items` 宣告成 `SORTED TABLE … WITH NON-UNIQUE KEY ebeln`，或加 secondary key，再用 `LOOP AT … WHERE ebeln = …`，系統會用二分搜尋，才有實質差別。

---

## 完整可重用框架

整合上述所有技巧的完整 FORM，可以直接作為 Smart Forms 列印程式的模板：

```abap
FORM print_smartform.
  DATA: lv_fname     TYPE rs38l_fnam,
        ls_ctrl_para TYPE ssfctrlop,
        ls_opt       TYPE ssfcompop,
        ls_rtn       TYPE ssfcrescl.

  " Step 1：取得 Smart Form 的 Function Module 名稱
  CALL FUNCTION 'SSF_FUNCTION_MODULE_NAME'
    EXPORTING  formname = 'ZPO'
    IMPORTING  fm_name  = lv_fname
    EXCEPTIONS OTHERS   = 3.

  IF sy-subrc <> 0.
    MESSAGE ID sy-msgid TYPE sy-msgty NUMBER sy-msgno
      WITH sy-msgv1 sy-msgv2 sy-msgv3 sy-msgv4.
    RETURN.
  ENDIF.

  " Step 2：設定列印選項（靜默列印、不顯示對話框）
  ls_ctrl_para-no_dialog = 'X'.
  ls_ctrl_para-preview   = ' '.  " 批次列印不需要預覽
  ls_opt-tddest          = 'LP01'. " 印表機，換成實際的輸出設備

  " Step 3：批次列印，所有文件合併為單一 spool job
  SORT gt_header BY ebeln.

  LOOP AT gt_header ASSIGNING FIELD-SYMBOL(<ls_hdr>).

    ls_ctrl_para-no_open  = 'X'.
    ls_ctrl_para-no_close = 'X'.

    AT FIRST. CLEAR ls_ctrl_para-no_open.  ENDAT.
    AT LAST.  CLEAR ls_ctrl_para-no_close. ENDAT.

    " 準備此採購單的明細
    DATA(lt_items) = gt_all_items.
    DELETE lt_items WHERE ebeln <> <ls_hdr>-ebeln.

    CALL FUNCTION lv_fname
      EXPORTING
        control_parameters = ls_ctrl_para
        output_options     = ls_opt
        is_header          = <ls_hdr>
      IMPORTING
        job_output_info    = ls_rtn
      TABLES
        it_items           = lt_items
      EXCEPTIONS
        OTHERS             = 5.

    IF sy-subrc <> 0.
      MESSAGE ID sy-msgid TYPE sy-msgty NUMBER sy-msgno
        WITH sy-msgv1 sy-msgv2 sy-msgv3 sy-msgv4.
    ENDIF.

  ENDLOOP.
ENDFORM.
```

---

`no_dialog = 'X'` 會跳過列印對話框，使用者沒機會選印表機，所以 `ls_opt-tddest` 一定要填。沒填又碰上使用者主檔沒設預設印表機，會出錯或印不出來。

---

## 常見陷阱

**陷阱一：寫死 Smart Forms FM 名稱**

有人在 DEV 系統直接 hardcode 產生的 FM 名稱（例如 `/1BCDWB/SF00000456`），Transport 到 QA 後發現名稱不同，程式直接失敗。永遠用 `SSF_FUNCTION_MODULE_NAME` 動態取得。

**陷阱二：忘記設定 no_close，spool 永遠不關**

批次列印的 `AT LAST` 中忘記清掉 `no_close`，spool job 不會被正常關閉，這一批文件可能沒有送出或停在等待狀態。

症狀出現時先到 `SP01` 看這批 spool 的狀態，再回頭確認 `AT LAST` 有沒有清掉 `no_close`。

**陷阱三：只有一筆資料時 AT FIRST 和 AT LAST 同時觸發**

只有一份採購單時，`AT FIRST` 和 `AT LAST` 在同一次迭代都觸發，`no_open` 和 `no_close` 都被清空。這正好是單份列印的正確行為，不需要特別處理。

**陷阱四：Smart Forms 結構與 TABLES 參數型別不符**

Smart Forms FM 的 TABLES 參數型別由 Form 設計時決定。若驅動程式傳入的 `lt_items` 型別與 Form 設計的不一致，執行時會 dump，ST22 看到的通常是 `CALL_FUNCTION_CONFLICT_TYPE`。確認方式：在 SE37 查看動態產生的 FM 定義，比對 TABLES 參數的型別。

---

## 常見問題

**Smart Forms 批次列印怎麼合併成一個 Spool Job？**
在 LOOP 裡呼叫 Smart Forms 的 FM 時，把 `control_parameters` 的 `no_open`、`no_close` 預設設成 `X`，再用 `AT FIRST` 清掉 `no_open`、`AT LAST` 清掉 `no_close`。第一份開 spool、最後一份關 spool，中間全部接在同一個 spool job 裡。

**Smart Forms 的 Function Module 名稱為什麼不能寫死？**
名稱是各系統在啟用 Smart Form 時自動產生的，DEV、QA、PRD 不保證一樣。用 `SSF_FUNCTION_MODULE_NAME` 傳入表單名稱，取得當下系統的 FM 名稱再動態呼叫。
