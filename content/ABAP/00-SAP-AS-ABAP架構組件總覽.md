---
title: "SAP AS ABAP 架構組件速記"
tags:
  - SAP
  - ABAP
created: 2026-07-16
status: active
area: resources
publish: true
source: "[[SAP AS ABAP 架構組件總覽]]"
description: "整理 SAP AS ABAP 系統架構組件：ICM、SAP Gateway、Dispatcher、Work Process、Enqueue Server、User Context 的分工與請求流程，附顧問實戰排查速記。"
keywords:
  - SAP AS ABAP 架構
  - ICM SAP Gateway
  - ABAP Dispatcher
  - Work Process
  - Enqueue Server
---

# SAP AS ABAP 架構組件速記

## 通訊與接入層

通訊與接入層是指外部請求進入 SAP 系統的第一站：
- ICM（Internet Communication Manager）：處理 HTTP/HTTPS/SMTP，Fiori 或 Web Service 請求的首站
- SAP Gateway：處理 RFC 與 OData，負責跨系統資料交換

## 調度與監控層

調度與監控層負責監控系統健康狀態並分配任務：
- SAP Start Service（sapstartsrv）：啟動/停止/監控 Instance 健康狀態
- Message Server：跨 Instance 調度、負載平衡
- ABAP Dispatcher：Instance 內部調度，分配任務給空閒 Work Process

## 執行與運算層

執行與運算層是實際跑 ABAP 程式、處理鎖定與使用者狀態的地方：
- Work Process（WP）：實際執行 ABAP 程式，分 Dialog/Background/Update/Spool
- Enqueue Server：鎖定管理，防止多用戶同時改同一筆資料
- User Context：記憶體區域，存放登入資訊、變數、權限、執行狀態

## 請求流程

一個請求從進入到結束，會依序經過：接入（ICM/Gateway）→ 派發（Dispatcher 查 Message Server 負載）→ 執行（挑 WP，Roll-in User Context）→ 鎖定（Enqueue Server）→ 結束（Roll-out，回傳結果）。

## 顧問實戰速記

系統異常時可以照這個順序排查：
- 連不上系統 → 查 SAP Start Service
- Fiori 打不開 → 查 ICM
- 存檔卡住 → 查 Enqueue Server 是否被鎖
- 程式跑到一半跳掉 → 可能是 User Context Memory Dump

---

## 常見問題

**ABAP Dispatcher 的作用是什麼？**
ABAP Dispatcher 是指負責 Instance 內部調度的組件，把任務分配給空閒的 Work Process，角色類似總機。

**Enqueue Server 是做什麼的？**
Enqueue Server 負責鎖定管理，避免多個使用者同時修改同一筆資料造成衝突，資料存檔卡住時常是它在鎖著。

**Work Process 有哪幾種類型？**
常見分 Dialog（互動）、Background（背景）、Update（更新）、Spool（列印/輸出）四種類型，各自處理不同性質的任務。
