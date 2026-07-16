---
title: "從 B1 到 S/4HANA：SD 模組開發前必須搞懂的資料表邏輯"
tags:
  - SAP
  - S4HANA
  - SD
created: 2026-07-16
status: active
area: resources
publish: true
source: "[[SAP SD Tables]]"
description: "整理 S/4HANA SD 模組資料表（VBAK/VBAP/VBEP、VBFA）與開發注意事項，對照 B1 銷售流程的資料表差異，快速掌握排程列與單據流追蹤邏輯。"
keywords:
  - S/4HANA SD 模組
  - VBEP 排程列
  - VBFA 單據流
  - VBAK VBAP
  - SAP B1 ORDR RDR1
---

# 從 B1 到 S/4HANA：SD 模組開發前必須搞懂的資料表邏輯

## 前言

從 B1 轉來看 S/4HANA 的 SD 模組，第一次卡關的不是語法，是資料表結構的落差。B1 的銷售流程——報價、訂單、出貨、發票——環節看起來一樣，但 S/4HANA 底層拆得更細，尤其「排程列」這個 B1 完全沒有的概念，第一次查表時完全摸不著頭緒。這篇是實作過程中順手整理的筆記，把 SD 模組的核心資料表跟容易搞混的地方記下來，方便之後回頭查。

---

## 【So What】為什麼要重新理解 SD 資料表結構

B1 的銷售訂單只有單頭單身兩層：`ORDR`（表頭）與 `RDR1`（明細），一筆訂單項目對應一筆明細列，結構直觀。

S/4HANA 則多了一層：`VBAK`（表頭）→ `VBAP`（項目）→ `VBEP`（排程列）。同一個訂單項目（Line Item）可能因為「分批交貨」或「不同交貨日期」，在 `VBEP` 中對應到多筆排程紀錄。這不是資料庫設計上的冗餘，而是因為 S/4HANA 把「客戶要什麼」（訂單項目）和「系統打算怎麼交貨」（排程列）拆成兩個獨立的關注點——後者要處理 ATP（可用性檢查）、物流排程等時間維度的邏輯，勢必需要獨立的表來承載。

搞懂這一層拆分，才能理解為什麼很多 SD 報表要 Join 三張表而不是兩張，也才能正確判讀「訂單有沒有欠貨」這類問題該去哪張表查。

---

## 【What】銷售主資料（Master Data）

SD 模組的銷售主資料分成三類表，各自對應不同的業務面向：

* **`KNA1` / `KNB1` / `KNVV`**：客戶的一般資料、財務資料（依公司代碼）、銷售區域資料（依銷售組織）。同一個客戶在不同銷售組織可能有不同的定價群組，就存在 `KNVV`。
* **`MARA` / `MAKT` / `MVKE`**：物料的一般資料、多語系描述、銷售相關細節（如銷售單位、外幣定價）。
* **`KONH` / `KONP`**：定價條件表頭與明細，決定訂單帶出的價格是怎麼算出來的。

---

## 銷售交易單據：三個階段各對應不同表

### 1. 訂單階段（Sales Order）

* **`VBAK`**：銷售單據表頭。
* **`VBAP`**：銷售單據項目。
* **`VBEP`**：銷售單據排程列（Schedule Lines）。同一項目下的多筆排程用以下欄位區分與管理：

| 欄位 | 說明 |
|---|---|
| `ETENR` | 排程列編號，區分同一項目下不同排程的 Key 值（0001、0002…） |
| `EDATU` | 期望交貨日期 |
| `TDDAT` | 運輸規劃日期，系統計算開始安排物流的日期 |
| `WMENG` | 訂單數量，客戶最初訂購的原始數量 |
| `BMENG` | 確認數量，經 ATP 檢查後系統確認可如期交貨的數量；若為 0 表示目前無庫存可供應該排程 |
| `LIFSP` | 排程凍結，信用風險或資料異常時可在此設置出貨凍結 |

### 2. 出貨階段（Delivery）

* **`LIKP` / `LIPS`**：交貨單的表頭與項目。

### 3. 發票階段（Billing）

* **`VBRK` / `VBRP`**：發票單據的表頭與項目。

---

## 單據流追蹤：VBFA

`VBFA` 是指 S/4HANA SD 模組記錄銷售單據流（Document Flow）的表，記錄了訂單、交貨、發票之間的父子關係，是追蹤「這張訂單後續變成哪張出貨單、哪張發票」的核心表。狀態管理則已整合進 `VBUK` / `VBUP`（標頭與項目狀態）。

在 B1 裡，這種單據關聯是靠 `BaseEntry` / `BaseLine` 欄位一路串起來的隱性鏈式關聯；S/4HANA 則把這層關係獨立成一張表，查詢時不用逐張單據往回追，直接查 `VBFA` 就能拿到完整的單據鏈。

---

## 【What For】開發時的實戰注意事項

**1. Join 順序影響效能**
開發報表時應優先從 `VBAK` 過濾條件（客戶、日期區間），再 Join `VBAP` 與 `VBEP`，避免直接對明細表做全表掃描。

```abap
SELECT vbak~vbeln, vbap~posnr, vbep~edatu, vbep~wmeng, vbep~bmeng
  FROM vbak
  INNER JOIN vbap ON vbap~vbeln = vbak~vbeln
  INNER JOIN vbep ON vbep~vbeln = vbap~vbeln
                  AND vbep~posnr = vbap~posnr
  INTO TABLE @DATA(lt_order_schedule)
  WHERE vbak~erdat >= @lv_date_from.
```

**2. 分批交貨分析，比對 `WMENG` 與 `BMENG`**
若要分析「訂單達交率」，核心邏輯就是比對 `VBEP-WMENG`（需求）與 `VBEP-BMENG`（承諾）的差異，這是判斷欠貨的第一步。

**3. 關聯 Key 速查**
- 訂單項目轉排程：`VBAP-VBELN` = `VBEP-VBELN` 且 `VBAP-POSNR` = `VBEP-POSNR`
- 排程唯一性：`VBELN` + `POSNR` + `ETENR`
- 客戶/物料關聯：`KUNNR`（客戶）、`MATNR`（物料）

**4. 兩個查表小技巧**
- 畫面欄位按 `F1` → 技術資訊，可直接查到對應的 Table 與欄位名稱。
- `SE16N` 查詢 `VBFA` 可快速追蹤單據狀態，不用一張一張單據點開看。

---

## 結論

S/4HANA SD 模組最大的差異，就是把 B1 單頭單身的直觀結構，拆解成表頭、項目、排程列三層，用來承載更細緻的交期與 ATP 邏輯。記住 `VBEP` 的排程列概念跟 `VBFA` 的單據流追蹤，SD 這塊就抓到了。下一篇整理 MM 採購模組，那裡的 `EKBE` 歷史追蹤表又是另一層 B1 沒有的設計邏輯。

---

## 常見問題

**VBEP 是什麼？**
VBEP 是 S/4HANA SD 模組的銷售單據排程列（Schedule Lines）表，記錄同一訂單項目因分批交貨或不同交貨日期產生的多筆排程紀錄，B1 沒有對應的表。

**VBFA 的作用是什麼？**
VBFA（銷售單據流）記錄訂單、交貨、發票之間的父子關係，可用來追蹤一張訂單後續衍生出哪些單據，不用逐張單據往回查。

**WMENG 與 BMENG 差在哪裡？**
WMENG 是客戶原始訂購數量，BMENG 是經 ATP 檢查後系統確認可如期交貨的數量，比對兩者的差異可以判斷訂單是否欠貨。
