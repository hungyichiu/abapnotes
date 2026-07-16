---
title: "從 B1 到 S/4HANA：採購模組裡最容易被忽略的一張表"
tags:
  - SAP
  - S4HANA
  - MM
created: 2026-07-16
status: active
area: resources
publish: true
source: "[[SAP MM Tables]]"
description: "拆解 S/4HANA MM 模組的採購資料表與 EKBE 歷史追蹤表判讀邏輯（VGABE/SHKZG/BWART），對照 B1 採購單據鏈的差異，掌握開發時的關聯 Key 與效能注意事項。"
keywords:
  - S/4HANA MM 模組
  - EKBE 歷史追蹤表
  - VGABE SHKZG BWART
  - EKKO EKPO
  - SAP B1 採購單
---

# 從 B1 到 S/4HANA：採購模組裡最容易被忽略的一張表

## 前言

SAP Business One 的採購流程——請購、採購單、收貨、發票——每個環節之間靠著 `BaseEntry` / `BaseLine` 欄位一路串接回去，查一張發票就能往回追到它是從哪張採購單、哪張收貨單長出來的。S/4HANA 的 MM 模組看起來環節相同，但多了一張 B1 完全沒有對應概念的表——`EKBE`。搞不懂這張表，就看不懂一張採購單到底收了多少貨、開了多少發票，這篇整理 MM 模組的核心資料表，並把 `EKBE` 的判讀邏輯拆解清楚。

---

## 【So What】B1 用單據鏈追蹤，S/4HANA 用獨立歷史表追蹤

B1 裡，一張採購單（`OPOR`/`POR1`）收貨後產生收貨單（`OPDN`/`PDN1`），收貨單的 `BaseEntry` 指回採購單；發票（`OPCH`/`PCH1`）再指回收貨單。要知道一張採購單的完整履歷，得沿著這條鏈一路往下查。

S/4HANA 反過來，把採購單所有的後續動作（收貨、發票、退貨、預付款……）都記錄在同一張表——`EKBE`（採購文件歷史）裡，不用逐張單據往回追，直接查 `EKBE` 就能拿到一張採購單的完整履歷。這是「單據鏈式關聯」與「獨立歷史表」兩種設計思路的差異，也是我第一次看 MM 開發需求時最容易卡關的地方。

---

## 【What】採購文件核心層級

SAP 的資料表設計通常分為表頭（Header）與項目（Item）兩層結構。

### 1. 採購申請（Purchase Requisition, PR）
* **`EBAN`**：採購申請項目。PR 較特殊，多數欄位直接存於此表，不分表頭。

### 2. 採購訂單（Purchase Order, PO）
* **`EKKO`**：採購文件表頭，包含採購組織、採購群組、供應商編號、文件日期、幣別。
* **`EKPO`**：採購文件項目，包含物料編號、工廠、數量、單價、成本中心。
* **`EKET`**：排程協定計劃行，包含交貨日期、承諾數量。

---

## 收貨與庫存移動

執行 MIGO 收貨時，系統會產生物料文件（Material Document）：

* **`MKPF`**：物料文件表頭。
* **`MSEG`**：物料文件項目，包含物料、工廠、儲位、移動類型（如 101、122）、關聯的 PO 號碼。

## 發票校對

執行 MIRO 處理供應商發票：

* **`RBKP`**：發票表頭。
* **`RSEG`**：發票項目，包含對應的 PO 項目、金額、物料。

---

## 關鍵追蹤表：EKBE 怎麼判讀

`EKBE` 是指 S/4HANA MM 模組記錄採購文件歷史的表，記錄了 PO 所有的後續動作，關鍵在於三個欄位的組合判讀：

**`VGABE`（交易類型）**——最核心的區分欄位：
- `1`：收貨（Goods Receipt）
- `2`：發票（Invoice Receipt）
- `3`：預付款（Down Payment）
- `9`：服務確認（Service Entry）

**`SHKZG`（借貸指標）**——區分正向或沖銷：
- `S`（Debit）：增加，如收貨 101
- `H`（Credit）：減少，如退貨 122 或取消收貨 102

**`BWART`（移動類型）**——當 `VGABE = 1` 時，標示具體動作（如 101、102、122）。`BEWTP`（購買類別）可再細分，如 `E`（收貨）、`Q`（發票）。

關聯欄位：`BELNR`（原始物料文件或發票文件號）、`GJAHR`（會計年度）、`BUZEI`（原始文件項次）。

---

## 主檔資料

* **物料相關**：`MARA`（基本資料）、`MARC`（工廠資料）
* **供應商相關**：`LFA1`（基本資料）、`LFB1`（公司代碼資料）
* **採購協議**：`EINA`（一般資料）、`EINE`（採購組織資料，含協議單價）

---

## 【What For】開發時的實戰注意事項

**1. 關聯 Key 速查**
- 表頭串項目：用 `EBELN`（採購文件編號）
- 歷史串項目：用 `EKBE-EBELN` 與 `EKBE-EBELP`

**2. 統計已收貨總數**：過濾 `VGABE = '1'`，累加 `MENGE`（若 `SHKZG = 'H'` 則視為負值）。

**3. 統計已開票總額**：過濾 `VGABE = '2'`，累加 `DMBTR`（本幣金額）。

```abap
SELECT SUM( menge ) AS total_received
  FROM ekbe
  INTO @DATA(lv_received)
  WHERE ebeln = @lv_ebeln
    AND vgabe = '1'
    AND shkzg = 'S'.
```

**4. 效能提醒**：查詢 `EKBE` 時務必帶入 `EBELN` 索引，避免在龐大的歷史紀錄中做全表掃描——這張表隨著公司採購量成長，資料量會累積得非常快。

---

## 結論

S/4HANA MM 模組最大的差異，是把 B1 靠 `BaseEntry`/`BaseLine` 串起來的單據鏈，改用 `EKBE` 這張獨立的歷史追蹤表承載。記住 `VGABE`/`SHKZG`/`BWART` 三個欄位的組合判讀邏輯，就能看懂一張採購單的完整履歷。下一篇整理 PP 生產模組，那裡的 BOM 與製程路徑設計，又是另一層 B1 完全沒有對應概念的落差。

---

## 常見問題

**EKBE 是什麼？**
EKBE 是 S/4HANA MM 模組記錄採購文件歷史的表，把一張採購單所有的後續動作（收貨、發票、退貨、預付款）都記錄在同一張表裡，不用像 B1 一樣沿著 BaseEntry/BaseLine 逐張單據往回查。

**VGABE 的數值代表什麼？**
VGABE 是 EKBE 裡最核心的交易類型欄位：1 是收貨、2 是發票、3 是預付款、9 是服務確認，判讀時要先看這個欄位再看 SHKZG 和 BWART。

**SHKZG 為什麼重要？**
SHKZG 是借貸指標，S 代表增加（如收貨 101），H 代表沖銷（如退貨 122 或取消收貨 102），統計已收貨或已開票數量時必須把 H 的紀錄算進去，才不會漏算退貨。
