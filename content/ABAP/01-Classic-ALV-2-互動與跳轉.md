---
title: "Classic ALV:互動與跳轉"
tags:
  - SAP
  - ABAP
  - ALV
created: 2026-05-15
status: active
area: resources
publish: true
---

# Classic ALV:互動與跳轉

> 本篇是「Classic ALV」系列第 2 篇,共 3 篇:[[01-Classic-ALV-1-基礎與版面設定|基礎與版面設定]] → 互動與跳轉(本篇)→ [[01-Classic-ALV-3-可編輯ALV與資料回寫|可編輯 ALV 與資料回寫]]

## 【So What】為什麼需要互動

上一篇的 ALV 只能「顯示」,使用者看完就結束了。但實務上常見的需求是:雙擊採購單號要能跳到明細、按自訂按鈕要能觸發審核動作。這些都需要讓 ALV 在使用者操作時「回頭呼叫」你寫的程式邏輯——這就是 Callback 機制要解決的問題。

---

## 【What】Callback 機制的運作原理

Callback 不是由程式主動呼叫,而是**登記給 SAP,讓 SAP 在特定事件發生時自動呼叫**:

```
你的程式                        SAP ALV
    │                               │
    ├─ 呼叫 display_alv ───────────>│
    │   登記 callback FORM 名稱      │
    │                               │ 使用者觸發動作(雙擊/按鈕)
    │<──────────────────────────────┤
    │   SAP 自動呼叫你登記的 FORM    │
```

讓 ALV 回應使用者操作,需要在呼叫時登記兩個 callback:

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

SAP 會去目前程式(`i_callback_program = sy-repid`)裡找對應名稱的 FORM 執行,FORM 名稱必須跟登記的字串完全一致(含大小寫)。

### PF Status 設定

在 Menu Painter(SE41)建立一個 PF Status,加入自訂功能鍵,再在 callback 中套用:

```abap
FORM pf_status_set USING rt_extab TYPE slis_t_extab.
  SET PF-STATUS 'MY_STATUS'.
ENDFORM.
```

若不需要自訂按鈕,可以直接複製 SAP 標準 ALV 的 PF Status(程式 `SAPLSALV`,Status `STANDARD`)再加工,省去從頭建立的時間。

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

**為什麼優先用 `rs_selfield-tabindex` 而不是 `rs_selfield-value`**:`value` 只帶使用者點到的那一個欄位的顯示值;`tabindex` 是那一列在 internal table 的 Index,用 `READ TABLE ... INDEX` 可以一次取得整列所有欄位的資料。實務上幾乎都用 `tabindex`,因為通常需要整列資料而不只是單一欄位值。

### 清單層與明細層的資料分離

雙擊跳轉明細時,建議清單只查表頭層,使用者雙擊後才用取得的 Key(如 `EBELN`)去查明細層:

```abap
" 清單:只查 EKKO,一單一列
SELECT ebeln lifnr ekgrp bedat waers
  INTO TABLE gt_po
  FROM ekko.

" 明細:使用者雙擊後,才用 EBELN 查 EKPO
SELECT ebeln ebelp matnr menge meins netpr
  INTO TABLE gt_detail
  FROM ekpo
  WHERE ebeln = p_ebeln.
```

清單如果一開始就 JOIN 明細,資料量會因為一張採購單有多個項次而暴增,清單畫面反而會出現重複的表頭列。這樣分離的好處:清單查詢速度快、明細只在需要時才撈、資料結構清晰。

明細 ALV 每次顯示前記得先 `CLEAR` 對應的 Field Catalog,避免使用者多次雙擊時欄位重複疊加。

---

## Hotspot:點擊欄位跳轉

Hotspot 讓某個欄位的值顯示為藍色超連結,點擊後觸發 `&IC1` 雙擊事件:

```abap
" 在 Field Catalog 設定 hotspot
ls_fcat-fieldname = 'EBELN'.
ls_fcat-hotspot   = 'X'.       " 顯示為可點擊的連結
APPEND ls_fcat TO lt_fcat.
```

搭配 `USER_COMMAND` 中的 `'&IC1'` 處理,可實現「點擊採購單號跳轉到 ME23N」的效果:

```abap
WHEN '&IC1'.
  READ TABLE gt_data INDEX rs_selfield-tabindex INTO DATA(ls_row).
  SET PARAMETER ID 'BES' FIELD ls_row-ebeln.   " 傳入 Parameter ID
  CALL TRANSACTION 'ME23N' AND SKIP FIRST SCREEN.
```

---

## 【What For】常見問題排查

雙擊或按鈕沒有反應時,依序檢查:

1. `i_callback_user_command = 'USER_COMMAND'` 有填且沒有被註解
2. FORM 名稱拼法與登記的名稱完全一致(包含大小寫)
3. `i_callback_program = sy-repid`,不要寫死程式名稱
4. 在 `WHEN '&IC1'` 裡加一行 `MESSAGE '雙擊觸發' TYPE 'I'` 測試 Callback 是否真的被呼叫到

---

## 常見陷阱

- **`i_callback_program` 忘記填**:設定互動 callback 時必須填 `sy-repid`,否則 callback 找不到 FORM
- **FORM 名稱大小寫**:callback 參數填入的 FORM 名稱必須大寫,且 ENDFORM 必須存在,否則 runtime error
- **Hotspot 沒反應**:確認 `i_callback_user_command` 已設定,且 FORM 中有處理 `'&IC1'`

---

## 來源筆記

- [[6. ABAP List Viwer(ALV) 1-30]]
- [[Day9 ALV Grid Reports]]
- [[abap-alv-scenario-03]]

**上一篇**:[[01-Classic-ALV-1-基礎與版面設定]] ｜ **下一篇**:[[01-Classic-ALV-3-可編輯ALV與資料回寫]]
