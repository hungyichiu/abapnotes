---
title: "ABAP Editor（SE38）Cheat Sheet"
tags:
  - SAP
  - ABAP
  - SE38
  - cheatsheet
created: 2026-05-14
status: active
area: resources
publish: true
---

# ABAP Editor（SE38）Cheat Sheet

> SE38 是 ABAP 開發的主要入口，涵蓋程式碼編輯、版本管理與 T-Code 建立。

---

## Editor Options 推薦設定

進入路徑：**SE38 → Utilities → Settings**

### Fonts and Colors

勾選 **Show only monospaced fonts**

- 等寬字型讓程式碼縱向對齊，大幅提升閱讀舒適度
- 推薦字型：`Courier New`、`Consolas`

![[ABAP Editor Setting - SE38_option.png]]

### Code Completion

| 設定 | 建議值 | 說明 |
|------|--------|------|
| Show tooltip on hover | 5ms | 游標停留後顯示說明 |
| Open completion automatically | 5ms | 自動彈出補全選單 |
| Use simple autocompletion | 勾選 | 不查字典，速度更快 |

![[ABAP Editor Setting - SE38_Code Completion.png]]

### Code Template

預設 template 可快速插入常用程式碼片段（`IF`、`LOOP`、`SELECT` 等）。

![[ABAP Editor Setting - SE38_code_template.png]]

---

## Version Management

### 查看歷史版本

**Utilities → Versions → Version Management**

![[ABAP Editor Setting - SE38_version.png]]

每次 Activate 時系統自動建立版本，可比對差異或還原舊版。

![[ABAP Editor Setting - SE38_version_management-1.png]]

---

## 建立 T-Code（SE80）

將現有程式綁定自訂 T-Code，方便使用者直接執行。

1. 進入 **SE80 → Transaction Code**
2. 輸入新的 T-Code 名稱（建議以 `Z` 開頭）
3. 填入對應的 Program Name

![[ABAP Editor Setting - SE38_Create_T-code.png]]
![[ABAP Editor Setting - SE38_create_transction.png]]

---

## 常用快速鍵

| 操作 | 快速鍵 |
|------|--------|
| Activate（儲存並啟用）| `Ctrl + F3` |
| Check（語法檢查）| `Ctrl + F2` |
| Pretty Printer（排版）| `Shift + F1` |
| 執行程式 | `F8` |

---

## Tips

- `DD02L`：記錄所有 Table，可在此查詢資料表結構
- `ST22`：ABAP Runtime Error Browser，執行錯誤第一個查這裡
- `COMPUTER` 是 ABAP 中唯一可省略的 Statement
- Functional Programming 模式中沒有 `NULL` 概念
- Dialog Message 語法：`MESSAGE s000(oo) WITH 'text'.`
