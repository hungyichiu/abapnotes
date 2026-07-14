---
title: "New Syntax:條件與表格建構表達式"
tags:
  - SAP
  - ABAP
  - NewSyntax
created: 2026-05-15
status: active
area: resources
publish: true
---

# New Syntax:條件與表格建構表達式

> 本篇是「New Syntax」系列第 2 篇,共 3 篇:[[02-New-Syntax-1-資料宣告與迴圈|資料宣告與迴圈]] → 條件與表格建構表達式(本篇)→ [[02-New-Syntax-3-進階表格與物件操作|進階表格與物件操作]]

## 為什麼需要表達式語法

上一篇的 `DATA(...)` 讓宣告變數不需要事先寫型別,但舊語法的 `IF/ELSEIF`、`CASE`、逐筆 `APPEND` 賦值仍然需要「先宣告一個空變數,再用好幾行邏輯填值」。本篇的 `COND`、`SWITCH`、`VALUE`、`FILTER` 這四個表達式,讓「判斷/篩選」跟「賦值」合併成一個運算式,通常可以直接寫在 `DATA(...)` 右邊,不需要臨時變數。

---

## COND:取代 IF 的條件表達式

COND 讓條件賦值從多行 IF/ELSE 變成一個表達式:

```abap
" 舊語法
DATA lv_status TYPE string.
IF lv_netwr > 100000.
  lv_status = '高金額'.
ELSEIF lv_netwr > 10000.
  lv_status = '中金額'.
ELSE.
  lv_status = '一般'.
ENDIF.

" 新語法:COND
DATA(lv_status) = COND string(
  WHEN lv_netwr > 100000 THEN '高金額'
  WHEN lv_netwr > 10000  THEN '中金額'
  ELSE                        '一般' ).
```

COND 可以直接放在 `EXPORTING`、`APPEND`、`INSERT` 等語句中,不需要事先宣告臨時變數。

---

## SWITCH:取代 CASE 的選擇表達式

```abap
" 舊語法
DATA lv_doc_type_text TYPE string.
CASE lv_bstyp.
  WHEN 'F'. lv_doc_type_text = '採購單'.
  WHEN 'K'. lv_doc_type_text = '合約'.
  WHEN 'A'. lv_doc_type_text = '詢價單'.
  WHEN OTHERS. lv_doc_type_text = '其他'.
ENDCASE.

" 新語法:SWITCH
DATA(lv_doc_type_text) = SWITCH string( lv_bstyp
  WHEN 'F' THEN '採購單'
  WHEN 'K' THEN '合約'
  WHEN 'A' THEN '詢價單'
  ELSE          '其他' ).
```

---

## VALUE #(...):表格初始化

舊語法建立一個有初始資料的 Internal Table 需要多行 APPEND。新語法直接在宣告時賦值:

```abap
" 舊語法
DATA lt_filter TYPE TABLE OF rsds_where.
DATA ls_filter TYPE rsds_where.
ls_filter-fieldname = 'BSTYP'.
ls_filter-low       = 'F'.
ls_filter-sign       = 'I'.
ls_filter-option     = 'EQ'.
APPEND ls_filter TO lt_filter.

" 新語法:VALUE #(...)
DATA(lt_filter) = VALUE rsds_trange(
  ( fieldname = 'BSTYP' low = 'F' sign = 'I' option = 'EQ' )
  ( fieldname = 'LOEKZ' low = ''  sign = 'I' option = 'EQ' ) ).
```

也可以用在賦值時:
```abap
ls_header = VALUE bapimepoheader(
  comp_code  = '1000'
  doc_type   = 'NB'
  vendor     = '0001000001' ).
```

---

## FILTER:從表格篩選子集

```abap
" 舊語法:LOOP + 條件篩選到新表格
DATA lt_active TYPE TABLE OF ekko.
LOOP AT gt_orders INTO DATA(ls_order) WHERE loekz = ''.
  APPEND ls_order TO lt_active.
ENDLOOP.

" 新語法:FILTER(需要 Sorted/Hashed Table 或有合適的 secondary key)
DATA(lt_active) = FILTER #( gt_orders WHERE loekz = '' ).
```

**注意**:`FILTER` 需要 WHERE 條件欄位有對應的 Table Key 或 Secondary Key,否則會有 syntax warning 或 runtime error。

---

## 常見陷阱

- **`FILTER` 的 Key 限制**:Standard Table 無法直接使用 `FILTER`,需要 Sorted/Hashed Table 或定義 Secondary Key

---

## 來源筆記

- [[COND Statement As a Replacement of IF Statement]]
- [[ABAP NEW SYNTAX]]

**上一篇**:[[02-New-Syntax-1-資料宣告與迴圈]] ｜ **下一篇**:[[02-New-Syntax-3-進階表格與物件操作]]
