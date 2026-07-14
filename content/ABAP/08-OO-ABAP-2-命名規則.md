---
title: "OO ABAP 命名規則"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# OO ABAP 命名規則

> OO ABAP 系列第 2 篇，共 8 篇：[[08-OO-ABAP-1-核心邏輯鏈|上一篇：核心邏輯鏈]] → 本篇：命名規則 → [[08-OO-ABAP-3-SOLID原則|下一篇：SOLID 原則]]


---

## What：命名規則是什麼？

SAP OO ABAP 的命名規則分兩個層次：

**前綴**：告訴你這是什麼類型的東西
**後半段**：告訴你它屬於哪個領域、扮演什麼角色

```
ZCL_  PRICING  _VIP
ZIF_  PRICING  _STRATEGY
      ───┬───   ──┬──
         │        │
       領域      角色
```

---

## So What：不遵守命名規則會怎樣？

沒有命名規則，你看到一個名字什麼都不知道：

```
ZCL_HANDLER    →  處理什麼？
ZIF_INTERFACE1 →  什麼能力？
ZCL_UTIL       →  什麼都往裡塞，職責不清
```

遵守命名規則，名字本身就是文件：

```
ZCL_ORDER_REPOSITORY   →  一眼知道：訂單的資料存取層
ZIF_PRINTABLE          →  一眼知道：能被列印的能力
ZCX_INVALID_AMOUNT     →  一眼知道：金額無效的錯誤
```

> **目標：不看程式碼，光看名字就能猜到它做什麼。**

---

## Now What：完整規則對照表

### 前綴：類型識別

| 前綴 | 類型 | 範例 |
|---|---|---|
| `ZCL_` | Class | `ZCL_ORDER`、`ZCL_DOCUMENT_FACTORY` |
| `ZIF_` | Interface | `ZIF_PRINTABLE`、`ZIF_PRICING_STRATEGY` |
| `ZCX_` | Exception Class | `ZCX_ORDER_ERROR`、`ZCX_INVALID_AMOUNT` |

> Abstract Class 沒有獨立前綴，仍用 `ZCL_`，但名字反映抽象性質，例如 `ZCL_BASE_DOCUMENT`。

---

### 屬性前綴：資料的位置與類型

| 前綴 | 說明 | 範例 |
|---|---|---|
| `mv_` | member variable（實例，純量） | `mv_total`、`mv_order_id` |
| `ms_` | member structure（實例，結構） | `ms_header` |
| `mt_` | member table（實例，內表） | `mt_items` |
| `mo_` | member object（實例，物件參考） | `mo_strategy`、`mo_instance` |

---

### 方法參數前綴：資料的方向與類型

| 前綴 | 方向 | 類型 | 範例 |
|---|---|---|---|
| `iv_` | Importing | 純量 | `iv_order_id` |
| `is_` | Importing | 結構 | `is_header` |
| `it_` | Importing | 內表 | `it_items` |
| `io_` | Importing | 物件 | `io_strategy` |
| `ev_` | Exporting | 純量 | `ev_result` |
| `et_` | Exporting | 內表 | `et_output` |
| `eo_` | Exporting | 物件 | `eo_instance` |
| `rv_` | Returning | 純量 | `rv_total` |
| `rt_` | Returning | 內表 | `rt_items` |
| `ro_` | Returning | 物件 | `ro_instance` |
| `cv_` | Changing | 純量 | `cv_amount` |
| `ct_` | Changing | 內表 | `ct_items` |

---

### 本地變數前綴：方法內部使用

| 前綴 | 類型 | 範例 |
|---|---|---|
| `lv_` | 純量 | `lv_count` |
| `ls_` | 結構 | `ls_item` |
| `lt_` | 內表 | `lt_orders` |
| `lo_` | 物件參考 | `lo_order`、`lo_factory` |

---

### 後半段：領域 + 角色

**常見領域：**
```
ORDER / DOCUMENT / PRICING / TAX / CUSTOMER / SALES
```

**Class 的角色：**
```
ZCL_PRICING_VIP        →  VIP 定價的具體實作
ZCL_PRICING_FACTORY    →  建立定價策略的工廠
ZCL_ORDER_REPOSITORY   →  訂單資料存取層
ZCL_ORDER_PROCESSOR    →  訂單處理邏輯
ZCL_BASE_DOCUMENT      →  基底類別（BASE 暗示抽象）
```

**Interface 的兩種風格：**
```
形容詞（單一能力）：ZIF_PRINTABLE / ZIF_EXPORTABLE / ZIF_ARCHIVABLE
名詞（完整角色）：ZIF_PRICING_STRATEGY / ZIF_MAILER
```

**Exception 的角色：**
```
ZCX_ORDER_ERROR       →  通用錯誤
ZCX_ORDER_NOT_FOUND   →  具體原因
ZCX_INVALID_AMOUNT    →  金額無效
```

---

### 一個領域的完整命名示範

```
定價（PRICING）領域：

ZIF_PRICING_STRATEGY    →  Interface：能力合約
ZCL_PRICING_NORMAL      →  一般定價
ZCL_PRICING_VIP         →  VIP 定價
ZCL_PRICING_SEASONAL    →  季節折扣
ZCL_PRICING_FACTORY     →  建立定價策略的工廠
ZCX_PRICING_ERROR       →  定價相關錯誤
```

---

### 完整程式碼範例

```abap
INTERFACE zif_pricing_strategy.            " ZIF_
  METHODS: calculate
    IMPORTING iv_amount      TYPE decfloat34   " iv_
    RETURNING VALUE(rv_price) TYPE decfloat34. " rv_
ENDINTERFACE.

CLASS zcl_pricing_vip DEFINITION.          " ZCL_
  PUBLIC SECTION.
    INTERFACES: zif_pricing_strategy.
    METHODS: constructor
      IMPORTING io_config TYPE REF TO zcl_config.  " io_
  PRIVATE SECTION.
    DATA: mv_discount TYPE decfloat34,     " mv_
          mo_config   TYPE REF TO zcl_config.      " mo_
ENDCLASS.

CLASS zcx_invalid_price DEFINITION         " ZCX_
  INHERITING FROM cx_static_check.
  PUBLIC SECTION.
    DATA: mv_message TYPE string.          " mv_
ENDCLASS.
```

---

## 相關筆記

- [[08-OO-ABAP-1-核心邏輯鏈]]
