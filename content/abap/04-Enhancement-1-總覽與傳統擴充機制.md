---
title: "Enhancement 總覽與傳統擴充機制：User Exit 與 Customer Exit"
description: "Enhancement 系列第 1 篇，整理四個世代的擴充機制，並詳述 User Exit（MV45AFZZ）與 Customer Exit（SMOD、CMOD）的找法與啟用，附四種找擴充點的方法，接手舊程式時照這份查。"
keywords:
  - SAP Enhancement
  - User Exit
  - Customer Exit
  - SMOD CMOD
  - MV45AFZZ
tags:
  - SAP
  - ABAP
  - Enhancement
created: 2026-05-15
status: active
area: public
publish: false
source:
  - "[[ABAP-學習-開發核心：RICEFW 學習路徑指南]]"
  - "[[ABAP-課程-4. Modularization Tech]]"
---

> Enhancement 系列共三篇：總覽與傳統擴充機制(本篇)→ [[04-Enhancement-2-BAdI|BAdI]] → [[04-Enhancement-3-Enhancement-Framework|Enhancement Framework]]

## 【So What】問題情境

SAP 標準程式有其固定的業務邏輯。客戶通常有額外需求：「採購單儲存前，必須檢查是否有對應的預算科目」、「業務夥伴建立時，自動帶出稅籍編號格式驗證」。

直接修改標準程式（修改 SAP 原始碼）是禁忌。每次系統升級都可能覆蓋你的修改，SAP 也不支援這樣的客戶化。

正確的做法是使用 **Enhancement（擴充）**：在 SAP 提供的預留掛接點加入自訂邏輯，標準程式保持不變，自訂邏輯獨立管理。

---

## 【What】四個世代的擴充機制

SAP 的擴充機制有四個演進世代，現場仍會同時遇到：

| 世代 | 技術 | 特性 |
|------|------|------|
| 第一代 | **User Exit** | 硬編碼在標準程式中的空 FORM，直接填入邏輯 |
| 第二代 | **Customer Exit**（SMOD/CMOD） | 由 SAP 定義的 exit，需透過 project 啟用 |
| 第三代 | **BAdI**（Business Add-In） | 底層是 Interface，支援多個 Implementation 與 Filter 切換 |
| 第四代 | **Enhancement Framework** | 彈性最高，支援 Implicit/Explicit 兩種掛載方式 |

第三代見 [[04-Enhancement-2-BAdI]]，第四代見 [[04-Enhancement-3-Enhancement-Framework]]。

本篇聚焦第一、二代的 User Exit 與 Customer Exit。這兩代機制較舊、篇幅也不大，放在同一篇一起說明。

現代新開發優先考慮 BAdI 或 Enhancement Framework。但接手既有系統的維護案（MA）時，舊系統仍大量使用第一、二代，必須都能識別。

---

## 第一代：User Exit

User Exit 是 SAP 在標準程式中預先挖好的空 FORM，通常長這樣：

```abap
*-------------------------------------------------------------*
* FORM USER_EXIT_FIELD_MODIFICATION
*-------------------------------------------------------------*
FORM user_exit_field_modification.
* customer-specific field modification
ENDFORM.
```

你只需要找到對應的 include，在 FORM 中填入邏輯即可。修改後需要 Activate（Ctrl+F3）。

**找 User Exit 的方式**：
- 用 SE38 開啟標準程式，搜尋 `FORM USEREXIT_`
- SD 模組的 User Exit 集中在幾個固定 include：`MV45AFZZ`（銷售訂單）、`MV50AFZZ`（交貨）、`RV60AFZZ`（開票）
- 在 SAP 社群或官方文件搜尋程式名稱 + "user exit"

**限制**：
- User Exit 由 SAP 硬編碼在程式中，數量有限，並非每個流程都有。
- 這些 include 是 SAP 命名空間的物件，第一次修改要向 SAP 申請 SSCR 物件金鑰（Object Access Key）。

---

## 第二代：Customer Exit（SMOD / CMOD）

Customer Exit 是 SAP 正式定義的擴充點，透過 **exit component** 管理，需要建立 project 才能啟用。

### 找到適合的 Exit

```
交易碼 SMOD → 輸入關鍵字（如程式名稱、模組縮寫）→ 搜尋可用的 exit
```

每個 exit component 有三種類型：
- **Function Exit**：在 Function Module 中掛入邏輯（最常見）
- **Menu Exit**：在選單列加入自訂項目
- **Screen Exit**：在畫面上加入自訂欄位

### 啟用 Exit（CMOD）

```
交易碼 CMOD → 建立 Project → 將 exit component 加入 project → 啟用（Activate）
```

啟用後，對應的 include 才會被系統呼叫。

**怎麼看出 include 名稱**：標準程式用 `CALL CUSTOMER-FUNCTION '012'` 呼叫 exit，對應的 Function Module 是 `EXIT_<程式名>_012`。用 SE37 打開這個 FM，裡面只有一行 `INCLUDE ZX…`，那就是你要寫邏輯的地方。ZX 開頭的 include 屬於客戶命名空間，可以直接建立。

以採購單 ME21N 儲存前檢查為例，exit 是 `EXIT_SAPMM06E_012`，include 是 `ZXM06U43`，裡面就是純 ABAP：

```abap
*&-------------------------------------------------------------*
*& Include  ZXM06U43    " EXIT_SAPMM06E_012 的 include
*&-------------------------------------------------------------*
" i_ekko 是 exit FM 的 IMPORTING 參數，看 SE37 的介面就知道有哪些可以用
IF i_ekko-bsart = 'ZNB' AND i_ekko-zterm IS INITIAL.
  MESSAGE e001(zmm) WITH '採購單類型 ZNB 必須填付款條件'.
ENDIF.
```

這裡不會出現 `ENHANCEMENT … ENDENHANCEMENT`，那是第四代 Enhancement Framework 的語法，見 [[04-Enhancement-3-Enhancement-Framework]]。

---

## 【What For】如何找到正確的擴充點

找到對的擴充點是 Enhancement 中最難的部分。下面四個方法各有適用的世代。

**方法一：Debug 追蹤（四代通用）**
1. 在交易碼輸入 `/h` 開啟 debugger，或先在 SE38 設好 breakpoint
2. 操作到目標功能（例如按儲存）
3. 單步執行（F5/F6/F7），觀察程式經過的 include、FORM、`CALL CUSTOMER-FUNCTION` 和 `ENHANCEMENT-POINT`
4. 在經過的位置裡挑一個時機對的 exit 或擴充點

**方法二：SMOD 依套件找（第二代）**
1. 用 SE93 查交易碼對應的程式，再查程式所屬的 Package
2. `SMOD → Utilities → Find`，用 Package 當條件列出這個套件的所有 exit

**方法三：SE80 搜尋 Enhancement Spots（第三、四代）**
```
SE80 → 選取 Package → Enhancements → Enhancement Spots
```
第一、二代不叫 Spot，這個方法找不到它們。

**方法四：SAP 社群（四代通用）**
在 SAP Community（community.sap.com）搜尋 `<程式名稱> exit`，通常有人整理過可用的 exit 清單。

---

## 常見陷阱

**陷阱一：啟用後忘記 Activate**

Customer Exit 要 Activate 兩個東西才會生效，缺一個都沒反應。

1. ZX include 本身（SE38 裡 Ctrl+F3）。
2. CMOD 的 project（CMOD 裡 Activate）。

症狀是修改後測試完全沒有反應，先檢查這兩個。

**陷阱二：影響範圍未充分測試**

User Exit 和 Customer Exit 掛在標準流程中，一旦啟用就影響所有使用這個程式的使用者和流程。上線前必須在 QA 環境完整測試，特別是邊界條件（空值、特殊字元、大量資料）。

**陷阱三：Transport 時遺漏 project**

Customer Exit 的 CMOD project 需要被正確納入 Transport Request，遺漏會導致上線後 Customer Exit 沒有生效。

---

## 實作提醒

- **接手維護案先清查現有 exit**：在 CMOD 查看已啟用的 project，避免改到別人已有的邏輯
- **命名規範**：Exit 相關命名建議包含業務說明，而非流水號
- **新專案優先考慮 BAdI 或 Enhancement Framework**，理由有三個。
	- User Exit 數量有限。
	- Customer Exit 只能有一個實作。
	- 兩代的語意都不如後兩代清楚。
	- 詳見 [[04-Enhancement-2-BAdI|BAdI]] 與 [[04-Enhancement-3-Enhancement-Framework|Enhancement Framework]]。

---

## 系列導覽

**下一篇**：[[04-Enhancement-2-BAdI]]
