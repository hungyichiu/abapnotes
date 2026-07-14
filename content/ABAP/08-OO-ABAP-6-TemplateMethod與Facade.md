---
title: "設計模式：Template Method + Facade"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# 設計模式：Template Method + Facade

> OO ABAP 系列第 6 篇，共 8 篇：[[08-OO-ABAP-5-Strategy與Observer|上一篇：Strategy 與 Observer]] → 本篇：Template Method 與 Facade → [[08-OO-ABAP-7-BAdI案例|下一篇：BAdI 案例]]


> 結構類模式：解決「流程如何被組織」和「複雜度如何被隱藏」的問題

---

# Template Method Pattern

## What：Template Method 是什麼？

父類別用 Abstract Class 把流程骨架鎖死，把「可變的步驟」宣告為 ABSTRACT Method，強制子類別填入——骨架固定，細節可變。

```
外界呼叫 process( )（骨架）
    │
    ▼
ZCL_DOCUMENT（Abstract Class）
  ├─ validate( )  ABSTRACT → 子類別各自定義
  ├─ calculate( ) ABSTRACT → 子類別各自定義
  ├─ save( )      共用     → 只寫一次
  └─ notify( )    共用     → 只寫一次
```

---

## So What：沒有 Template Method 會怎樣？

```abap
" 發票
CLASS zcl_invoice IMPLEMENTATION.
  METHOD process.
    validate( ).   " 發票的驗證邏輯
    calculate( ).  " 發票的計算邏輯
    save( ).       " 跟折讓單一樣，但重複寫了一遍
    notify( ).     " 跟折讓單一樣，但重複寫了一遍
  ENDMETHOD.
ENDCLASS.

" 折讓單
CLASS zcl_credit_note IMPLEMENTATION.
  METHOD process.
    validate( ).   " 折讓單的驗證邏輯（不同）
    calculate( ).  " 折讓單的計算邏輯（不同）
    save( ).       " 跟發票一樣，但又寫了一遍
    notify( ).     " 跟發票一樣，但又寫了一遍
  ENDMETHOD.
ENDCLASS.
```

**問題一（違反 S）：** 每個 Class 同時負責流程控制和所有步驟的實作。

**問題二（違反 O）：** 流程順序要改，每個 Class 都要動。

**問題三（違反 D）：** 流程骨架和實作細節完全耦合，共用邏輯（save/notify）重複出現。

---

## Now What：Template Method 的實作

```abap
" 第一步：Abstract Class 定義骨架
CLASS zcl_document DEFINITION ABSTRACT.
  PUBLIC SECTION.
    METHODS: process.               " 骨架：對外公開，不能被覆寫

  PROTECTED SECTION.
    METHODS:
      validate  ABSTRACT,           " 強制子類別實作
      calculate ABSTRACT,           " 強制子類別實作
      save,                         " 有預設，子類別可選擇覆寫
      notify.                       " 有預設，子類別可選擇覆寫
ENDCLASS.

CLASS zcl_document IMPLEMENTATION.
  METHOD process.
    validate( ).    " 步驟一（子類別定義）
    calculate( ).   " 步驟二（子類別定義）
    save( ).        " 步驟三（共用，只寫一次）
    notify( ).      " 步驟四（共用，只寫一次）
  ENDMETHOD.

  METHOD save.
    " 所有文件共用的儲存邏輯
  ENDMETHOD.

  METHOD notify.
    " 所有文件共用的通知邏輯
  ENDMETHOD.
ENDCLASS.

" 第二步：子類別只填入可變的步驟
CLASS zcl_invoice DEFINITION INHERITING FROM zcl_document.
  PROTECTED SECTION.
    METHODS: validate REDEFINITION, calculate REDEFINITION.
ENDCLASS.

CLASS zcl_invoice IMPLEMENTATION.
  METHOD validate.
    IF mv_amount <= 0.
      RAISE EXCEPTION TYPE zcx_invalid_invoice.
    ENDIF.
  ENDMETHOD.
  METHOD calculate.
    mv_total = mv_amount * mv_tax_rate.
  ENDMETHOD.
ENDCLASS.

" 第三步：呼叫端完全不知道細節
DATA: lt_docs TYPE TABLE OF REF TO zcl_document.
APPEND NEW zcl_invoice( )     TO lt_docs.
APPEND NEW zcl_credit_note( ) TO lt_docs.

LOOP AT lt_docs INTO DATA(lo_doc).
  lo_doc->process( ).    " 骨架固定，細節各自執行
ENDLOOP.
```

**可見性的設計邏輯：**
```
PUBLIC    process( )    →  對外入口，骨架鎖在這裡
PROTECTED validate( )   →  對外隱藏，子類別可以覆寫
PROTECTED calculate( )  →  對外隱藏，子類別可以覆寫
PROTECTED save( )       →  有預設，子類別可選擇覆寫
PROTECTED notify( )     →  有預設，子類別可選擇覆寫
```

**OO 概念運用：**
```
Abstract Class   →  不完整的藍圖，定義骨架，不能被實體化
ABSTRACT Method  →  強制子類別填入，編譯期就檢查
PROTECTED        →  擴充點對外隱藏，對子類別開放
REDEFINITION     →  子類別填入自己的版本
多型             →  process( ) 呼叫，各自執行覆寫的步驟
```

**SOLID 運用：**
```
S  →  父類別管流程控制，子類別管步驟實作，職責分離
O  →  新增文件類型只加子類別，骨架完全不動
L  →  子類別不改變流程語義，可以完全替換父類別
D  →  呼叫端依賴抽象父類別，不依賴具體子類別
```

**SAP 真實案例：BAdI** → 詳見 [[08-OO-ABAP-7-BAdI案例]]

---

# Facade Pattern

## What：Facade 是什麼？

把複雜的子系統（例如 BAPI）包裝起來，對外提供一個簡單的 Interface——複雜度隱藏在內部，呼叫端只看到簡單的合約。

```
呼叫端
  │  只看到 ZIF_SALES_ORDER_SERVICE
  ▼
ZCL_SALES_ORDER_FACADE（你的 Facade）
  │  處理所有 BAPI 細節
  ▼
BAPI_SALESORDER_CREATEFROMDAT2（SAP 的 Facade）
  │
  ▼
SAP 內部：DB、業務邏輯、鎖定機制...
```

> BAPI 本身已經是一個 Facade——你再包一層，讓呼叫端更簡單。

---

## So What：沒有 Facade 會怎樣？

```abap
" 呼叫端自己處理所有 BAPI 複雜度
DATA: ls_header  TYPE bapisdhd1,
      ls_headerx TYPE bapisdhd1x,
      lt_items   TYPE TABLE OF bapisditm,
      lt_itemsx  TYPE TABLE OF bapisditmx,
      lt_partner TYPE TABLE OF bapiparnr,
      lt_return  TYPE TABLE OF bapiret2.

" 準備 Header...準備 Item...準備 Partner...
CALL FUNCTION 'BAPI_SALESORDER_CREATEFROMDAT2'
  EXPORTING  order_header_in  = ls_header
             order_header_inx = ls_headerx
  IMPORTING  salesdocument    = lv_order_no
  TABLES     order_items_in   = lt_items
             order_items_inx  = lt_itemsx
             order_partners   = lt_partner
             return           = lt_return.

LOOP AT lt_return INTO DATA(ls_return) WHERE type = 'E'.
  RAISE EXCEPTION TYPE zcx_order_error.
ENDLOOP.

CALL FUNCTION 'BAPI_TRANSACTION_COMMIT' EXPORTING wait = 'X'.
```

**問題一（違反 S）：** 呼叫端同時負責業務邏輯和 BAPI 所有技術細節。

**問題二（違反 O）：** BAPI 介面改變，所有呼叫端都要跟著改。

**問題三（違反 D）：** 呼叫端直接依賴 BAPI 的具體細節，無法替換、無法測試。

---

## Now What：Facade 的實作

```abap
" 第一步：定義 Interface（對外的簡單合約）
INTERFACE zif_sales_order_service.
  METHODS: create_order
    IMPORTING iv_customer  TYPE kunnr
              iv_material  TYPE matnr
              iv_quantity  TYPE kwmeng
    RETURNING VALUE(rv_order_no) TYPE vbeln
    RAISING   zcx_order_error.
ENDINTERFACE.

" 第二步：Facade Class 封裝所有複雜度
CLASS zcl_sales_order_facade DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_sales_order_service.

  PRIVATE SECTION.
    " 所有 BAPI 細節藏在這裡
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
      handle_return           " BAPI 錯誤 → OO Exception
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

" 呼叫端：極度簡單
TRY.
  DATA(lv_order) = NEW zcl_sales_order_facade(
    )->zif_sales_order_service~create_order(
      iv_customer = '0000001234'
      iv_material = 'MAT001'
      iv_quantity = 10 ).
CATCH zcx_order_error INTO DATA(lx_error).
  WRITE: lx_error->mv_message.
ENDTRY.
```

**Facade 帶來的三個具體好處：**
```
① BAPI 介面改了 → 只動 Facade 內部，呼叫端完全不動
② 可以替換底層  → 換 RFC 或直接 INSERT，只加新 Class
③ 可以測試      → 注入 Mock Facade，不需要真實 SAP 系統
```

**OO 概念運用：**
```
Interface    →  定義簡單的對外合約
Encapsulation →  所有 BAPI 細節藏在 PRIVATE
Exception    →  handle_return 把 Procedural 錯誤轉成 OO Exception
```

**SOLID 運用：**
```
S  →  Facade 只負責簡化 BAPI 存取，各 PRIVATE 方法各司其職
O  →  子系統改變只動 Facade，呼叫端不動
I  →  只暴露呼叫端真正需要的方法，BAPI 幾十個參數全部隱藏
D  →  呼叫端依賴 Interface，可以注入 Mock
```

**SAP 真實案例：BAPI 包裝** → 詳見 [[08-OO-ABAP-8-BAPI案例]]

---

## Template Method vs Facade 的本質對比

| | Template Method（BAdI） | Facade（BAPI） |
|---|---|---|
| 解決的問題 | 骨架固定，步驟可變 | 複雜度隱藏，介面簡化 |
| 角色 | SAP 是父類別，你填步驟 | 你是包裝者，替呼叫端擋住複雜度 |
| 方向 | 由外往內（你填進 SAP 流程） | 由內往外（你擋在外面） |

---

## 六個模式一句話核心

| 模式 | 核心 |
|---|---|
| Factory | 建立的決定，不該由使用者來做 |
| Singleton | 有些東西，全世界只能有一份 |
| Strategy | 演算法是可以被替換的零件 |
| Observer | 我不需要知道誰在聽，只管廣播 |
| Template Method | 流程我來定，細節你來填 |
| Facade | 複雜的事情，讓我替你擋在門外 |

---

## 相關筆記

- [[08-OO-ABAP-1-核心邏輯鏈]]
- [[08-OO-ABAP-3-SOLID原則]]
- [[08-OO-ABAP-4-Factory與Singleton]]
- [[08-OO-ABAP-5-Strategy與Observer]]
- [[08-OO-ABAP-7-BAdI案例]]
- [[08-OO-ABAP-8-BAPI案例]]
