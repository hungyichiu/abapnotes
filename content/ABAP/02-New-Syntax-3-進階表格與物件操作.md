---
title: "New Syntax:進階表格與物件操作"
tags:
  - SAP
  - ABAP
  - NewSyntax
created: 2026-05-15
status: active
area: resources
publish: true
---

# New Syntax:進階表格與物件操作

> 本篇是「New Syntax」系列第 3 篇,共 3 篇:[[02-New-Syntax-1-資料宣告與迴圈|資料宣告與迴圈]] → [[02-New-Syntax-2-條件與表格建構表達式|條件與表格建構表達式]] → 進階表格與物件操作(本篇)

## 為什麼這兩個語法值得單獨拉出來講

前兩篇的語法多半是「寫得更短」,這篇的兩個語法則直接**消除一個典型陷阱**(`FOR ALL ENTRIES IN` 空表問題),以及讓物件操作跟表格操作一樣可以省略中間變數。熟悉這兩個語法,是判斷一支 ABAP 程式是否用「現代寫法」維護的重要指標。

---

## Internal Table 直接參與 SQL JOIN

這是 ABAP 7.40+ 的進階語法,讓 Internal Table 直接作為 JOIN 對象,取代 `FOR ALL ENTRIES IN`:

```abap
" 舊語法:FOR ALL ENTRIES IN(空表陷阱!)
IF gt_header IS NOT INITIAL.
  SELECT * FROM ekpo
    FOR ALL ENTRIES IN gt_header
    WHERE ebeln = gt_header-ebeln
    INTO TABLE @gt_items.
ENDIF.

" 新語法:INNER JOIN @internal_table
" 注意:gt_header 需宣告為 HASHED TABLE 以避免效能警告
DATA gt_header TYPE HASHED TABLE OF ekko WITH UNIQUE KEY ebeln.

SELECT FROM ekpo INNER JOIN @gt_header AS h
  ON ekpo~ebeln = h~ebeln
  FIELDS ekpo~ebeln, ekpo~ebelp, ekpo~matnr, ekpo~netwr
  WHERE ekpo~loekz = ''
  INTO TABLE @gt_items.
```

`FOR ALL ENTRIES IN` 的著名陷阱:driver table 為空時,SQL 不加任何條件,等同撈出全部資料。新語法的 `INNER JOIN @table` 完全消除此風險。

---

## NEW 與 CAST:物件操作

```abap
" 舊語法:建立物件
DATA lo_handler TYPE REF TO zcl_po_handler.
CREATE OBJECT lo_handler.

" 新語法:NEW
DATA(lo_handler) = NEW zcl_po_handler( ).

" CAST:介面轉型
DATA(lo_base) = CAST if_base_handler( lo_handler ).
```

---

## 來源筆記

- [[ABAP NEW SYNTAX]]
- [[ABAP 可重用開發技巧 - PO Print 案例]]

**上一篇**:[[02-New-Syntax-2-條件與表格建構表達式]]
