---
title: "SAP BAPI：用 Facade Pattern 重新理解"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# SAP BAPI：用 Facade Pattern 重新理解

> OO ABAP 系列第 8 篇，共 8 篇：[[08-OO-ABAP-7-BAdI案例|上一篇：BAdI 案例]] → 本篇：BAPI 案例


---

## What：BAPI 和 Facade 的關係是什麼？

**BAPI 本身已經是一個 Facade**——SAP 把內部複雜度（資料庫、業務邏輯、鎖定機制）封裝起來，對外提供相對簡單的 Function Module 介面。

**但 BAPI 對你的程式來說還是太複雜**——所以你需要再包一層 Facade。

```
你的呼叫端
  │  只看到 ZIF_SALES_ORDER_SERVICE（極度簡單）
  ▼
ZCL_SALES_ORDER_FACADE    ← 你寫的 Facade（第二層）
  │  處理 Header/Item/Partner 準備、Return 處理、COMMIT
  ▼
BAPI_SALESORDER_CREATEFROMDAT2  ← SAP 的 Facade（第一層）
  │
  ▼
SAP 內部：資料庫、業務邏輯、鎖定機制...
```

> **每一層都在隱藏下一層的複雜度。**

---

## So What：不包裝 BAPI 會怎樣？

```abap
" BAPI 雖然已經是 Facade，但對你的程式還是太複雜
CALL FUNCTION 'BAPI_SALESORDER_CREATEFROMDAT2'
  EXPORTING
    order_header_in        = ls_header    " 要自己準備
    order_header_inx       = ls_headerx   " 還有 X-Structure
  IMPORTING
    salesdocument          = lv_order_no
  TABLES
    order_items_in         = lt_items
    order_items_inx        = lt_itemsx
    order_partners         = lt_partners
    return                 = lt_return.   " 還要自己解讀錯誤

CALL FUNCTION 'BAPI_TRANSACTION_COMMIT' EXPORTING wait = 'X'.
```

**問題一（違反 S）：** 呼叫端同時負責業務邏輯和 BAPI 所有技術細節。

**問題二（違反 O）：** BAPI 介面改變，所有呼叫端都要跟著改。

**問題三（違反 D）：** 呼叫端直接依賴 BAPI 具體細節，無法替換、無法測試。

這些複雜的程式碼如果散落在十個程式裡，就是十個地方要維護。

---

## Now What：BAPI Facade 的完整實作

### Interface：對外的簡單合約

```abap
INTERFACE zif_sales_order_service.
  METHODS:
    create_order
      IMPORTING iv_customer  TYPE kunnr
                iv_material  TYPE matnr
                iv_quantity  TYPE kwmeng
      RETURNING VALUE(rv_order_no) TYPE vbeln
      RAISING   zcx_order_error,
    cancel_order
      IMPORTING iv_order_no TYPE vbeln
      RAISING   zcx_order_error.
ENDINTERFACE.
```

### Facade Class：封裝所有 BAPI 細節

```abap
CLASS zcl_sales_order_facade DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_sales_order_service.

  PRIVATE SECTION.
    METHODS:
      build_header
        IMPORTING iv_customer TYPE kunnr
        EXPORTING es_header   TYPE bapisdhd1
                  es_headerx  TYPE bapisdhd1x,
      build_items
        IMPORTING iv_material TYPE matnr
                  iv_quantity TYPE kwmeng
        EXPORTING et_items    TYPE TABLE OF bapisditm
                  et_itemsx   TYPE TABLE OF bapisditmx,
      build_partners
        IMPORTING iv_customer TYPE kunnr
        EXPORTING et_partners TYPE TABLE OF bapiparnr,
      handle_return           " BAPI 錯誤機制 → OO Exception
        IMPORTING it_return   TYPE TABLE OF bapiret2
        RAISING   zcx_order_error,
      commit_transaction.
ENDCLASS.

CLASS zcl_sales_order_facade IMPLEMENTATION.

  METHOD zif_sales_order_service~create_order.
    build_header(
      IMPORTING iv_customer = iv_customer
      EXPORTING es_header   = DATA(ls_header)
                es_headerx  = DATA(ls_headerx) ).
    build_items(
      IMPORTING iv_material = iv_material
                iv_quantity = iv_quantity
      EXPORTING et_items    = DATA(lt_items)
                et_itemsx   = DATA(lt_itemsx) ).
    build_partners(
      IMPORTING iv_customer = iv_customer
      EXPORTING et_partners = DATA(lt_partners) ).

    DATA: lt_return TYPE TABLE OF bapiret2.
    CALL FUNCTION 'BAPI_SALESORDER_CREATEFROMDAT2'
      EXPORTING  order_header_in  = ls_header
                 order_header_inx = ls_headerx
      IMPORTING  salesdocument    = rv_order_no
      TABLES     order_items_in   = lt_items
                 order_items_inx  = lt_itemsx
                 order_partners   = lt_partners
                 return           = lt_return.

    handle_return( lt_return ).
    commit_transaction( ).
  ENDMETHOD.

  METHOD handle_return.
    " 把 Procedural 的錯誤機制轉換成 OO 的錯誤機制
    LOOP AT it_return INTO DATA(ls_return)
      WHERE type = 'E' OR type = 'A'.
      RAISE EXCEPTION TYPE zcx_order_error
        EXPORTING iv_message = ls_return-message.
    ENDLOOP.
  ENDMETHOD.

  METHOD commit_transaction.
    CALL FUNCTION 'BAPI_TRANSACTION_COMMIT' EXPORTING wait = 'X'.
  ENDMETHOD.
ENDCLASS.
```

### 呼叫端：極度簡單

```abap
TRY.
  DATA(lv_order) = NEW zcl_sales_order_facade(
    )->zif_sales_order_service~create_order(
      iv_customer = '0000001234'
      iv_material = 'MAT001'
      iv_quantity = 10 ).
  WRITE: '訂單建立成功：', lv_order.

CATCH zcx_order_error INTO DATA(lx_error).
  WRITE: '建立失敗：', lx_error->mv_message.
ENDTRY.
```

---

### Facade 帶來的三個具體好處

**① BAPI 介面改了，只動 Facade**
```
BAPI 新增必填參數
  → 只改 zcl_sales_order_facade 內部的 build_header
  → 所有呼叫端完全不動
```

**② 可以替換底層實作**
```abap
" 今天用 BAPI，明天改用 RFC
CLASS zcl_sales_order_rfc_facade DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_sales_order_service.  " 同一個 Interface
ENDCLASS.
" 呼叫端：DATA(lo_service) = NEW zcl_sales_order_rfc_facade( ).
" 程式碼一行都不用改
```

**③ 測試不需要真實 SAP 系統**
```abap
CLASS zcl_mock_order_service DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_sales_order_service.
    DATA: mv_was_called TYPE abap_bool,
          mv_order_no   TYPE vbeln VALUE '9999999999'.
ENDCLASS.

CLASS zcl_mock_order_service IMPLEMENTATION.
  METHOD zif_sales_order_service~create_order.
    mv_was_called = abap_true.
    rv_order_no   = mv_order_no.   " 直接回傳假資料
  ENDMETHOD.
ENDCLASS.

" 測試：注入 Mock，不呼叫真實 BAPI
DATA(lo_proc) = NEW zcl_order_processor(
  io_service = NEW zcl_mock_order_service( ) ).
lo_proc->run( ).
cl_abap_unit_assert=>assert_true( act = lo_mock->mv_was_called ).
```

---

### handle_return 的額外意義

`handle_return` 不只是錯誤處理，它在做**語言系統的轉換**：

```
BAPI 的錯誤機制（Procedural）：
  → Return Table + sy-subrc
  → 呼叫端可以完全無視

OO 的錯誤機制：
  → Exception Class（cx_static_check）
  → 強制處理，寫進合約

handle_return 把 Procedural 的錯誤機制
轉換成 OO 的錯誤機制
讓整個系統的錯誤處理保持一致
```

---

### OO 概念運用

```
Interface    →  定義簡單的對外合約，呼叫端只認識這個
Encapsulation →  BAPI 所有複雜細節藏在 PRIVATE SECTION
Exception    →  handle_return 把 BAPI 錯誤轉換成 OO Exception
Composition  →  Facade 內部各工具方法各司其職（has-a）
```

### SOLID 運用

```
S  →  Facade 只負責簡化 BAPI 存取
      build_header / handle_return 等方法各司其職
O  →  BAPI 改變只動 Facade 內部，呼叫端不動
I  →  只暴露呼叫端需要的 create / cancel，BAPI 細節全部隱藏
D  →  呼叫端依賴 Interface，可以注入 Mock，不依賴 BAPI 細節
```

---

## BAdI vs BAPI Facade 的本質對比

| | BAdI（Template Method） | BAPI Facade |
|---|---|---|
| 你的角色 | 子類別，填入 SAP 流程的步驟 | 包裝者，替呼叫端擋住複雜度 |
| 方向 | 由外往內（你填進 SAP） | 由內往外（你擋在外面） |
| 解決的問題 | 標準流程如何被客製化 | 複雜介面如何被簡化 |

---

## 面試一句話

> **我包裝 BAPI 時會用 Facade Pattern——定義一個 Interface，把 Header/Item/Partner 的準備、Return 的處理、COMMIT 全部封裝在 Facade 裡。呼叫端只看到一個簡單的 `create_order( )`，而且可以注入 Mock 進行 Unit Test，不需要真實的 SAP 環境。**

---

## 相關筆記

- [[08-OO-ABAP-1-核心邏輯鏈]]
- [[08-OO-ABAP-3-SOLID原則]]
- [[08-OO-ABAP-6-TemplateMethod與Facade]]
- [[08-OO-ABAP-7-BAdI案例]]
