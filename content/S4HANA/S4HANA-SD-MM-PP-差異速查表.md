---
title: "B1 vs S/4HANA：SD/MM/PP 資料表差異速查表"
tags:
  - SAP
  - S4HANA
  - SD
  - MM
  - PP
created: 2026-07-16
status: active
area: resources
publish: true
source: "[[SAP SD Tables]], [[SAP MM Tables]], [[SAP PP Tables]]"
description: "一張速查表對照 B1 與 S/4HANA 在 SD/MM/PP 三個模組的資料表差異（VBEP、EKBE、製程路徑），快速找到該查哪張表。"
keywords:
  - B1 S/4HANA 資料表差異
  - SD MM PP 對照
  - VBEP EKBE 製程路徑
  - SAP 資料表速查
---

# B1 vs S/4HANA：SD/MM/PP 資料表差異速查表

## 前言

前面五篇筆記把 SD、MM、PP 各自的細節都寫得很長，但有時候只是想快速確認「這個表在 S/4HANA 對應到哪裡、差在哪」，翻長文太慢。這篇就是給自己用的速查表，三個模組放一起看，一眼掃過去就好，細節要看再回頭點連結。

---

## SD 模組

| B1 表 | S/4HANA 表 | 差異重點 |
|---|---|---|
| `ORDR` / `RDR1` | `VBAK` / `VBAP` / `VBEP` | 多一層排程列（VBEP），處理分批交貨與 ATP 確認數量 |
| `ODLN` / `DLN1` | `LIKP` / `LIPS` | 出貨單結構相同，表頭+項目 |
| `OINV` / `INV1` | `VBRK` / `VBRP` | 發票結構相同，表頭+項目 |
| BaseEntry/BaseLine 鏈式關聯 | `VBFA` | 獨立單據流追蹤表，不用逐張往回查 |

一句話重點：**多了排程列，是因為要拆開「客戶要什麼」和「系統怎麼交貨」。** 細節看 [[S4HANA-SD模組開發注意事項]]。

---

## MM 模組

| B1 表 | S/4HANA 表 | 差異重點 |
|---|---|---|
| `OPOR` / `POR1` | `EKKO` / `EKPO` | 採購單結構相同，表頭+項目 |
| 收貨單走 BaseEntry 關聯 | `MKPF` / `MSEG` | 收貨走獨立的物料文件 |
| `OPCH` / `PCH1` | `RBKP` / `RSEG` | 發票校對結構相同 |
| BaseEntry/BaseLine 鏈式關聯 | `EKBE` | 獨立歷史追蹤表，靠 `VGABE`/`SHKZG`/`BWART` 判讀動作類型 |

一句話重點：**EKBE 把整條單據鏈攤平存成一張表，查詢不用再一路往回追。** 細節看 [[S4HANA-MM模組開發注意事項]]。

---

## PP 模組

| B1 表 | S/4HANA 表 | 差異重點 |
|---|---|---|
| `OITT` / `ITT1` / `ITT2` | `MAST` / `STKO` / `STPO` / `STAS` | BOM 拆成四層，支援多工廠、多版本 |
| （無對應） | `PLKO` / `PLAS` / `PLPO` / `PLMZ`、`CRHD` | 製程路徑，B1 完全沒有這塊，S/4HANA 靠它排產能、算標準成本 |
| `OWOR` / `WOR1` | `AUFK` / `AFKO` / `AFPO` / `AFVC` / `RESB` / `AFRU` | 訂單執行拆六張表，多了工序（AFVC）與報工確認（AFRU） |

一句話重點：**PP 是三個模組裡落差最大的，因為 B1 完全沒有「怎麼做、花多久」的結構化紀錄。** 細節看 [[S4HANA-PP模組開發注意事項-1-基礎資料與BOM]]、[[S4HANA-PP模組開發注意事項-2-製程路徑與工作中心]]、[[S4HANA-PP模組開發注意事項-3-生產訂單執行]]。

---

## 整體規律

三個模組的差異其實是同一個邏輯的重複：B1 假設「知道結果就好」，S/4HANA 假設「過程也要結構化記錄」——

- SD：不只訂單要什麼，還要記錄「打算怎麼分批交貨」（VBEP）
- MM：不只單據關聯，還要獨立記錄「每個動作的歷史」（EKBE）
- PP：不只要用什麼料，還要記錄「怎麼做、花多久、誰做的」（製程路徑 + AFRU）

下次卡關的時候，先想這一層「B1 只記結果，S/4HANA 連過程都要結構化」，通常就能猜到該去哪張表找答案。

---

## 常見問題

**B1 跟 S/4HANA 的資料表結構為什麼差這麼多？**
核心原因是 B1 假設「知道結果就好」，S/4HANA 假設「過程也要結構化記錄」，所以在 SD 多了排程列、MM 多了獨立歷史表、PP 多了製程路徑與工序確認。

**哪個模組的落差最大？**
PP 模組落差最大，因為 B1 完全沒有「怎麼做、花多久」的結構化紀錄，S/4HANA 卻靠製程路徑撐起產能排程與標準成本計算。

**要查某張 B1 表在 S/4HANA 對應哪裡，該從哪裡開始？**
先確認是哪個模組（SD/MM/PP），再對照本篇表格找到對應表名，需要細節再回頭看各模組的詳細筆記。
