---
title: "SAP 開發環境速記：Client、命名規則、T-Code、工具"
tags:
  - SAP
  - ABAP
created: 2026-07-16
status: active
area: resources
publish: true
source: "[[ABAP開發簡介]], [[01. Basic of SAP and ABAP]]"
description: "整理 SAP 開發環境基礎：Client 與 MANDT 概念、Package 命名前綴、Transaction Code 操作慣例、ABAP Workbench 工具總覽，開發前快速掌握這幾個必懂規則。"
keywords:
  - SAP 開發環境
  - Client MANDT
  - Package 命名前綴
  - Transaction Code
  - ABAP Workbench
---

# SAP 開發環境速記：Client、命名規則、T-Code、工具

## Client（用戶端）

Client 是指同一套 SAP 系統下的邏輯隔離單位，用三位數字代碼識別（如 100、800）。

- 技術欄位：`MANDT`，主檔表：`T000`
- 表沒帶 `MANDT` → Client-independent（跨用戶端共用），大部分業務表不該這樣設計
- 新手常犯錯：建自訂表忘記加 `MANDT`，導致不同 Client 的資料混在一起

## Package 命名前綴

Package 命名前綴是指 ABAP 物件（Package、Table、Program 等）名稱開頭字母代表的用途分類。

- `A-S`、`U-X`：系統原生（SAP 標準物件）
- `Y`、`Z`：開發使用（客戶自訂物件）
- `T`：測試
- `$`：暫存，例如 `$TMP`

看到前綴就能判斷這是 SAP 標準還是客戶自訂——`Z`/`Y` 開頭才是能動的，其他原則上不直接改。

## Transaction Code 操作慣例

Transaction Code（T-Code）是存取 SAP 功能的捷徑代碼，編號有慣例可循：`01` Create、`02` Change、`03` Display（例：`VA01`/`VA02`/`VA03` = 銷售訂單建立/修改/顯示）。

指令前綴（`/n` 和 `/o` 各有「單獨使用」與「加代碼」兩種形式，邏輯相同、差別只在要不要直接跳轉）：
- `/n`：結束目前交易，回到起始畫面
- `/nxxxx`：同樣結束目前交易，但直接跳轉執行 xxxx，不用先回起始畫面再輸入
- `/o`：開一個新視窗（session）
- `/oxxxx`：開新視窗並直接執行 xxxx
- `/nend`：結束所有 session 並離開（有確認視窗）
- `/nex`：結束所有 session 並離開（無確認視窗）
- `/h`：開啟除錯模式

同時最多開 6 個 session。

## ABAP Workbench 工具總覽

ABAP Workbench 是指開發 ABAP 程式所需的一整套工具集合，各自對應不同的 T-Code：

| 工具 | T-Code | 用途 |
|---|---|---|
| ABAP Editor | `SE38` | 撰寫程式/報表 |
| ABAP Dictionary | `SE11` | 定義資料表、Domain、Data Element |
| Function Builder | `SE37` | 建立 Function Module |
| Class Builder | `SE24` | 建立 OO ABAP 類別 |
| Object Navigator | `SE80` | 整合式環境，瀏覽 Package 底下所有物件 |

兩個查詢輔助鍵：`F1` 欄位技術資訊（對應 Table、Data Element）、`F4` 欄位可能值（Value Help）。

---

## 常見問題

**MANDT 是什麼？**
MANDT 是 SAP 用來標記 Client（用戶端）的技術欄位，資料表如果沒有這個欄位，就無法依用戶端隔離資料。

**Z 開頭的物件代表什麼？**
Z（或 Y）開頭代表客戶自訂物件，是開發者可以自由建立與修改的範圍；其他前綴多半是 SAP 標準物件，不建議直接修改。

**`/n` 跟 `/nxxxx` 差在哪？**
`/n` 單獨使用是結束目前交易、回到起始畫面；`/nxxxx` 是同樣的邏輯但直接跳轉執行代碼 xxxx，不用先回起始畫面再輸入。
