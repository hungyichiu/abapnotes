---
title: "OO ABAP 核心邏輯鏈"
tags:
  - ABAP
  - OOP
  - DesignPattern
created: 2026-07-14
status: active
area: resources
publish: true
---

# OO ABAP 核心邏輯鏈

> OO ABAP 系列第 1 篇，共 8 篇：本篇：核心邏輯鏈 → [[08-OO-ABAP-2-命名規則|下一篇：命名規則]]


---

## What：OO ABAP 是什麼？

一套讓程式碼「把資料和操作它的邏輯綁在一起」的設計方式。

核心只有一句話：

> **讓「容易改變的東西」不影響「依賴它的東西」**

所有 OO 概念——Class、Interface、繼承、多型——都從這裡派生出來。

---

## So What：不用 OO 會怎樣？

Procedural ABAP 的三個根本傷：

**① 資料沒有歸屬感**
`gv_total` 是誰的？程式裡任何一個 FORM 都能改它。兩張訂單同時存在，只能宣告兩組全域變數，變數爆炸。

**② 邏輯沒有邊界**
`PERFORM calculate_total` 可以在任何地方宣告、任何地方呼叫，沒有任何機制說「這段邏輯只能操作這份資料」。

**③ 複用靠複製貼上**
想要「同樣邏輯但行為稍微不同」，只能複製一份再改。多份邏輯並行，維護地獄。

---

## Now What：OO 的七層回應

每一層都在解決上一層留下的問題：

```
問題：資料和邏輯四散
  └─→ 【第一層：Class】用 Class 綁定，DEFINITION 說 What，IMPLEMENTATION 說 How

問題：光綁定還不夠，沒有守門機制
  └─→ 【第二層：Visibility】PRIVATE 預設，PUBLIC 越少越穩定，PROTECTED 給繼承用

問題：「是同一類東西」這個事實只存在腦子裡
  └─→ 【第三層：Inheritance】INHERITING FROM 把 is-a 寫進語言，共用邏輯自動帶入

問題：呼叫端還是耦合在父類別上
  └─→ 【第四層：Polymorphism + Interface】依賴能力（can-do），不依賴身份（is-a）

問題：有共用邏輯，但某些步驟父類別給不出預設值
  └─→ 【第五層：Abstract Class】骨架定死，可變步驟強制子類別填入

問題：不是所有東西都需要物件
  └─→ 【第六層：Static vs Instance】有狀態用 Instance，無狀態用 Static

問題：錯誤可以被無視
  └─→ 【第七層：Exception】錯誤是物件，RAISING 寫進合約，強制面對
```

---

## OO 概念與 SOLID 是同一件事

OO 給你工具，SOLID 告訴你用對工具的判斷準則——它們從來就不是兩件事：

```
Class + Visibility  ←→  S：切出正確邊界，封裝才有意義
Inheritance         ←→  L：is-a 原則就是 LSP 的實踐
Interface + 多型    ←→  I + D：依賴抽象，能力自由組合
Abstract Class      ←→  O：擴充靠新增，骨架不動
Static vs Instance  ←→  S：有狀態和無狀態職責分清楚
Exception           ←→  S：錯誤處理是獨立職責
```

---

## 相關筆記

- [[08-OO-ABAP-2-命名規則]]
- [[08-OO-ABAP-3-SOLID原則]]
- [[08-OO-ABAP-4-Factory與Singleton]]
- [[08-OO-ABAP-5-Strategy與Observer]]
- [[08-OO-ABAP-6-TemplateMethod與Facade]]
