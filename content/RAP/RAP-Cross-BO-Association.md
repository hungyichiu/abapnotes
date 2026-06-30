---
tags:
  - abap
  - rap
  - SAP
created: 2026-05-07
status: active
area: resources
publish: true
---

# RAP 跨業務物件關聯 (Cross-BO Associations)

## 1. 核心概念 (Core Concepts)
跨業務物件關聯是指連接兩個隸屬於**不同業務物件（Business Objects, BOs）**實體的關聯。其運作方式模擬了 BO 內部的組成關聯（Compositional Associations）。

- **功能：** 啟用跨 BO 的 `Read-by-Association` 以及 `Create-by-Association`（若有啟用）。
- **重要性：** 定義了受影響實體之間的**事務依賴性 (Transactional Dependencies)**。
- **類別：**
    - **來源解析 (Source-resolved)：** 外鍵（Foreign Key）由關聯的**來源實體**持有。
    - **目標解析 (Target-resolved)：** 外鍵由關聯的**目標實體**持有（即反向外鍵關係）。

---

## 2. 實作類型範例：協作複雜度

| 建模類型 | Create-by-Association 行為 |
| :--- | :--- |
| **來源解析 (Source-resolved)** | 若目標 BO 採用 Early Numbering，建立關聯後需回頭 `Update` 來源實體的外鍵欄位。 |
| **目標解析 (Target-resolved)** | 建立時直接在目標實體填入外鍵，如同填寫一般欄位，流程較簡單。 |

> 在正確建模的情況下，RAP 框架會自動執行來源解析所需的 `Update` 操作。

---

## 3. 關聯定義 (Definition)

### CDS 層級
在 CDS 中，定義方式與一般關聯相同（使用 `ASSOCIATION` 關鍵字）。

### 行為定義 (BDEF) 層級
需在行為定義中宣告，以啟用事務功能：
- **預設功能：** 只要在 BDEF 中定義，預設即啟用 `Read-by-Association`。
- **可選操作：**
    - 標準操作：`Create-by-Association`
    - 非標準操作：`Link action`、`Unlink action`、`Inverse function`

### 反向關聯 (Reverse Association)
- 用於宣告關聯的對手方（來源與目標互換）。
- **限制：** 僅能為「目標解析關聯」定義反向關聯。
- **語法：** 使用 `using` 關鍵字。

---

## 4. 關聯實作 (Implementation)

### A. Managed Associations（受管式）
- **Managed BO：** 框架提供所有事務行為。建議在 BDEF Header 加入 `with cross associations` 以強化語法檢查。
- **Unmanaged BO：** 事務緩衝區由開發者管理，框架處理 Handler 之間的協調。

### B. Unmanaged Associations（非受管式）
無論 BO 類型為何，開發者都必須實作 Handler 之間的協調邏輯。

---

## 5. 操作一覽表

| 操作名稱 | 說明 |
| :--- | :--- |
| **Read-by-Association** | 透過關聯讀取資料（預設啟用） |
| **Create-by-Association** | 透過關聯建立新實體 |
| **Link / Unlink action** | 建立或解除現有實體間的關聯 |
| **Inverse function** | 用於解析反向關係的功能 |
