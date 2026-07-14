---
title: "SOLID 原則"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# SOLID 原則

> OO ABAP 系列第 3 篇，共 8 篇：[[08-OO-ABAP-2-命名規則|上一篇：命名規則]] → 本篇：SOLID 原則 → [[08-OO-ABAP-4-Factory與Singleton|下一篇：Factory 與 Singleton]]


---

## What：SOLID 是什麼？

五條 OO 設計的判斷準則，告訴你工具該怎麼用才是對的。

> **OO 概念是工具，SOLID 是用對工具的判斷準則——它們從來就是同一件事。**

| 字母 | 原則 | 一句話 |
|---|---|---|
| S | Single Responsibility | 一個 Class 只有一個改變的理由 |
| O | Open/Closed | 對擴充開放，對修改封閉 |
| L | Liskov Substitution | 子類別可以完全替換父類別 |
| I | Interface Segregation | 不強迫實作不需要的方法 |
| D | Dependency Inversion | 依賴抽象，不依賴具體 |

---

## So What：沒有 SOLID 會怎樣？

可以用 OO 語法，但設計一樣混亂：

```abap
CLASS zcl_order DEFINITION.
  PUBLIC SECTION.
    METHODS:
      calculate_total,  " 業務邏輯改 → 這裡改
      print_to_pdf,     " 列印格式改 → 這裡改
      save_to_db,       " 資料庫改   → 這裡改
      send_email.       " 郵件範本改 → 這裡改
ENDCLASS.
" 用了 OO 語法，但跟 Procedural 一樣混亂
" 這個 Class 有四個改變的理由
```

SOLID 就是用來判斷「這樣設計對不對」的標準。

---

## Now What：五條原則的問題、回應與應用

---

### S：Single Responsibility（單一職責）

**So What（問題）**
一個 Class 負責太多事，任何一個方向的改變都會動到它，而且互相影響。

**Now What（回應）**
```abap
" ❌ 一個 Class 四個職責
CLASS zcl_order DEFINITION.
  PUBLIC SECTION.
    METHODS: calculate_total, print_to_pdf, save_to_db, send_email.
ENDCLASS.

" ✅ 每個 Class 只做一件事
CLASS zcl_order DEFINITION.            " 只管業務邏輯
CLASS zcl_order_printer DEFINITION.    " 只管列印
CLASS zcl_order_repository DEFINITION. " 只管資料庫
CLASS zcl_order_notifier DEFINITION.   " 只管通知
```

**對應 OO 概念：**
- Class + Visibility：邊界切對，PRIVATE 才有意義
- Static vs Instance：有狀態和無狀態是不同職責
- Exception：錯誤處理是獨立職責，不混進業務邏輯

---

### O：Open/Closed（開放封閉）

**So What（問題）**
每次新增類型，就要修改現有的程式碼——改動現有程式就有引入新 Bug 的風險。

**Now What（回應）**
```abap
" ❌ 新增折扣類型要改這個 Class
METHOD calculate.
  CASE iv_type.
    WHEN 'VIP'.      rv_result = iv_amount * '0.8'.
    WHEN 'MEMBER'.   rv_result = iv_amount * '0.9'.
    WHEN 'SEASONAL'. rv_result = iv_amount * '0.85'. " ← 每次都改這裡
  ENDCASE.
ENDMETHOD.

" ✅ 新增折扣類型 = 新增一個 Class，不改任何現有程式碼
INTERFACE zif_discount.
  METHODS: calculate
    IMPORTING iv_amount      TYPE decfloat34
    RETURNING VALUE(rv_result) TYPE decfloat34.
ENDINTERFACE.

CLASS zcl_discount_vip      DEFINITION. PUBLIC SECTION. INTERFACES: zif_discount. ENDCLASS.
CLASS zcl_discount_seasonal DEFINITION. PUBLIC SECTION. INTERFACES: zif_discount. ENDCLASS.
```

**對應 OO 概念：**
- Abstract Class 的 Template Method 就是 OCP 的具體形態
- Interface 讓擴充透過新增 Class 實現

---

### L：Liskov Substitution（里氏替換）

**So What（問題）**
子類別破壞了父類別的承諾，呼叫端拿到父類別的參考，卻得到意外的行為。

**Now What（回應）**
```abap
" ❌ 草稿繼承可列印文件，但不能印——破壞了父類別的承諾
CLASS zcl_draft DEFINITION INHERITING FROM zcl_document.
  PUBLIC SECTION.
    METHODS: print REDEFINITION.
ENDCLASS.
CLASS zcl_draft IMPLEMENTATION.
  METHOD print.
    RAISE EXCEPTION TYPE zcx_not_allowed.  " 呼叫端完全沒預期到
  ENDMETHOD.
ENDCLASS.

" ✅ 重新思考繼承關係——草稿不是可列印文件的一種
CLASS zcl_printable_document DEFINITION.  " 可列印的文件
  PUBLIC SECTION.
    METHODS: print.
ENDCLASS.
CLASS zcl_draft DEFINITION.               " 草稿獨立存在
  PUBLIC SECTION.
    METHODS: preview.                     " 只能預覽
ENDCLASS.
```

**判斷準則：**
```
如果子類別無法完全履行父類別的承諾
  → 繼承關係本身就是錯的
  → 改用組合（Composition）
```

**對應 OO 概念：**
- Inheritance：is-a 原則就是 LSP 的實踐

---

### I：Interface Segregation（介面隔離）

**So What（問題）**
Interface 太肥，實作它的 Class 被迫承擔不屬於自己的責任——只能實作一個空方法或拋出例外，這本身就是違反 LSP。

**Now What（回應）**
```abap
" ❌ 肥大的 Interface，草稿被迫實作不需要的方法
INTERFACE zif_document.
  METHODS: print, export_to_pdf, archive, send_email.
ENDINTERFACE.

" ✅ 拆成小的、精確的能力
INTERFACE zif_printable.   METHODS: print.          ENDINTERFACE.
INTERFACE zif_exportable.  METHODS: export_to_pdf.  ENDINTERFACE.
INTERFACE zif_archivable.  METHODS: archive.        ENDINTERFACE.

" 每個 Class 只實作自己真正需要的
CLASS zcl_draft DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_printable.    " 只要這個
ENDCLASS.

CLASS zcl_invoice DEFINITION.
  PUBLIC SECTION.
    INTERFACES: zif_printable, zif_exportable, zif_archivable.
ENDCLASS.
```

**對應 OO 概念：**
- Interface：越小越精確，能力才能真正自由組合

---

### D：Dependency Inversion（依賴反轉）

**So What（問題）**
高層模組直接依賴低層具體實作——低層一改，高層跟著改；無法替換實作；無法測試。

**Now What（回應）**
```abap
" ❌ 直接依賴具體實作
CLASS zcl_order_processor DEFINITION.
  PRIVATE SECTION.
    DATA: mo_mailer TYPE REF TO zcl_smtp_mailer.  " 死綁 SMTP
ENDCLASS.
CLASS zcl_order_processor IMPLEMENTATION.
  METHOD constructor.
    mo_mailer = NEW zcl_smtp_mailer( ).  " 自己 NEW，無法替換
  ENDMETHOD.
ENDCLASS.

" ✅ 依賴抽象，從外面注入（依賴注入）
INTERFACE zif_mailer.
  METHODS: send
    IMPORTING iv_recipient TYPE string
              iv_content   TYPE string.
ENDINTERFACE.

CLASS zcl_order_processor DEFINITION.
  PUBLIC SECTION.
    METHODS: constructor
      IMPORTING io_mailer TYPE REF TO zif_mailer.  " 接受注入
  PRIVATE SECTION.
    DATA: mo_mailer TYPE REF TO zif_mailer.        " 持有抽象
ENDCLASS.

" 呼叫端決定注入哪種實作
NEW zcl_order_processor( io_mailer = NEW zcl_smtp_mailer( ) ).  " 正式
NEW zcl_order_processor( io_mailer = NEW zcl_mock_mailer( ) ).  " 測試
```

**「依賴抽象」的澄清：**
```
SOLID D 說的「抽象」  →  Interface 或 Abstract Class 都算
ABAP 的 ABSTRACT      →  只是其中一種實現抽象的工具

Interface      ✅ 算抽象（完全沒有實作）
Abstract Class ✅ 算抽象（部分沒有實作）
一般 Class     ❌ 不算（有完整實作，是具體的）
```

**對應 OO 概念：**
- Interface：是 DIP 的前提
- 依賴注入（Dependency Injection）：DIP 的具體實踐方式

---

## SOLID 五條的關係

```
S  切出正確邊界
   ↓
O  擴充靠新增，不改現有
   ↓
L  繼承要用對，子類別不破壞承諾
   ↓
I  Interface 切小，能力精確
   ↓
D  依賴抽象，用注入取代內部建立
```

> **S 切邊界，O 和 L 管繼承，I 管 Interface，D 把它們全部串在一起。**

---

## 相關筆記

- [[08-OO-ABAP-1-核心邏輯鏈]]
- [[08-OO-ABAP-4-Factory與Singleton]]
- [[08-OO-ABAP-5-Strategy與Observer]]
- [[08-OO-ABAP-6-TemplateMethod與Facade]]
