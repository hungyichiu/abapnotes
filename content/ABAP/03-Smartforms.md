---
title: "Smartforms：採購單批次列印與 control_parameter"
tags:
  - SAP
  - ABAP
  - Smartforms
created: 2026-05-15
status: active
area: resources
publish: true
---

# Smartforms：採購單批次列印與 control_parameter

## 為什麼需要控制列印行為

單次列印一份文件時，SmartForms 的預設行為已經足夠。但實務上常需要一次列印上百份採購單——若不特別處理，每份文件都會各自產生一個獨立 Spool Job，使用者得在列印佇列裡逐一放行，管理起來非常痛苦。這篇筆記整理的重點，就是如何透過 `control_parameter` 讓整批文件合併成單一 Spool Job，並避開其中的資料準備陷阱。

---

## SmartForms 的兩層架構

SmartForms 的開發分為兩層，這個分層是理解所有後續技巧的基礎：

- **設計層（Form Designer）**：在 SE71 設計 SmartForms，定義版面、文字節點、迴圈、條件——這是「長什麼樣子」
- **驅動程式層（Driver Program）**：獨立的 ABAP 程式，負責取資料、組資料結構、呼叫 SmartForms——這是「誰來印」

SmartForms 本身不會直接執行。系統在 Activate 時，會根據 Form 定義**自動產生一個 Function Module**，驅動程式呼叫這個 FM 完成列印。這個設計讓版面設計和程式邏輯完全分離，設計師和開發者可以各自工作。

---

## 第一步：動態取得 Function Module 名稱

SmartForms 產生的 Function Module 名稱由系統決定，格式類似 `/1BCDWB/SF00000123`，**不能寫死在程式裡**——每個系統環境（DEV、QA、PRD）產生的名稱不同。

正確做法是用 `SSF_FUNCTION_MODULE_NAME` 取得名稱，再動態呼叫：

```abap
DATA: lv_fname TYPE rs38l_fnam.

CALL FUNCTION 'SSF_FUNCTION_MODULE_NAME'
  EXPORTING
    formname = 'ZPO'          " SmartForm 的名稱（SE71 中的名稱）
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

**錯誤轉拋模式**：呼叫 FM 失敗後，直接把系統變數 `sy-msgid`、`sy-msgty`、`sy-msgno`、`sy-msgv1~v4` 整包傳給 `MESSAGE`，不需要另外翻譯錯誤內容。這是 SAP 標準的錯誤處理慣例，所有 Function Module 呼叫失敗後都可以這樣寫。

---

## control_parameter：控制列印行為

SmartForms FM 有一個核心參數 `control_parameters`，型別為 `SSFCTRLOP`，控制整個列印行為：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `no_open` | `X`/空 | `X`：不開啟新 spool job；空：開啟新 spool |
| `no_close` | `X`/空 | `X`：不關閉 spool job；空：關閉 spool |
| `preview` | `X`/空 | `X`：顯示列印預覽視窗 |
| `no_dialog` | `X`/空 | `X`：靜默列印，跳過「列印設定」對話框 |

單次列印時這些欄位通常保持空值，讓系統自動開關 spool。`no_open` 和 `no_close` 的真正威力在批次列印場景。

---

## 批次列印：合併為單一 Spool Job

列印多份採購單時，最直覺的寫法是在 LOOP 裡直接呼叫 SmartForms。問題在於：預設每次呼叫都會開啟、關閉一個獨立的 spool job，結果是 100 份採購單產生 100 個 spool job，列印管理極為麻煩。

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

SmartForms 的 TABLES 參數需要傳入「只屬於當前 header」的明細資料。常見做法是在 LOOP 外一次取出所有明細（`gt_all_items`），再在 LOOP 內過濾：

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

**為什麼不用巢狀 LOOP？**

```abap
" 避免這樣寫：外層 LOOP + 內層 LOOP WHERE，資料量大時效能差
LOOP AT gt_header INTO ls_header.
  LOOP AT gt_all_items INTO ls_item WHERE ebeln = ls_header-ebeln.
    APPEND ls_item TO lt_items.
  ENDLOOP.
ENDLOOP.
```

複製 + DELETE 的模式在明細總筆數不大時（幾千筆以下）效能反而更好，而且程式碼更直觀。當明細資料量大時，改用 Secondary Key 或 HASHED TABLE 搭配 LOOP AT WHERE 才有優勢。

---

## 完整可重用框架

整合上述所有技巧的完整 FORM，可以直接作為 SmartForms 列印程式的模板：

```abap
FORM print_smartform.
  DATA: lv_fname     TYPE rs38l_fnam,
        ls_ctrl_para TYPE ssfctrlop,
        ls_opt       TYPE ssfcompop,
        ls_rtn       TYPE ssfcrescl.

  " Step 1：取得 SmartForm 的 Function Module 名稱
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

## 常見陷阱

**陷阱一：寫死 SmartForms FM 名稱**

有人在 DEV 系統直接 hardcode 產生的 FM 名稱（例如 `/1BCDWB/SF00000456`），Transport 到 QA 後發現名稱不同，程式直接失敗。永遠用 `SSF_FUNCTION_MODULE_NAME` 動態取得。

**陷阱二：忘記設定 no_close，spool 永遠不關**

批次列印的 `AT LAST` 中忘記清掉 `no_close`，spool job 維持在開啟狀態但永遠不關閉，後續的列印作業無法正常開啟新 spool。症狀是第二批列印完全沒有輸出。

**陷阱三：只有一筆資料時 AT FIRST 和 AT LAST 同時觸發**

只有一份採購單時，`AT FIRST` 和 `AT LAST` 在同一次迭代都觸發，`no_open` 和 `no_close` 都被清空——這正好是單份列印的正確行為，不需要特別處理。

**陷阱四：SmartForms 結構與 TABLES 參數型別不符**

SmartForms FM 的 TABLES 參數型別由 Form 設計時決定。若驅動程式傳入的 `lt_items` 型別與 Form 設計的不一致，會有 runtime error。確認方式：在 SE37 查看動態產生的 FM 定義，比對 TABLES 參數的型別。

---

## 來源筆記

- [[ABAP 可重用開發技巧 - PO Print 案例]]
- [[12. Smartforms]]
