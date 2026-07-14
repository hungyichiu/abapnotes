---
title: "New Syntax:資料宣告與迴圈"
tags:
  - SAP
  - ABAP
  - NewSyntax
created: 2026-05-15
status: active
area: resources
publish: true
---

# New Syntax:資料宣告與迴圈

> 本篇是「New Syntax」系列第 1 篇,共 3 篇:資料宣告與迴圈(本篇)→ [[02-New-Syntax-2-條件與表格建構表達式|條件與表格建構表達式]] → [[02-New-Syntax-3-進階表格與物件操作|進階表格與物件操作]]

## 為什麼要升級語法

ABAP 7.40(2013 年)開始引入大量現代語法,並在 7.50、S/4HANA 持續演進。新語法的目標不是改變程式邏輯,而是:

- **減少樣板程式碼**(boilerplate):不再需要為每個變數宣告單獨寫一行 `DATA:`
- **提升型別安全**:Inline 宣告讓編譯器自動推斷型別,減少型別不符的 bug
- **可讀性更高**:表格操作和條件邏輯更接近數學符號,一眼看出意圖

接觸 S/4HANA 或現代 ABAP 開發,這些語法是基本要求。本篇先處理最基礎、使用頻率最高的兩類:**變數宣告**與**迴圈**。

---

## Inline Data 宣告

### 變數:`DATA(...)`

**舊語法**:
```abap
DATA ls_vendor TYPE lfa1.
SELECT SINGLE * FROM lfa1 INTO ls_vendor WHERE lifnr = '001'.
```

**新語法**:
```abap
SELECT SINGLE * FROM lfa1 INTO @DATA(ls_vendor) WHERE lifnr = '001'.
```

型別由 `lfa1` 的結構自動推斷,不需要事先宣告。

### Field Symbol:`FIELD-SYMBOL(<...>)`

```abap
" 舊語法
FIELD-SYMBOLS: <ls_item> TYPE ekpo.
LOOP AT gt_items ASSIGNING <ls_item>.

" 新語法:inline 宣告在 LOOP 中
LOOP AT gt_items ASSIGNING FIELD-SYMBOL(<ls_item>).
  <ls_item>-netwr = <ls_item>-netwr * 1.05.  " 直接修改原始資料,不複製
ENDLOOP.
```

`FIELD-SYMBOL` 直接操作內部表格的記憶體位址,比 `INTO ls_item`(複製一份)效能更好,修改後也不需要 `MODIFY` 回寫。

---

## LOOP AT 與 COLLECT INTO

### `LOOP AT ... INTO DATA(...)`

```abap
" 舊語法
DATA ls_ekko TYPE ekko.
LOOP AT gt_orders INTO ls_ekko.
  WRITE: / ls_ekko-ebeln, ls_ekko-lifnr.
ENDLOOP.

" 新語法:inline,且明確表示這是唯讀(ASSIGNING 才能修改)
LOOP AT gt_orders INTO DATA(ls_order).
  WRITE: / ls_order-ebeln, ls_order-lifnr.
ENDLOOP.
```

---

## String Template

舊語法拼接字串需要 `CONCATENATE`,新語法用 `|...|` 模板:

```abap
DATA lv_lifnr TYPE lifnr VALUE '0001000001'.
DATA lv_name  TYPE name1 VALUE 'ACME Corp'.

" 舊語法
DATA lv_msg TYPE string.
CONCATENATE '供應商' lv_lifnr ':' lv_name INTO lv_msg SEPARATED BY space.

" 新語法:直接嵌入變數
DATA(lv_msg) = |供應商 { lv_lifnr }:{ lv_name }|.

" 格式化選項
DATA(lv_date_str) = |今日日期:{ sy-datum DATE = USER }|.
DATA(lv_amount)   = |金額:{ lv_netwr CURRENCY = lv_waers }|.
```

---

## 常見陷阱

- **`DATA(...)` 只能宣告一次**:同一個 scope 中,同名變數不能用 `DATA(...)` 宣告兩次。在 LOOP 中重複使用同一個 inline 宣告會 syntax error,需在 LOOP 外宣告
- **`FIELD-SYMBOL` inline 宣告的 scope**:Inline 宣告的 `FIELD-SYMBOL` 在整個 FORM/Method 內有效,不限於 LOOP block,注意命名衝突

---

## 來源筆記

- [[Inline Data Declarations]]
- [[ABAP NEW SYNTAX]]

**下一篇**:[[02-New-Syntax-2-條件與表格建構表達式]]
