---
title: "Classic ALV:可編輯 ALV 與資料回寫"
tags:
  - SAP
  - ABAP
  - ALV
created: 2026-05-15
status: active
area: resources
publish: true
---

# Classic ALV:可編輯 ALV 與資料回寫

> 本篇是「Classic ALV」系列第 3 篇,共 3 篇:[[01-Classic-ALV-1-基礎與版面設定|基礎與版面設定]] → [[01-Classic-ALV-2-互動與跳轉|互動與跳轉]] → 可編輯 ALV 與資料回寫(本篇)

## 【So What】為什麼需要可編輯 ALV

前兩篇的 ALV 都是唯讀的:資料庫 → ALV,單向流動。但實務上常遇到「使用者想直接在清單畫面改幾個欄位,不想為了改一個欄位另外開一張交易畫面」的需求,例如在銷售訂單清單上直接改訂單類型、改客戶代碼。這時候需要讓資料流向變成雙向:資料庫 → ALV → 資料庫,也就是可編輯 ALV。

與前兩篇的差異:

| | 唯讀 ALV(第 1、2 篇) | 可編輯 ALV(本篇) |
|---|---|---|
| ALV 模式 | 唯讀(`no_input = 'X'`) | 特定欄位可編輯 |
| 資料流向 | 單向(DB → ALV) | 雙向(DB → ALV → DB) |
| 新增 Callback | PF_STATUS_SET / USER_COMMAND | 再加上 `DATA_CHANGED` |
| 新增機制 | 無 | `mt_mod_cells`、`COMMIT/ROLLBACK` |

---

## 【What】開放欄位可編輯:FIELDCAT 的 edit 屬性

用 Field Symbol 把特定欄位的 `edit` 屬性設為 `'X'`,該欄位就會變成可點擊編輯:

```abap
FIELD-SYMBOLS: <fs_fc> TYPE slis_fieldcat_alv.

READ TABLE lt_fieldcat ASSIGNING <fs_fc> WITH KEY fieldname = 'SALESORDERTYPE'.
IF sy-subrc = 0.
  <fs_fc>-edit = 'X'.
ENDIF.
```

**注意**:Layout 裡**不能設** `gs_layout-no_input = 'X'`,否則整個 ALV 都會變唯讀,`edit = 'X'` 也會失效。

---

## DATA_CHANGED Callback:捕捉使用者的修改

要接住使用者的編輯動作,需要在顯示時多登記一個事件:

```abap
DATA: lt_events TYPE slis_t_event,
      ls_event  TYPE slis_alv_event.

ls_event-name = slis_ev_data_changed.
ls_event-form = 'DATA_CHANGED'.
APPEND ls_event TO lt_events.   " 這行不能少,少了事件不會被登記

CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    i_callback_program      = sy-repid
    i_callback_user_command = 'USER_COMMAND'
    is_layout               = ls_layout
    it_fieldcat             = lt_fieldcat
    i_save                  = 'A'
    it_events               = lt_events
  TABLES
    t_outtab                = gt_data
  EXCEPTIONS
    program_error           = 1
    OTHERS                  = 2.
```

`DATA_CHANGED` 這個 FORM 的參數簽名是 SAP 規定的固定格式,使用者每修改一個欄位就觸發一次:

```abap
FORM data_changed USING pr_data_changed TYPE REF TO cl_alv_changed_data_protocol.

  DATA: ls_modified TYPE lvc_s_modi.
  FIELD-SYMBOLS: <fs_row> TYPE ty_data.

  LOOP AT pr_data_changed->mt_mod_cells INTO ls_modified.

    " 用 row_id 取得被改的那列,直接參照修改,不需要額外 MODIFY
    READ TABLE gt_data ASSIGNING <fs_row> INDEX ls_modified-row_id.
    IF sy-subrc = 0.
      CASE ls_modified-fieldname.
        WHEN 'SALESORDERTYPE'.
          <fs_row>-salesordertype = ls_modified-value.
      ENDCASE.
    ENDIF.

    " 把修改記錄存入全域變數,供之後寫回資料庫使用
    APPEND ls_modified TO gt_mod_cells.

  ENDLOOP.

ENDFORM.
```

`pr_data_changed` 是一個物件參照(`REF TO cl_alv_changed_data_protocol`),這是傳統寫法的 ABAP 程式裡少數強制使用 OO 語法的地方。`mt_mod_cells` 是這個物件裡的一個 Table,每一列代表一個被改過的儲存格,包含 `row_id`(列的 Index)、`fieldname`(改了哪個欄位)、`value`(改後的新值)。

**用餐廳點餐理解 DATA_CHANGED 與 Save 的分工**:使用者改欄位就像在菜單上打勾(`DATA_CHANGED` 觸發,記到服務生的小本子 `gt_mod_cells`),按 Save 才像按呼叫鈴(`&DATA_SAVE` 觸發,服務生才真正去廚房下單、寫回資料庫)。不在 `DATA_CHANGED` 裡直接寫資料庫,是因為使用者可能改了又改,每次觸發都寫資料庫會浪費資源、也容易半途出錯。

---

## 【What For】寫回資料庫:精準 UPDATE

按 Save 觸發 `&DATA_SAVE` 後,才真正把累積的修改寫回去:

```abap
FORM user_command USING r_ucomm     TYPE sy-ucomm
                        rs_selfield TYPE slis_selfield.
  CASE r_ucomm.
    WHEN '&DATA_SAVE'.
      PERFORM save_data.
  ENDCASE.
ENDFORM.

FORM save_data.

  DATA: ls_modified TYPE lvc_s_modi,
        ls_db       TYPE zsalesorder.
  FIELD-SYMBOLS: <fs_row> TYPE ty_data.

  LOOP AT gt_mod_cells INTO ls_modified.

    READ TABLE gt_data ASSIGNING <fs_row> INDEX ls_modified-row_id.
    IF sy-subrc = 0.

      " 先取出資料庫的完整資料,避免覆蓋其他欄位或其他人的修改
      SELECT SINGLE * FROM zsalesorder
        INTO ls_db
        WHERE salesorder = <fs_row>-salesorder.

      " 只把被改過的欄位填進去
      CASE ls_modified-fieldname.
        WHEN 'SALESORDERTYPE'.
          ls_db-salesordertype = <fs_row>-salesordertype.
      ENDCASE.

      UPDATE zsalesorder FROM ls_db.

    ENDIF.
  ENDLOOP.

  IF sy-subrc = 0.
    COMMIT WORK.
    CLEAR gt_mod_cells.   " 存完清空,避免重複儲存
    MESSAGE '儲存成功' TYPE 'S'.
  ELSE.
    ROLLBACK WORK.
    MESSAGE '儲存失敗' TYPE 'E'.
  ENDIF.

ENDFORM.
```

**為什麼不能直接 `UPDATE zsalesorder FROM TABLE gt_data` 整批覆蓋回去**:兩個風險——一是使用者 A、B 同時編輯同一筆資料時,後存的人會把先存的人的修改蓋掉;二是 `gt_data` 裡所有欄位都會被寫回去,包含不該被修改的唯讀欄位。正確做法是先 `SELECT SINGLE` 取出資料庫現有的完整資料,只把被改過的欄位填進去,再 `UPDATE`。

`COMMIT WORK` 確認資料庫變更正式寫入;沒有這行,`UPDATE` 的結果不會真正生效。`ROLLBACK WORK` 則確保寫入失敗時資料不會只更新一半。

---

## 常見陷阱

- **`edit = 'X'` 設了但欄位還是不能編輯**:檢查 Layout 有沒有設 `no_input = 'X'`,這個設定會蓋過個別欄位的 `edit` 設定,把它拿掉即可
- **`DATA_CHANGED` 有觸發,但畫面資料沒更新**:確認 `READ TABLE ... ASSIGNING` 用的 Field Symbol 型態是自己的資料結構(如 `ty_data`),不是 `lvc_s_modi`,兩者不相容
- **忘記 `CLEAR gt_mod_cells`**:使用者可能同一次執行按多次 Save,不清空的話第二次按 Save 會拿舊的修改記錄重複 UPDATE

---

## 實作提醒

- 可編輯 ALV 適合「少量欄位、低風險」的快速修改場景;牽涉複雜驗證邏輯或跨表連動的異動,仍建議走標準交易畫面或自訂 Dialog Program,避免在 ALV 裡塞入過多業務規則
- 上線前務必用 Debugger 逐步確認 `DATA_CHANGED` 有被觸發、`gt_mod_cells` 有正確累積、Save 後資料庫確實更新(可用 SE16 覆核)

---

## 來源筆記

- [[abap-alv-scenario-04]]
- [[6. ABAP List Viwer(ALV) 1-30]]

**上一篇**:[[01-Classic-ALV-2-互動與跳轉]]
