---
title: "設計模式：Factory + Singleton"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# 設計模式：Factory + Singleton

> OO ABAP 系列第 4 篇，共 8 篇：[[08-OO-ABAP-3-SOLID原則|上一篇：SOLID 原則]] → 本篇：Factory 與 Singleton → [[08-OO-ABAP-5-Strategy與Observer|下一篇：Strategy 與 Observer]]


> 建立類模式：解決「物件怎麼被建立」的問題

---

# Factory Pattern

## What：Factory 是什麼？

一個專門負責「建立物件」的 Class，把建立邏輯集中在一個地方，對外只回傳抽象型別。

```
呼叫端
  │  只知道 Interface
  ▼
ZCL_DOCUMENT_FACTORY=>create( )   ← 集中建立邏輯
  ├─→ NEW zcl_invoice( )
  ├─→ NEW zcl_credit_note( )
  └─→ NEW zcl_purchase_order( )
```

---

## So What：沒有 Factory 會怎樣？

```abap
" 呼叫端自己 NEW：三個問題同時發生
IF lv_doc_type = 'INVOICE'.
  DATA(lo_doc) = NEW zcl_invoice( ).
ELSEIF lv_doc_type = 'CREDIT_NOTE'.
  DATA(lo_doc) = NEW zcl_credit_note( ).
ELSEIF lv_doc_type = 'PURCHASE_ORDER'.
  DATA(lo_doc) = NEW zcl_purchase_order( ).
ENDIF.
```

**問題一（違反 S）：** 呼叫端同時負責「建立物件」和「使用物件」兩件事。

**問題二（違反 O）：** 新增一種文件類型，這段 IF/ELSEIF 散落在十個地方，要改十次。

**問題三（違反 D）：** 呼叫端直接依賴所有具體 Class，耦合過重。

---

## Now What：Factory 的實作

```abap
" 第一步：定義 Interface（呼叫端只認識這個）
INTERFACE zif_document.
  METHODS: process.
ENDINTERFACE.

" 第二步：各種具體實作各自獨立
CLASS zcl_invoice DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_document.
ENDCLASS.
CLASS zcl_invoice IMPLEMENTATION.
  METHOD zif_document~process.
    " 發票的處理邏輯
  ENDMETHOD.
ENDCLASS.

" 第三步：Factory 集中管理建立邏輯
CLASS zcl_document_factory DEFINITION.
  PUBLIC SECTION.
    CLASS-METHODS: create
      IMPORTING iv_doc_type   TYPE string
      RETURNING VALUE(ro_doc) TYPE REF TO zif_document
      RAISING   zcx_invalid_doc_type.
ENDCLASS.

CLASS zcl_document_factory IMPLEMENTATION.
  METHOD create.
    CASE iv_doc_type.
      WHEN 'INVOICE'.     ro_doc = NEW zcl_invoice( ).
      WHEN 'CREDIT_NOTE'. ro_doc = NEW zcl_credit_note( ).
      WHEN OTHERS.
        RAISE EXCEPTION TYPE zcx_invalid_doc_type.
    ENDCASE.
  ENDMETHOD.
ENDCLASS.

" 呼叫端：乾淨，不知道也不在乎具體 Class 是誰
DATA(lo_doc) = zcl_document_factory=>create( iv_doc_type = lv_type ).
lo_doc->process( ).
```

**OO 概念運用：**
```
Static Method  →  Factory 不需要先實體化，直接 => 呼叫
Interface      →  回傳抽象型別，呼叫端不依賴具體 Class
Encapsulation  →  建立邏輯完全藏在 Factory 內部
Exception      →  無效型別在入口就擋掉
```

**SOLID 運用：**
```
S  →  Factory 只建立，呼叫端只使用，職責分離
O  →  新增類型只加 Class + 一行 WHEN，不改現有程式碼
D  →  呼叫端依賴 Interface（抽象），不依賴具體 Class
```

**SAP 真實案例：**
```abap
CL_SALV_TABLE=>factory(
  IMPORTING r_salv_table = DATA(lo_alv)
  CHANGING  t_table      = lt_data ).
" 你不需要知道內部建了哪些物件，factory() 全部處理好
```

**什麼時候用：**
```
直接 NEW 就夠：  只有一種 Class，不會變化
需要 Factory：   根據條件建立不同 Class（最主要場景）
                 建立邏輯複雜（需要驗證初始化）
                 未來可能新增類型
```

---

# Singleton Pattern

## What：Singleton 是什麼？

一種確保整個程式只存在一個實體的設計方式，透過封死 NEW 的入口、提供唯一存取管道來實現。

```
任何地方呼叫 get_instance( )
  │
  ▼
IS BOUND？
  ├─ 否（第一次）→ NEW，存進 CLASS-DATA mo_instance
  └─ 是（之後）  → 直接回傳 mo_instance（同一個）
```

---

## So What：沒有 Singleton 會怎樣？

```abap
" A 程式
DATA(lo_config_1) = NEW zcl_config( ).
lo_config_1->set_value( iv_key = 'MAX_RETRY' iv_value = '3' ).

" B 程式（不知道 A 已經建了一個）
DATA(lo_config_2) = NEW zcl_config( ).
lo_config_2->get_value( iv_key = 'MAX_RETRY' ).  " 拿到空的，狀態不一致
```

**問題（違反 S + D）：** 每個呼叫端都要自己管理物件的建立和生命週期，狀態各自為政。

這類問題常見於：
- 設定檔讀取器（設定只有一份，不應該有兩個物件各自讀）
- Log 管理員（所有 Log 要寫進同一個地方）
- 資料庫連線池（連線資源有限）

---

## Now What：Singleton 的實作

三個步驟，缺一不可：

```abap
CLASS zcl_config DEFINITION.
  PUBLIC SECTION.
    " 步驟三：唯一的存取入口
    CLASS-METHODS: get_instance
      RETURNING VALUE(ro_instance) TYPE REF TO zcl_config.
    METHODS:
      get_value
        IMPORTING iv_key         TYPE string
        RETURNING VALUE(rv_value) TYPE string,
      set_value
        IMPORTING iv_key   TYPE string
                  iv_value TYPE string.

  PRIVATE SECTION.
    " 步驟二：唯一實體存在 CLASS-DATA 裡
    CLASS-DATA: mo_instance TYPE REF TO zcl_config.
    " 步驟一：封死外部 NEW 的入口
    METHODS: constructor.
ENDCLASS.

CLASS zcl_config IMPLEMENTATION.
  METHOD get_instance.
    IF mo_instance IS NOT BOUND.         " 還沒建立過？
      mo_instance = NEW zcl_config( ).   " 只建立這一次
    ENDIF.
    ro_instance = mo_instance.           " 永遠回傳同一個
  ENDMETHOD.
ENDCLASS.

" 使用：不管在哪裡呼叫，永遠是同一個物件
DATA(lo_config) = zcl_config=>get_instance( ).
lo_config->set_value( iv_key = 'MAX_RETRY' iv_value = '3' ).

" 另一個地方
DATA(lo_config) = zcl_config=>get_instance( ).
lo_config->get_value( iv_key = 'MAX_RETRY' ).   " 拿到 '3'，狀態一致

" 直接 NEW？
DATA(lo_config) = NEW zcl_config( ).    " ❌ 編譯錯誤，Constructor 是 PRIVATE
```

**OO 概念運用：**
```
PRIVATE Constructor  →  封死外部 NEW 的入口，語言層面強制
Static Class-Data    →  唯一實體屬於 Class，整個程式只有一份
Static get_instance  →  統一存取入口
IS BOUND             →  判斷是否已經初始化，只建立一次
```

**SOLID 運用：**
```
S  →  物件生命週期的管理封裝在自己內部，呼叫端不負責
D  →  呼叫端透過 get_instance 取得物件，不直接 NEW
```

**Factory + Singleton 的組合：**

Factory 本身通常做成 Singleton——整個程式只需要一個 Factory：

```abap
CLASS zcl_document_factory DEFINITION.
  PUBLIC SECTION.
    CLASS-METHODS: get_instance
      RETURNING VALUE(ro_instance) TYPE REF TO zcl_document_factory.
    METHODS: create
      IMPORTING iv_doc_type   TYPE string
      RETURNING VALUE(ro_doc) TYPE REF TO zif_document.
  PRIVATE SECTION.
    CLASS-DATA: mo_instance TYPE REF TO zcl_document_factory.
    METHODS: constructor.
ENDCLASS.

DATA(lo_factory) = zcl_document_factory=>get_instance( ).
DATA(lo_doc)     = lo_factory->create( iv_doc_type = 'INVOICE' ).
```

**什麼時候用：**
```
需要 Singleton：  全域共享狀態（設定、快取）
                  資源有限（連線池、Log 檔）
                  確保狀態一致

不該用：          只是想省略 NEW → 用 Static Method 就好
                  濫用 Singleton = 全域變數的 OO 版本，一樣危險
```

---

## 兩個模式的關係

```
Factory    →  解決「建立哪種物件」的問題（What to create）
Singleton  →  解決「只能有一份」的問題（How many instances）

最常見的組合：Factory 本身做成 Singleton
  → 建立邏輯集中（Factory）+ 工廠只有一個（Singleton）
```

---

## 相關筆記

- [[08-OO-ABAP-1-核心邏輯鏈]]
- [[08-OO-ABAP-3-SOLID原則]]
- [[08-OO-ABAP-5-Strategy與Observer]]
