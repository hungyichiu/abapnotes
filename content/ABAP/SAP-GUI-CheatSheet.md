---
tags:
  - SAP
  - ABAP
  - SAP-GUI
  - cheatsheet
created: 2026-05-14
status: active
area: resources
publish: true
---

# SAP GUI Cheat Sheet

> 涵蓋 SAP GUI 安裝後的常用設定與操作入口，適合初次設定或換電腦時快速對照。

---

## 新增系統連線

1. 開啟 SAP Logon，點擊 **New** 新增項目
2. 填入 System ID、Application Server、Instance Number
3. 儲存後雙擊連線即可登入

![[SAP GUI-3.png]]

---

## SAP Logon 選項設定

### 變更登入語言

**Options → SAP Logon Options → Language**

- 預設語言影響登入後的 UI 語系
- 建議設為 `ZF`（繁體中文）或 `EN`（英文）

![[SAP GUI-18.png]]

### 變更佈景主題

**Options → Visual Design → Theme Selection**

![[SAP GUI-1.png]]

常用主題：

| Theme | 特性 |
|-------|------|
| Belize | 現代扁平風，SAP 預設 |
| Corbu | 高對比，閱讀舒適 |
| Classic | 傳統 SAP 灰色介面 |

![[SAP GUI-2.png]]

### Interaction Design

**Options → Interaction Design → Visualization**

- **Controls**：調整按鈕與輸入框的視覺樣式
- **Window Title**：顯示完整 T-Code 與系統名稱於標題列
- **Enhanced Search**：啟用欄位內的快速搜尋功能

![[SAP GUI-10.png]]
![[SAP GUI-11.png]]

---

## SAP Easy Access 主選單

登入後的起始畫面，常用操作：

![[SAP GUI-6.png]]

### 顯示 T-Code 技術名稱

**Extras → Settings → Display Technical Names**

啟用後選單項目會顯示對應的 T-Code。

![[SAP GUI-8.png]]

### 在 System Info 區搜尋 T-Code

畫面右下角 Status Bar 可顯示目前所在的 T-Code。

![[SAP GUI-9.png]]

---

## User Profile 設定

**System → User Profile → Own Data**

![[SAP GUI-13.png]]

| 欄位 | 說明 |
|------|------|
| Logon Language | 個人預設語言 |
| Decimal Notation | 小數點格式（`1.234,56` 或 `1,234.56`）|
| Date Format | 日期格式（`DD.MM.YYYY` / `MM/DD/YYYY`）|

![[SAP GUI-14.png]]

---

## 建立報表程式（SE38）

### Attributes — Type 說明

| Type | 用途 |
|------|------|
| `1` – Executable Program | 一般可執行報表，最常用 |
| `M` – Module Pool | Dialog 程式（搭配 Screen） |
| `F` – Function Group | 放置 Function Module |

![[SAP GUI-15.png]]
![[SAP GUI-16.png]]

### Package 與 Local Object

- **Local Object**：自動填入 `$TMP`，不綁 Change Request，適合測試
- **指派 Package**：之後必須綁定 Change Request，無法改回 Local Object

![[Pasted image 20260513100100.png]]

---

## Restore & Cleanup

重設 GUI 設定至預設值：**Options → Restore & Cleanup**

![[SAP GUI-12.png]]
