---
title: "Find BAPI"
tags:
  - ABAP
  - wiki
  - BAPI
  - Interface
created: 2026-06-29
status: active
area: wiki
publish: true
sources:
  - "[[BAPI - Introduction]]"
  - "[[BAPI - Comparison of Customized BAPI with SAP BAPI]]"
  - "[[BAPI - Tables and Functions of Business Objects]]"
---

# Find BAPI

> 外部系統要呼叫 SAP 的業務邏輯（建立訂單、過帳、查詢主檔），找到正確的 BAPI 是整合開發的第一步。

---

## 方法一：BAPI Explorer（最直覺）

交易碼 **BAPI** 開啟 BAPI Explorer，以業務物件（Business Object）樹狀瀏覽：

- 展開對應模組（`SalesOrder`、`PurchaseOrder`、`Material`）
- 查看 Methods 清單，每個 Method 對應一支 Function Module
- 雙擊 Method 查看詳細說明與輸入輸出參數

---

## 方法二：SE37 關鍵字搜尋（最快）

SAP 標準 BAPI 命名有規律：`BAPI_[物件]_[動作]`。直接在 **SE37** 搜尋：

- `BAPI_SALESORDER_*` → 銷售訂單
- `BAPI_MATERIAL_*` → 物料主檔
- `BAPI_PO_*` → 採購單

找到 FM 後，查看 RETURN Table 的說明確認功能符合需求。

---

## 方法三：SWO1 查業務物件

交易碼 **SWO1**（Business Object Repository）可依業務物件編號查詢（例如 `BUS2032` = Sales Order），在 Methods 頁籤看到該物件開放的所有 BAPI，適合需要全覽某個業務物件完整介面的情境。

---

## 驗證才整合

找到候選 BAPI 後，在 SE37 按 **F8** 進入測試模式，手動填入參數實際執行，確認 RETURN Table 回傳 `S`（Success）後再正式整合進程式。

> BAPI 呼叫後必須執行 `COMMIT WORK`，資料才會真正寫入 SAP。忘記 COMMIT 是最常見的新手錯誤——測試時資料看起來消失了，通常就是這個原因。

---

## 相關概念

- [[BAPI - Introduction]] — BAPI 基礎概念與 BOR 架構
- [[BAPI - Comparison of Customized BAPI with SAP BAPI]] — 客製 BAPI vs 標準 BAPI 比較

---
*由 LLM 從來源筆記編譯，最後人工審閱：2026-06-29*
