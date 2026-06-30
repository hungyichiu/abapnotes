---
tags:
  - SAP
  - ABAP
  - NewSyntax
created: 2026-05-15
status: draft
area: resources
publish: false
---

# ABAP New Syntax：寫出更現代的 ABAP

## 為什麼要升級語法

ABAP 7.40（2013 年）開始引入大量現代語法，並在 7.50、S/4HANA 持續演進。新語法的目標不是改變程式邏輯，而是：

- **減少樣板程式碼**（boilerplate）：不再需要為每個變數宣告單獨寫一行 `DATA:`
- **提升型別安全**：Inline 宣告讓編譯器自動推斷型別，減少型別不符的 bug
- **可讀性更高**：表格操作和條件邏輯更接近數學符號，一眼看出意圖

接觸 S/4HANA 或現代 ABAP 開發，這些語法是基本要求。

---

## Inline Data 宣告

### 變數：`DATA(...)`

**舊語法**：
```abap
DATA ls_vendor TYPE lfa1.
SELECT SINGLE * FROM lfa1 INTO ls_vendor WHERE lifnr = '001'.
```

**新語法**：
```abap
SELECT SINGLE * FROM lfa1 INTO @DATA(ls_vendor) WHERE lifnr = '001'.
```

型別由 `lfa1` 的結構自動推斷，不需要事先宣告。

### Field Symbol：`FIELD-SYMBOL(<...>)`

```abap
" 舊語法
FIELD-SYMBOLS: <ls_item> TYPE ekpo.
LOOP AT gt_items ASSIGNING <ls_item>.

" 新語法：inline 宣告在 LOOP 中
LOOP AT gt_items ASSIGNING FIELD-SYMBOL(<ls_item>).
  <ls_item>-netwr = <ls_item>-netwr * 1.05.  " 直接修改原始資料，不複製
ENDLOOP.
```

`FIELD-SYMBOL` 直接操作內部表格的記憶體位址，比 `INTO ls_item`（複製一份）效能更好，修改後也不需要 `MODIFY` 回寫。

---

## LOOP AT 與 COLLECT INTO

### `LOOP AT ... INTO DATA(...)`

```abap
" 舊語法
DATA ls_ekko TYPE ekko.
LOOP AT gt_orders INTO ls_ekko.
  WRITE: / ls_ekko-ebeln, ls_ekko-lifnr.
ENDLOOP.

" 新語法：inline，且明確表示這是唯讀（ASSIGNING 才能修改）
LOOP AT gt_orders INTO DATA(ls_order).
  WRITE: / ls_order-ebeln, ls_order-lifnr.
ENDLOOP.
```

---

## String Template

舊語法拼接字串需要 `CONCATENATE`，新語法用 `|...|` 模板：

```abap
DATA lv_lifnr TYPE lifnr VALUE '0001000001'.
DATA lv_name  TYPE name1 VALUE 'ACME Corp'.

" 舊語法
DATA lv_msg TYPE string.
CONCATENATE '供應商' lv_lifnr ':' lv_name INTO lv_msg SEPARATED BY space.

" 新語法：直接嵌入變數
DATA(lv_msg) = |供應商 { lv_lifnr }：{ lv_name }|.

" 格式化選項
DATA(lv_date_str) = |今日日期：{ sy-datum DATE = USER }|.
DATA(lv_amount)   = |金額：{ lv_netwr CURRENCY = lv_waers }|.
```

---

## COND：取代 IF 的條件表達式

COND 讓條件賦值從多行 IF/ELSE 變成一個表達式：

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

" 新語法：COND
DATA(lv_status) = COND string(
  WHEN lv_netwr > 100000 THEN '高金額'
  WHEN lv_netwr > 10000  THEN '中金額'
  ELSE                        '一般' ).
```

COND 可以直接放在 `EXPORTING`、`APPEND`、`INSERT` 等語句中，不需要事先宣告臨時變數。

---

## SWITCH：取代 CASE 的選擇表達式

```abap
" 舊語法
DATA lv_doc_type_text TYPE string.
CASE lv_bstyp.
  WHEN 'F'. lv_doc_type_text = '採購單'.
  WHEN 'K'. lv_doc_type_text = '合約'.
  WHEN 'A'. lv_doc_type_text = '詢價單'.
  WHEN OTHERS. lv_doc_type_text = '其他'.
ENDCASE.

" 新語法：SWITCH
DATA(lv_doc_type_text) = SWITCH string( lv_bstyp
  WHEN 'F' THEN '採購單'
  WHEN 'K' THEN '合約'
  WHEN 'A' THEN '詢價單'
  ELSE          '其他' ).
```

---

## VALUE #(...)：表格初始化

舊語法建立一個有初始資料的 Internal Table 需要多行 APPEND。新語法直接在宣告時賦值：

```abap
" 舊語法
DATA lt_filter TYPE TABLE OF rsds_where.
DATA ls_filter TYPE rsds_where.
ls_filter-fieldname = 'BSTYP'.
ls_filter-low       = 'F'.
ls_filter-sign       = 'I'.
ls_filter-option     = 'EQ'.
APPEND ls_filter TO lt_filter.

" 新語法：VALUE #(...)
DATA(lt_filter) = VALUE rsds_trange(
  ( fieldname = 'BSTYP' low = 'F' sign = 'I' option = 'EQ' )
  ( fieldname = 'LOEKZ' low = ''  sign = 'I' option = 'EQ' ) ).
```

也可以用在賦值時：
```abap
ls_header = VALUE bapimepoheader(
  comp_code  = '1000'
  doc_type   = 'NB'
  vendor     = '0001000001' ).
```

---

## FILTER：從表格篩選子集

```abap
" 舊語法：LOOP + 條件篩選到新表格
DATA lt_active TYPE TABLE OF ekko.
LOOP AT gt_orders INTO DATA(ls_order) WHERE loekz = ''.
  APPEND ls_order TO lt_active.
ENDLOOP.

" 新語法：FILTER（需要 Sorted/Hashed Table 或有合適的 secondary key）
DATA(lt_active) = FILTER #( gt_orders WHERE loekz = '' ).
```

**注意**：`FILTER` 需要 WHERE 條件欄位有對應的 Table Key 或 Secondary Key，否則會有 syntax warning 或 runtime error。

---

## Internal Table 直接參與 SQL JOIN

這是 ABAP 7.40+ 的進階語法，讓 Internal Table 直接作為 JOIN 對象，取代 `FOR ALL ENTRIES IN`：

```abap
" 舊語法：FOR ALL ENTRIES IN（空表陷阱！）
IF gt_header IS NOT INITIAL.
  SELECT * FROM ekpo
    FOR ALL ENTRIES IN gt_header
    WHERE ebeln = gt_header-ebeln
    INTO TABLE @gt_items.
ENDIF.

" 新語法：INNER JOIN @internal_table
" 注意：gt_header 需宣告為 HASHED TABLE 以避免效能警告
DATA gt_header TYPE HASHED TABLE OF ekko WITH UNIQUE KEY ebeln.

SELECT FROM ekpo INNER JOIN @gt_header AS h
  ON ekpo~ebeln = h~ebeln
  FIELDS ekpo~ebeln, ekpo~ebelp, ekpo~matnr, ekpo~netwr
  WHERE ekpo~loekz = ''
  INTO TABLE @gt_items.
```

`FOR ALL ENTRIES IN` 的著名陷阱：driver table 為空時，SQL 不加任何條件，等同撈出全部資料。新語法的 `INNER JOIN @table` 完全消除此風險。

---

## NEW 與 CAST：物件操作

```abap
" 舊語法：建立物件
DATA lo_handler TYPE REF TO zcl_po_handler.
CREATE OBJECT lo_handler.

" 新語法：NEW
DATA(lo_handler) = NEW zcl_po_handler( ).

" CAST：介面轉型
DATA(lo_base) = CAST if_base_handler( lo_handler ).
```

---

## 常見陷阱

- **`DATA(...)` 只能宣告一次**：同一個 scope 中，同名變數不能用 `DATA(...)` 宣告兩次。在 LOOP 中重複使用同一個 inline 宣告會 syntax error，需在 LOOP 外宣告
- **`FILTER` 的 Key 限制**：Standard Table 無法直接使用 `FILTER`，需要 Sorted/Hashed Table 或定義 Secondary Key
- **`FIELD-SYMBOL` inline 宣告的 scope**：Inline 宣告的 `FIELD-SYMBOL` 在整個 FORM/Method 內有效，不限於 LOOP block，注意命名衝突

---

## 來源筆記

- [[Inline Data Declarations]]
- [[COND Statement As a Replacement of IF Statement]]
- [[ABAP NEW SYNTAX]]
- [[ABAP 可重用開發技巧 - PO Print 案例]]
