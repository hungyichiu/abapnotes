---
title: "RAP 跨商務物件互動 (Cross-BO Interaction)"
tags:
  - abap
  - rap
  - SAP
created: 2026-05-07
status: active
area: resources
publish: true
---

# RAP 跨商務物件互動 (Cross-BO Interaction)

## 為什麼需要跨 BO 互動

實際業務情境很少侷限在單一 Business Object 內——建立一張「差旅訂單」可能需要同步處理「旅行社」主檔，擴充 SAP 標準銷售訂單也可能要串接自訂的物流追蹤資料。RAP 若沒有明確定義跨 BO 的關聯、操作與草稿範圍規則，這類跨物件的資料異動很容易在交易一致性或草稿狀態上出錯，這正是本篇要整理的核心機制。

---

## 1. 核心機制：跨 BO 關聯 (Cross-BO Associations)
跨 BO 場景是指兩個或多個獨立的商務物件（BO）之間進行互動。這主要透過在行為定義（BDEF）中宣告的**跨 BO 關聯**來實現。

### 支援的操作
- **Read-by-Association**: 透過關聯從一個 BO 讀取另一個 BO 的資料。
- **Create-by-Association (CBA)**: 透過來源 BO 的實例直接建立目標 BO 的新實例。
- **Link / Unlink Action**:
    - **Link**: 建立兩個現有 BO 實例之間的連結。
    - **Unlink**: 斷開兩個實例之間的連結。
- **Inverse Function (逆函數)**: 給予目標實體的 Key（外鍵），回傳對應的來源實體實例 Key。

---

## 2. 應用場景 (Use Cases)

| 場景類型 | 說明 | 範例 |
| :--- | :--- | :--- |
| **自定義 BO 互動** | 發生在客戶或合作夥伴自行開發的兩個 BO 之間。 | 在建立「差旅訂單」時，若「旅行社」主檔不存在，可直接同步建立。 |
| **擴充性 (Extensibility)** | 在 SAP 標準 BO 中加入指向自定義 BO 或其他標準 BO 的關聯。 | 擴充 SAP 標準的「銷售訂單」，使其能關聯並編輯自定義的「物流追蹤」BO。 |

---

## 3. 跨 BO 草稿管理 (Cross-BO Draft)
RAP 框架允許草稿狀態跨越 BO 邊界。透過 **Draft Scope** 的定義，系統可以確保主 BO 與從屬 BO 的實例同步進入草稿狀態，防止資料遺失。

### 協同草稿 (Collaborative Draft) 配置規則

| 主 BO (Principal) | 從屬 BO (Dependent) | 配置狀態 | 最終行為描述 |
| :--- | :--- | :--- | :--- |
| **Collaborative** | **Collaborative** | ✅ 有效 | 整體維持協同編輯模式。 |
| **Exclusive** | **Collaborative** | ✅ 有效 | 整體表現為獨佔模式（Exclusive）。 |
| **Collaborative** | **Exclusive** | ❌ 無效 | 此配置不合法，系統無法運作。 |

> [!NOTE]
> 主 BO 的管控等級必須高於或等於從屬 BO。若主 BO 允許大眾協作，但底層從屬 BO 卻要求獨佔鎖定，會造成邏輯衝突。

---

## 4. 實作重點摘要

1. **資料模型層**：需先在 CDS View 中定義指向外部 BO 的 `association`。
2. **行為定義層 (BDEF)**：
    - 在來源實體中定義 `association { create; with draft; }`。
    - 定義 `draft determine action` 以確保草稿範圍（Draft Scope）正確涵蓋目標 BO。
    - 若為擴充場景，需使用 `extension` 語法增加行為描述。
