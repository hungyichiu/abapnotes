---
title: "SAP BAdI：用 Template Method 重新理解"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# SAP BAdI：用 Template Method 重新理解

> OO ABAP 系列第 7 篇，共 8 篇：[[08-OO-ABAP-6-TemplateMethod與Facade|上一篇：Template Method 與 Facade]] → 本篇：BAdI 案例 → [[08-OO-ABAP-8-BAPI案例|下一篇：BAPI 案例]]


---

## What：BAdI 是什麼？

BAdI（Business Add-In）是 SAP 提供的客製化擴充框架，讓你在不修改標準程式的前提下，插入自己的業務邏輯。

**用設計模式的語言說：**

> **BAdI 是 SAP 把 Template Method Pattern 做成框架的結果。**

```
Template Method 概念       BAdI 的對應
────────────────────────────────────────────
Abstract Class（父類別） = SAP 標準程式
process( )（流程骨架）   = 標準業務流程
ABSTRACT Method          = BAdI Definition（擴充點合約）
PROTECTED Section        = Enhancement Spot（留給你的縫隙）
子類別 REDEFINITION      = BAdI Implementation（你的實作）
```

---

## So What：為什麼 SAP 要用這個設計？

SAP 面臨一個根本矛盾：

```
問題：每個客戶的業務邏輯不一樣
      但 SAP 不能讓你直接改標準程式——改了就無法升級

解法：在流程骨架的特定步驟留下「你來填」的擴充點
      這正是 Template Method 的核心思想
```

**SOLID 的體現：**
```
O（開放封閉） →  SAP 標準程式對修改封閉
               你透過 BAdI Implementation 擴充，不改標準
               這是 OCP 的完美實踐

L（里氏替換） →  你的 Implementation 必須符合 BAdI Interface 的語義
               不能破壞標準流程的邏輯合約

D（依賴反轉） →  標準程式依賴 BAdI Interface（抽象）
               不依賴你的具體 Implementation
```

---

## Now What：BAdI 的完整流程與實作

### SAP 標準程式內部邏輯（相當於 Abstract Class）

```abap
" SAP 標準採購單建立流程（你看不到，但邏輯是這樣）
METHOD create_purchase_order.   " 相當於 process()，骨架鎖死

  validate_data( ).             " 標準驗證邏輯

  " ↓ Enhancement Spot（相當於 PROTECTED ABSTRACT Method）
  cl_exithandler=>get_instance( CHANGING instance = lo_badi ).
  lo_badi->check_purchase_order(     " 呼叫你實作的方法
    IMPORTING im_header = ls_header ).

  determine_vendor( ).          " 標準決定供應商

  " ↓ Enhancement Spot
  lo_badi->process_vendor( CHANGING ch_vendor = lv_vendor ).

  create_record( ).             " 標準建立記錄（你改不了）
  update_stock( ).              " 標準更新庫存（你改不了）

ENDMETHOD.
```

### 你的 BAdI Implementation（相當於子類別）

```abap
" 你只需要填入自己的步驟，骨架完全不用管
CLASS zcl_my_badi_impl DEFINITION.
  PUBLIC SECTION.
    INTERFACES: if_ex_me_purchreq_release.  " BAdI Interface（合約）
ENDCLASS.

CLASS zcl_my_badi_impl IMPLEMENTATION.

  " 對應 ABSTRACT Method：必須實作
  METHOD if_ex_me_purchreq_release~check_purchase_order.
    " 你的自訂驗證邏輯
    IF im_header-vendor IS INITIAL.
      RAISE EXCEPTION TYPE zcx_invalid_po.
    ENDIF.
  ENDMETHOD.

  " 對應 ABSTRACT Method：必須實作
  METHOD if_ex_me_purchreq_release~process_vendor.
    " 你的供應商決定邏輯
    IF ch_vendor = '0000001234'.
      ch_vendor = '0000005678'.
    ENDIF.
  ENDMETHOD.

ENDCLASS.
```

### BAdI 的完整流程

```
1. SAP 定義 BAdI Definition（等於宣告 ABSTRACT Method 的合約）
        │
2. 你建立 BAdI Implementation（等於撰寫子類別）
   SE18 定義 / SE19 實作
        │
3. 系統啟動時，SAP 主流程自動找到你的 Implementation
   （等於多型：父類別參考，實際執行子類別的版本）
        │
4. 流程執行到 Enhancement Spot 時
   自動呼叫你的方法（等於 ABSTRACT Method 被觸發）
```

---

### BAdI vs Enhancement Framework 的差別

```
BAdI（Business Add-In）
  → 物件導向的擴充機制
  → 你實作一個 Class（子類別概念）
  → 可以有多個 Implementation（Multi-Use BAdI）
  → 適合：需要完整邏輯替換的場景
  → 對應：Template Method 的子類別 REDEFINITION

Enhancement Spot / Section / Point
  → 更輕量的擴充機制
  → 你直接插入程式碼片段
  → 相當於在 PROTECTED Method 裡加幾行
  → 適合：只需要插入少量程式碼的場景
```

---

## 面試一句話

> **BAdI 讓我理解 Template Method——SAP 是父類別，我的 Implementation 是子類別，BAdI Interface 是強制我實作的 ABSTRACT Method。它保證了 OCP：標準程式對修改封閉，對擴充開放。**

---

## 相關筆記

- [[08-OO-ABAP-1-核心邏輯鏈]]
- [[08-OO-ABAP-3-SOLID原則]]
- [[08-OO-ABAP-6-TemplateMethod與Facade]]
- [[08-OO-ABAP-8-BAPI案例]]
