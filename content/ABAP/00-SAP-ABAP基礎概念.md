---
title: "SAP 與 ABAP 基礎概念速記"
tags:
  - SAP
  - ABAP
created: 2026-07-16
status: active
area: resources
publish: true
source: "[[01. Basic of SAP and ABAP]], [[ABAP 101 - Basic of SAP and ABAP]]"
description: "整理 SAP 系統架構基礎：三層架構、NetWeaver、ABAP/4 定位、功能與技術模組分類、系統環境與 Transport Request、SAP Logon 設定、專案類型，開發前快速掌握全貌。"
keywords:
  - SAP 三層架構
  - NetWeaver
  - SAP 模組分類
  - Transport Request
  - SAP Logon
---

# SAP 與 ABAP 基礎概念速記

## 三層架構（3-tier）

SAP R/3 是指採用三層架構（3-tier architecture）設計的即時系統，把使用者介面、程式邏輯、資料儲存分開處理：
- Presentation Layer：使用者介面（SAP GUI / Fiori）
- Application Layer：程式邏輯，ABAP 跑在這層
- Database Layer：資料儲存

## NetWeaver 與 ABAP/4

NetWeaver 是指 SAP 的整合性技術平台，支援 ERP、CRM、SRM、PI 等應用。

ABAP/4 是第四代語言（4GL），專為 SAP 應用設計，屬於應用層的開發語言。

## 模組分類

SAP 模組分為功能模組（業務向）與技術模組（IT/技術向）兩類：
- 功能模組：SD（銷售）、MM（物料）、PS（專案）、FICO（財務）、HR/HCM（人資）、WM（倉儲）
- 技術模組：BASIS（系統管理）、ABAP（程式語言）、BIBO（報表工具）

## 系統環境

SAP 系統環境通常分三層：Development → Quality → Production。物件搬遷靠 **Transport Request** 這個機制，不會直接在正式環境改程式。

## SAP Logon 設定

SAP Logon 設定是指連線到特定 SAP 系統所需填寫的參數：
- System ID（SID）：3 碼，如 S4H
- Instance Number：2 碼，常見範圍 80-99
- Application Server：IP 或主機名稱

## 專案類型

SAP 專案常見分四種類型：Implementation（導入）、Support（維護支援）、Upgrade（升級）、Roll out（擴展複製）。

---

## 常見問題

**功能模組跟技術模組差在哪？**
功能模組對應具體業務流程（如 SD 銷售、MM 採購），技術模組則是支撐系統運作的底層工具（如 BASIS 系統管理、ABAP 程式語言）。

**為什麼不能直接在正式環境（Production）改程式？**
因為程式要先經過開發、測試驗證，才能透過 Transport Request 搬到正式環境，直接在 Production 改動會跳過驗證流程、風險太高。

**Instance Number 是做什麼用的？**
Instance Number 是 SAP 系統安裝時指定的 2 位數字識別碼，用來區分同一台主機上不同的 SAP Instance。
