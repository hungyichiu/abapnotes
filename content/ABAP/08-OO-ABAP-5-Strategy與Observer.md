---
title: "設計模式：Strategy + Observer"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# 設計模式：Strategy + Observer

> OO ABAP 系列第 5 篇，共 8 篇：[[08-OO-ABAP-4-Factory與Singleton|上一篇：Factory 與 Singleton]] → 本篇：Strategy 與 Observer → [[08-OO-ABAP-6-TemplateMethod與Facade|下一篇：Template Method 與 Facade]]


> 行為類模式：解決「行為怎麼被組合」的問題，Interface 和多型是主角

---

# Strategy Pattern

## What：Strategy 是什麼？

把「演算法」抽出來，用 Interface 定義，從外面注入——讓主體邏輯不需要知道演算法的細節，演算法可以自由替換。

```
呼叫端決定注入哪種策略
    │
    ▼
ZCL_ORDER（持有 ZIF_PRICING_STRATEGY）
    │  mo_strategy->calculate( )
    ▼
多型在這裡發生：
  ├─ ZCL_PRICING_NORMAL   → 原價
  ├─ ZCL_PRICING_VIP      → 八折
  └─ ZCL_PRICING_SEASONAL → 八五折
```

---

## So What：沒有 Strategy 會怎樣？

```abap
" 所有定價邏輯塞進 CASE/IF
METHOD calculate_price.
  CASE iv_customer_type.
    WHEN 'VIP'.      rv_price = iv_amount * '0.8'.
    WHEN 'MEMBER'.   rv_price = iv_amount * '0.9'.
    WHEN 'SEASONAL'. rv_price = iv_amount * '0.85'.  " 每次新增都改這裡
  ENDCASE.
ENDMETHOD.
```

**問題一（違反 S）：** `zcl_order` 同時負責訂單邏輯和所有定價演算法。

**問題二（違反 O）：** 新增定價方式要修改這個現有 Class，可能引入新 Bug。

**問題三（違反 D）：** 定價邏輯死綁在 `zcl_order` 內部，無法替換、無法測試。

繼承也解決不了：
```
ZCL_ORDER_VIP + ZCL_ORDER_MEMBER + ZCL_ORDER_SEASONAL
VIP 客戶在季節折扣期間下單？→ ZCL_ORDER_VIP_SEASONAL？→ 組合爆炸
```

---

## Now What：Strategy 的實作

```abap
" 第一步：把演算法抽出來，定義成 Interface
INTERFACE zif_pricing_strategy.
  METHODS: calculate
    IMPORTING iv_amount      TYPE decfloat34
    RETURNING VALUE(rv_price) TYPE decfloat34.
ENDINTERFACE.

" 第二步：每種演算法是獨立的 Class
CLASS zcl_pricing_vip DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_pricing_strategy.
ENDCLASS.
CLASS zcl_pricing_vip IMPLEMENTATION.
  METHOD zif_pricing_strategy~calculate.
    rv_price = iv_amount * '0.8'.
  ENDMETHOD.
ENDCLASS.

CLASS zcl_pricing_seasonal DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_pricing_strategy.
ENDCLASS.
CLASS zcl_pricing_seasonal IMPLEMENTATION.
  METHOD zif_pricing_strategy~calculate.
    rv_price = iv_amount * '0.85'.
  ENDMETHOD.
ENDCLASS.

" 第三步：主體 Class 持有 Interface，不持有具體實作（Composition）
CLASS zcl_order DEFINITION.
  PUBLIC SECTION.
    METHODS: constructor
      IMPORTING io_strategy TYPE REF TO zif_pricing_strategy.
    METHODS: calculate_price
      IMPORTING iv_amount      TYPE decfloat34
      RETURNING VALUE(rv_price) TYPE decfloat34.
  PRIVATE SECTION.
    DATA: mo_strategy TYPE REF TO zif_pricing_strategy.  " has-a
ENDCLASS.

CLASS zcl_order IMPLEMENTATION.
  METHOD constructor.
    mo_strategy = io_strategy.   " 從外面注入，不自己 NEW
  ENDMETHOD.
  METHOD calculate_price.
    rv_price = mo_strategy->calculate( iv_amount ).  " 委託給策略
  ENDMETHOD.
ENDCLASS.

" 呼叫端決定注入哪種策略
DATA(lo_order) = NEW zcl_order( io_strategy = NEW zcl_pricing_vip( ) ).
rv_price = lo_order->calculate_price( iv_amount = 1000 ).  " → 800
```

**OO 概念運用：**
```
Interface    →  定義所有策略共同的能力（can-do）
多型         →  同一個 calculate( ) 呼叫，各自執行自己的版本
Composition  →  zcl_order 持有策略物件（has-a，不是 is-a）
Encapsulation →  演算法細節封裝在各自的 Class 內部
```

**SOLID 運用：**
```
S  →  訂單邏輯和演算法職責完全分離
O  →  新增演算法只加 Class，zcl_order 完全不動
I  →  zif_pricing_strategy 只有一個方法，精確描述能力
D  →  zcl_order 依賴抽象，策略從外面注入，可測試
```

**繼承 vs Strategy 的選擇：**
```
繼承   →  靜態，is-a，組合容易爆炸
Strategy →  動態，has-a，組合自由靈活

選 Strategy 的時機：
  同一件事有多種做法，做法可能增加
  做法需要在執行期動態決定
  不同做法的組合很多
```

---

# Observer Pattern

## What：Observer 是什麼？

讓「事件發出者」不需要知道誰在監聽，Observer 自己登記；事件發生時，發出者只管觸發，各 Observer 自己決定如何反應。

```
Observer 自己來登記
    │
ZCL_ORDER（持有 Observer 清單）
    │  事件發生時，逐一通知
    ▼
多型在這裡發生：
  ├─ ZCL_ORDER_MAILER    → on_order_confirmed( )：寄信
  ├─ ZCL_INVENTORY       → on_order_confirmed( )：更新庫存
  └─ ZCL_ORDER_LOGGER    → on_order_confirmed( )：寫 Log
```

---

## So What：沒有 Observer 會怎樣？

```abap
METHOD confirm.
  mv_status = 'CONFIRMED'.

  " 所有通知邏輯硬寫在這裡
  NEW zcl_order_mailer( )->send_confirmation( me ).
  NEW zcl_inventory( )->update( me ).
  NEW zcl_logger( )->log( me ).
  " 新增通知對象？→ 改這個 Class
ENDMETHOD.
```

**問題一（違反 S）：** `zcl_order` 同時負責訂單邏輯和所有通知邏輯。

**問題二（違反 O）：** 新增通知對象要修改 `zcl_order`。

**問題三（違反 D）：** `zcl_order` 直接依賴所有具體通知 Class，耦合越來越重。

---

## Now What：Observer 的實作

```abap
" 第一步：定義 Observer Interface（被通知的能力）
INTERFACE zif_order_observer.
  METHODS: on_order_confirmed
    IMPORTING io_order TYPE REF TO zcl_order.
ENDINTERFACE.

" 第二步：各自實作自己的反應邏輯
CLASS zcl_order_mailer DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_order_observer.
ENDCLASS.
CLASS zcl_order_mailer IMPLEMENTATION.
  METHOD zif_order_observer~on_order_confirmed.
    " 寄確認信
  ENDMETHOD.
ENDCLASS.

CLASS zcl_inventory_updater DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_order_observer.
ENDCLASS.
CLASS zcl_inventory_updater IMPLEMENTATION.
  METHOD zif_order_observer~on_order_confirmed.
    " 更新庫存
  ENDMETHOD.
ENDCLASS.

" 第三步：事件發出者持有 Observer 清單
CLASS zcl_order DEFINITION.
  PUBLIC SECTION.
    METHODS:
      add_observer
        IMPORTING io_observer TYPE REF TO zif_order_observer,
      remove_observer
        IMPORTING io_observer TYPE REF TO zif_order_observer,
      confirm.
  PRIVATE SECTION.
    DATA: mt_observers TYPE TABLE OF REF TO zif_order_observer.
ENDCLASS.

CLASS zcl_order IMPLEMENTATION.
  METHOD add_observer.
    APPEND io_observer TO mt_observers.
  ENDMETHOD.
  METHOD remove_observer.
    DELETE mt_observers WHERE table_line = io_observer.
  ENDMETHOD.
  METHOD confirm.
    mv_status = 'CONFIRMED'.
    LOOP AT mt_observers INTO DATA(lo_observer).
      lo_observer->on_order_confirmed( me ).  " 各自執行自己的版本
    ENDLOOP.
    " zcl_order 不知道也不在乎清單裡有誰
  ENDMETHOD.
ENDCLASS.

" 呼叫端決定誰要被通知
DATA(lo_order) = NEW zcl_order( ).
lo_order->add_observer( NEW zcl_order_mailer( ) ).
lo_order->add_observer( NEW zcl_inventory_updater( ) ).
lo_order->confirm( ).   " 兩個 Observer 自動被通知

" 新增通知對象：加一行，zcl_order 完全不動
lo_order->add_observer( NEW zcl_shipment_trigger( ) ).
```

**OO 概念運用：**
```
Interface    →  定義「被通知」的能力
多型         →  同一個 on_order_confirmed( ) 呼叫，各自執行自己的版本
Composition  →  zcl_order 持有 Observer 清單（has-a）
Encapsulation →  通知邏輯封裝在各自的 Observer Class
```

**SOLID 運用：**
```
S  →  zcl_order 只管訂單邏輯和觸發，各 Observer 只管自己的反應
O  →  新增通知對象只加 Class，zcl_order 完全不動
D  →  zcl_order 依賴 zif_order_observer（抽象），不依賴具體通知 Class
```

**SAP 真實案例：OO ALV Event Handler**
```abap
CLASS lcl_event_handler DEFINITION.
  PUBLIC SECTION.
    METHODS: on_double_click
      FOR EVENT double_click OF cl_gui_alv_grid
      IMPORTING e_row e_column.
ENDCLASS.

DATA(lo_handler) = NEW lcl_event_handler( ).
SET HANDLER lo_handler->on_double_click FOR lo_alv.
" ALV 不需要知道誰在監聽，Handler 自己來登記——這就是 Observer
```

---

## Strategy vs Observer 的差別

| | Strategy | Observer |
|---|---|---|
| 解決的問題 | 「怎麼做」可以替換 | 「發生了通知我」 |
| 同時作用數量 | 一次只有一個策略 | 可以有多個 Observer |
| 主動方 | 呼叫端主動選擇策略 | Observer 自己決定登記 |
| 適合場景 | 演算法互斥可替換 | 一對多的事件通知 |

---

## 相關筆記

- [[08-OO-ABAP-1-核心邏輯鏈]]
- [[08-OO-ABAP-3-SOLID原則]]
- [[08-OO-ABAP-4-Factory與Singleton]]
- [[08-OO-ABAP-6-TemplateMethod與Facade]]
