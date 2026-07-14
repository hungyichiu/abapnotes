---
title: SAP 開發技術筆記
tags: [index, moc]
created: 2026-05-12
status: active
area: system
publish: true
---

# SAP 開發技術筆記

具備 SAP Business One 導入實務與 ABAP 開發經驗的顧問筆記，涵蓋財務模組、報表開發、技術整合與本地化實作。

---

## SAP Business One

以顧問視角記錄的 B1 實戰知識，包含系統架構、財務模組、報表開發與台灣在地化整合。

### 系統架構與導入

- [[02-SAP-B1-安裝升級卸載指南|安裝、升級與完整卸載指南]]
- [[03-DTW-主檔匯入最佳實踐|DTW 資料傳輸工作台：主檔匯入最佳實踐]]

### 報表開發

- [[11-Crystal-Reports-SAP-B1-完整應用指南|Crystal Reports 完整應用指南]]
- [[12-B1-Token機制-報表參數動態化|B1 Token 機制：報表參數動態化]]
- [[14-應收帳款對帳單-資料表到報表|應收帳款對帳單：資料表到報表]]

### 技術整合

- [[15-SAP B1 User Query|User Query：查詢報表、FMS 與核決觸發]]
- [[16-SQL預存程序-卡控與自動化|SQL 預存程序：卡控與自動化]]
- [[17-網銀格式整合-全流程自動化|網銀格式整合：從需求分析到全流程自動化]]

### 授權與使用者管理

- [[24-使用者權限管理|如何設計核准範本]]
- [[25-SAP-B1-授權管理|SAP License Manager：機碼查詢、更新與故障排除]]

### 發票與稅務（台灣本地化）

- [[22-銷項進項扣繳稅設定全攻略|銷項、進項、扣繳稅設定全攻略]]

---

## ABAP 開發

### RICEFW 系列

- [[01-Classic-ALV-1-基礎與版面設定|Classic ALV 第1篇：基礎與版面設定]]
- [[01-Classic-ALV-2-互動與跳轉|Classic ALV 第2篇：互動與跳轉]]
- [[01-Classic-ALV-3-可編輯ALV與資料回寫|Classic ALV 第3篇：可編輯 ALV 與資料回寫]]
- [[02-New-Syntax-1-資料宣告與迴圈|New Syntax 第1篇：資料宣告與迴圈]]
- [[02-New-Syntax-2-條件與表格建構表達式|New Syntax 第2篇：條件與表格建構表達式]]
- [[02-New-Syntax-3-進階表格與物件操作|New Syntax 第3篇：進階表格與物件操作]]
- [[03-Smartforms|Smartforms：採購單批次列印與 control_parameter]]
- [[04-Enhancement-1-總覽與傳統擴充機制|Enhancement 總覽與傳統擴充機制：User Exit 與 Customer Exit]]
- [[04-Enhancement-2-BAdI|BAdI：業務邏輯擴充的現代解法]]
- [[04-Enhancement-3-Enhancement-Framework|Enhancement Framework：Implicit 與 Explicit 擴充]]
- [[04-Enhancement-4-實戰演練與除錯技巧|Enhancement 實戰演練與除錯技巧]]
- [[07-Custom-BAPI|自訂 BAPI 開發：從建表到 Release]]

### OO ABAP 系列

- [[08-OO-ABAP-1-核心邏輯鏈|OO ABAP 核心邏輯鏈]]
- [[08-OO-ABAP-2-命名規則|OO ABAP 命名規則]]
- [[08-OO-ABAP-3-SOLID原則|SOLID 原則]]
- [[08-OO-ABAP-4-Factory與Singleton|設計模式：Factory + Singleton]]
- [[08-OO-ABAP-5-Strategy與Observer|設計模式：Strategy + Observer]]
- [[08-OO-ABAP-6-TemplateMethod與Facade|設計模式：Template Method + Facade]]
- [[08-OO-ABAP-7-BAdI案例|SAP BAdI：用 Template Method 重新理解]]
- [[08-OO-ABAP-8-BAPI案例|SAP BAPI：用 Facade Pattern 重新理解]]

### 工具與搜尋技巧

- [[Find-BAdI|Find BAdI]]
- [[Find-BAPI|Find BAPI]]
- [[SAP-GUI-CheatSheet|SAP GUI Cheat Sheet]]
- [[Editor-SE38-CheatSheet|ABAP Editor（SE38）Cheat Sheet]]

---

## RAP (RESTful ABAP Programming)

- [[RAP-Action|RAP Action：兩層式架構的 Action 開發實戰]]
- [[RAP-Cross-BO|Cross-BO Interaction：跨商務物件互動]]
- [[RAP-Cross-BO-Association|Cross-BO Associations：跨業務物件關聯]]
- [[RAP-ValueHelp|Value Help (F4) 實作指南]]
