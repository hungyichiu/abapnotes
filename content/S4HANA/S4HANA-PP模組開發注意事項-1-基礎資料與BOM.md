---
title: "從 B1 到 S/4HANA：PP 模組的基礎資料與 BOM 結構"
tags:
  - SAP
  - S4HANA
  - PP
created: 2026-07-16
status: active
area: resources
publish: true
source: "[[SAP PP Tables]]"
description: "整理 S/4HANA PP 模組的物料工廠主資料與 BOM 資料表結構（MAST/STKO/STPO/STAS），對照 B1 兩張表的 BOM 設計，理解多工廠多版本的查詢邏輯。"
keywords:
  - S/4HANA PP 模組
  - BOM 資料表
  - MAST STKO STPO
  - SAP B1 OITT ITT1
  - 製程路徑
---

# 從 B1 到 S/4HANA：PP 模組的基礎資料與 BOM 結構

## 前言

SAP Business One 的 BOM（物料清單）結構單純：`OITT` 記錄一張 BOM 表頭，`ITT1` 記錄組成的零件明細，簡單客戶甚至只需要匯入這兩張表就能上線。S/4HANA 的 PP 模組把同樣的概念拆得更細——不只是「這個產品用哪些零件」，還要知道「這個物料在哪個工廠生產」「用哪個 BOM 版本」，這篇是自己整理的筆記，把 PP 模組最基礎的主資料與 BOM 資料表記下來，是後續看懂製程路徑、生產訂單的地基。

---

## 【So What】為什麼 BOM 結構會被拆成四張表

B1 的 BOM 只需要兩張表就能表達「產品由哪些零件組成」，因為 B1 假設一個物料只有一種組成方式。

S/4HANA 的物料可能在不同工廠有不同的生產方式（同一個成品，A 廠用一種配方、B 廠用另一種），也可能因為工程變更（ECN）而有多個版本並存。為了同時支援「多工廠」與「多版本」，S/4HANA 把 BOM 拆成連結表、表頭、項目、版本選擇四層，而不是像 B1 一樣把所有東西塞進兩張表。

---

## 【What】物料與工廠主資料

* **`MARC`**：物料的工廠數據，記錄物料在特定工廠的 MRP 類型、控制人等資訊。同一個物料代號，在不同工廠會有不同的 `MARC` 紀錄。
* **`MAPL`**：物料與製程路徑（Routing）的分配關係，是連結「這個物料」與「它要照哪條製程路徑生產」的橋樑（製程路徑細節留到下一篇）。

---

## BOM（物料清單）結構

BOM 定義了產品的組成結構，在資料庫中透過「清單群組」來管理：

| 表名 | 說明 | 關鍵欄位 |
|---|---|---|
| **`MAST`** | 物料與 BOM 的連結 | `MATNR`（物料）、`WERKS`（工廠）、`STLNR`（BOM 編號） |
| **`STKO`** | BOM 表頭（Header） | `STLNR`、`STLTY`（BOM 類別） |
| **`STPO`** | BOM 項目（Item） | `STLNR`、`POSNR`（項目編號）、`IDNRK`（組件） |
| **`STAS`** | BOM 項目選擇 | 用於連結 `STKO` 與 `STPO` 的版本關係 |

對照 B1：`MAST` 大致對應 B1 的「哪個物料有 BOM」這層關係，`STKO`/`STPO` 合起來對應 `OITT`/`ITT1`。B1 若有多階製程，會多用一張 `ITT2`（ProductTrees_Stages）記錄工序階段，但這跟 S/4HANA 完整的製程路徑設計相比，仍是相對簡化的表示方式。

---

## 【What For】開發時的實戰注意事項

**1. 從物料找 BOM 的查詢順序**
先查 `MAST` 得到 `STLNR`，再用 `STLNR` 去 `STPO` 查具體零件：

```abap
SELECT SINGLE stlnr
  FROM mast
  INTO @DATA(lv_stlnr)
  WHERE matnr = @lv_matnr
    AND werks = @lv_werks.

SELECT idnrk, menge
  FROM stpo
  INTO TABLE @DATA(lt_components)
  WHERE stlnr = @lv_stlnr.
```

**2. 注意 `WERKS`（工廠）維度**
同一個物料在不同工廠可能對應不同的 `STLNR`，開發報表或介面時千萬別漏了工廠篩選條件，否則會抓到錯誤工廠的 BOM 版本。

**3. 版本變更留意 `STAS`**
若客戶有工程變更（ECN）需求，同一張 BOM 可能有多個版本並存，`STAS` 才是決定「現在生效的是哪個版本」的關鍵表，不能只看 `STKO`/`STPO`。

---

## 結論

S/4HANA 把 B1 兩張表就能表達的 BOM 結構，拆成連結、表頭、項目、版本選擇四層，本質上是為了同時支援多工廠與多版本管理。掌握 `MAST → STKO/STPO → STAS` 這條查詢鏈，是看懂 PP 模組資料設計的第一步。下一篇會進到製程路徑與工作中心——這是 B1 完全沒有對應概念的部分，也是 PP 模組認知落差最大的地方。

---

## 常見問題

**S/4HANA 的 BOM 資料表跟 B1 差在哪？**
B1 用 `OITT`/`ITT1` 兩張表就能表達 BOM，S/4HANA 則拆成 `MAST`（連結）、`STKO`（表頭）、`STPO`（項目）、`STAS`（版本選擇）四張表，是為了同時支援多工廠與多版本並存。

**MAST 的作用是什麼？**
MAST 是物料與 BOM 的連結表，記錄物料代號、工廠、BOM 編號三者的對應關係，查詢時要先從這張表找到 `STLNR`，才能進一步查 `STPO` 的零件明細。

**為什麼同一個物料在不同工廠會查到不同的 BOM？**
因為 S/4HANA 允許同一個物料在不同工廠使用不同的生產配方，`MAST` 表用 `WERKS`（工廠）欄位區分，開發時漏掉這個篩選條件就會抓到錯誤工廠的 BOM 版本。
