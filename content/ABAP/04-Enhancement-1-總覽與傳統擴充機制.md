---
title: "Enhancement 總覽與傳統擴充機制：User Exit 與 Customer Exit"
tags:
  - SAP
  - ABAP
  - Enhancement
created: 2026-05-15
status: active
area: resources
publish: true
---

# Enhancement 總覽與傳統擴充機制：User Exit 與 Customer Exit

> Enhancement 系列共三篇：總覽與傳統擴充機制(本篇)→ [[04-Enhancement-2-BAdI|BAdI]] → [[04-Enhancement-3-Enhancement-Framework|Enhancement Framework]]

## 問題情境

SAP 標準程式有其固定的業務邏輯。客戶通常有額外需求：「採購單儲存前，必須檢查是否有對應的預算科目」、「業務夥伴建立時，自動帶出稅籍編號格式驗證」。

直接修改標準程式（修改 SAP 原始碼）是禁忌——每次系統升級都可能覆蓋你的修改，SAP 也不支援這樣的客戶化。

正確的做法是使用 **Enhancement（擴充）**：在 SAP 提供的預留掛接點加入自訂邏輯，標準程式保持不變，自訂邏輯獨立管理。

---

## 四個世代的擴充機制

SAP 的擴充機制有四個演進世代，現場仍會同時遇到：

| 世代 | 技術 | 特性 |
|------|------|------|
| 第一代 | **User Exit** | 硬編碼在標準程式中的空 FORM，直接填入邏輯 |
| 第二代 | **Customer Exit**（SMOD/CMOD） | 由 SAP 定義的 exit，需透過 project 啟用 |
| 第三代 | **BAdI**（Business Add-In） | 底層是 Interface，支援多個 Implementation 與 Filter 切換，詳見 [[04-Enhancement-2-BAdI]] |
| 第四代 | **Enhancement Framework** | 彈性最高，支援 Implicit/Explicit 兩種掛載方式，詳見 [[04-Enhancement-3-Enhancement-Framework]] |

本篇聚焦第一、二代——User Exit 與 Customer Exit，這兩代機制較舊、篇幅也不大，放在同一篇一起說明。現代新開發優先考慮 BAdI 或 Enhancement Framework，但接手 MA 案時，舊系統仍大量使用第一、二代，必須都能識別。

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
- 用 SE38 開啟標準程式，搜尋 `CALL CUSTOMER-FUNCTION` 或 `FORM USER_EXIT`
- 在 SAP 社群或官方文件搜尋程式名稱 + "user exit"

**限制**：User Exit 由 SAP 硬編碼在程式中，數量有限，並非每個流程都有。

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

啟用後，對應的 include 才會被系統呼叫。找到 include 後，在其中撰寫邏輯：

```abap
*&-------------------------------------------------------------*
*& Include  ZXBADIU01   " 對應 exit 的 include
*&-------------------------------------------------------------*

ENHANCEMENT 0  Z_MY_EXIT.
  " 在這裡加入你的邏輯
  IF <ls_bseg>-hkont = '4110000'.
    MESSAGE e001(z_custom) WITH '此科目不允許手動輸入'.
  ENDIF.
ENDENHANCEMENT.
```

---

## 如何找到正確的擴充點

這套方法適用於四個世代都通用，找到對的擴充點是 Enhancement 中最難的部分：

**方法一：Debug 追蹤**
1. 開啟 Developer Mode（SAP Logon → Customizing → Expert Mode）
2. 在目標功能前設定 breakpoint
3. 單步執行（F5/F6/F7），觀察程式呼叫的 include 和 FORM
4. 在適合的位置找 Enhancement Spot

**方法二：SE80 搜尋**
```
SE80 → 選取 Package → 搜尋 "Enhancement Spots"
```

**方法三：交易碼 SPRO 追蹤**
在 Customizing 中找到對應業務流程，通常有文件說明可用的 exit。

**方法四：SAP 社群**
在 SAP Community（community.sap.com）搜尋 `<程式名稱> exit`，通常有人整理過可用的 exit 清單。

---

## 常見陷阱

**陷阱一：啟用後忘記 Activate**

Customer Exit 撰寫完成後，必須 Activate（Ctrl+F3）才會生效。忘記 Activate 是最常見的錯誤，症狀是修改後測試完全沒有反應。

**陷阱二：影響範圍未充分測試**

User Exit 和 Customer Exit 掛在標準流程中，一旦啟用就影響所有使用這個程式的使用者和流程。上線前必須在 QA 環境完整測試，特別是邊界條件（空值、特殊字元、大量資料）。

**陷阱三：Transport 時遺漏 project**

Customer Exit 的 CMOD project 需要被正確納入 Transport Request，遺漏會導致上線後 Customer Exit 沒有生效。

---

## 實作提醒

- **接手 MA 案先清查現有 exit**：在 CMOD 查看已啟用的 project，避免改到別人已有的邏輯
- **命名規範**：Exit 相關命名建議包含業務說明，而非流水號
- **新專案優先考慮 BAdI 或 Enhancement Framework**：User Exit 數量有限、Customer Exit 只能有一個實作，語意也不如後兩代清楚，詳見 [[04-Enhancement-2-BAdI|BAdI]] 與 [[04-Enhancement-3-Enhancement-Framework|Enhancement Framework]]

---

## 來源筆記

- [[SAP ABAP 開發核心：RICEFW 學習路徑指南]]
- [[4. Modularization Tech]]

**下一篇**：[[04-Enhancement-2-BAdI]]
