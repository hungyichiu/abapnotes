---
title: "自訂 BAPI 開發：從建表到 Release"
tags:
  - SAP
  - ABAP
  - BAPI
created: 2026-07-14
status: active
area: resources
publish: true
---

# 自訂 BAPI 開發：從建表到 Release

## 為什麼要自己開發 BAPI

[[06-RFC-BAPI|RFC 與 BAPI]]一篇講的是「呼叫 SAP 既有的 BAPI」，例如用 `BAPI_PO_CREATE1` 建立採購單。但當客戶的自訂資料表（例如自建的員工資料表）也需要讓外部系統呼叫存取時，就需要**自己開發一個 BAPI**，把它掛進 SAP 的 Business Object Repository（BOR），讓外部系統能像呼叫標準 BAPI 一樣呼叫它。這篇整理從零開發一個自訂 BAPI 的完整流程。

---

## 整體流程

```
建立資料表(SE11)
  → 建立 Function Group(SE80)
  → 建立 Function Module，符合 BAPI 命名規則(SE37)
  → 建立 Business Object(SWO1)
  → 把 Function Module 綁定成 BO 的 Method
  → BO 與 Method 各自 Release(兩層)
  → 用 BAPI Explorer 驗證、實際測試呼叫
```

---

## Step 1：建立資料表(SE11)

以員工資料為例，先建立一張自訂表：

- `ZDEMPID_01`：員工編號，NUMC 10
- `ZDNAME_01`：員工姓名的 Data Element
- 表格 `ZTEMPLOYEE_01`：包含上述欄位

這一步跟一般自訂表沒有差別，重點是欄位型態要跟後面 BAPI 的參數型態對得起來。

---

## Step 2：建立 Function Group 與 Function Module(SE37)

BAPI 本質上就是一個 Function Module，但必須符合 SAP 規定的命名與參數規則才能被視為正式的 BAPI：

**命名規則**：
- Function Module 名稱格式：`<namespace>BAPI_<業務物件>_<Method>`，例如 `ZBAPI_EMPLOYEE_CREATE`
- 所有參數的關聯型態（associated type）必須以 `BAPI` 開頭
- 所有參數必須 **Pass by Value**（不能傳址）
- 必須包含一個 `RETURN` 參數，型態為 `BAPIRET2`（SAP 標準的回傳訊息結構）
- Function Module 必須勾選 **RFC-Enabled**
- Function Module 必須執行 **Release**（Goto → Release）

**範例邏輯**（`ZBAPI_EMPLOYEE_CREATE`）：

```abap
DATA : lwa_employee TYPE ztemployee_01.
lwa_employee-eid = pemployee-eid.
lwa_employee-ename = pemployee-ename.

INSERT ztemployee_01 FROM lwa_employee.
IF sy-subrc = 0.
  return-type = 'S'.
  return-id = 'ZMSG_DEMO'.
  return-number = '002'.
  return-message_v1 = pemployee-eid.
ELSE.
  return-type = 'E'.
  return-id = 'ZMSG_DEMO'.
  return-number = '003'.
  return-message_v1 = pemployee-eid.
ENDIF.
```

這段邏輯本身很單純（新增一筆員工資料），BAPI 開發真正的重點在於**參數與命名要符合規則**，否則後面綁定 Business Object 時會被擋下來。

---

## Step 3：建立 Business Object(SWO1)

Function Module 準備好之後，用 SWO1 建立 Business Object：

- **Object Type**：BO 的內部識別代號（例如 `ZEMPLOYEE`）
- **Object Name**：BO 的外部識別名稱（例如 `EMPLOYEE`）——這個名稱是 **Case Sensitive**，在 BAPI Explorer 裡查詢時大小寫要完全一致，找不到 BO 常常是這裡打錯
- **Super Type**：如果要繼承現有 Object Type 的元件，在這裡指定
- **Application**：填 `*` 代表 Cross Application（跨模組通用）

### 把 Function Module 綁定成 Method

在 SWO1 裡選擇 Utilities → Add Method，建立一個 API Method，指定要綁定的參數，系統會自動關聯回剛剛在 SE37 建立的 Function Module。綁定完成後可以用 Goto Program 直接跳轉確認對應的 Function Module 是否正確。

---

## Step 4：Business Object 的四種狀態

BO 跟它底下的 Method 都有各自的生命週期狀態，這是自訂 BAPI 開發中最容易卡住的地方：

| 狀態 | 說明 |
|---|---|
| **Modeled** | Business Object / 元件剛被定義出來，還沒有實作 |
| **Implemented** | 元件已完整實作功能，可以在 SAP 內部使用與測試，但還不能被外部系統呼叫 |
| **Released** | 介面被凍結（freeze），會出現在 BAPI Explorer(交易碼 BAPI) 裡，此時才能被外部（非 SAP）系統呼叫 |
| **Obsolete** | 已棄用，不能再使用 |

新建立的 BO 預設是 Modeled，必須手動變更狀態：把游標放在 BO 上，Edit → Change Release Status，才能逐步推進到 Implemented、最後 Released。

---

## Step 5：兩層 Release——BO 與 Method 分開處理

自訂 BAPI 真正能被外部系統呼叫之前，**BO 本身**與**BO 底下的 Method（也就是 BAPI）**要分別完成 Release，兩者缺一不可：

1. 先確認 Method 的狀態是 Implemented
2. BO 本身執行 Change Release Status → Released
3. Method（BAPI）也要單獨執行 Release
4. 兩者都 Released 之後，用交易碼 **BAPI**（BAPI Explorer）搜尋 Object Name，確認 BO 跟 Method 都出現在清單裡

搜尋不到時，先檢查兩件事：Object Name 大小寫是否正確、BO 與 Method 是否都已經走完各自的 Release 流程——只 Release 其中一個，BAPI Explorer 裡看不到完整結果。

---

## 跟 SAP 原生 BAPI 對照

拿一個真實案例 `BAPI_SALESORDER_CREATEFROMDAT2` 來對照自訂的 `ZBAPI_EMPLOYEE_CREATE`，可以驗證自己做的東西架構是否正確：

| 項目 | 檢查點 |
|---|---|
| SE37 屬性 | Remote-Enabled Module 打勾 |
| Import/Export 參數 | 關聯型態以 `BAPI` 開頭，Pass by Value |
| Table 參數 | 有 `RETURN`（或對應的訊息表） |
| SWO1 | 對應到一個 Business Object（如 SalesOrder），Method 就是這個 BAPI |

架構完全一致，差別只在於 SAP 原生 BAPI 的商業邏輯複雜得多。用這個對照表檢查自己開發的 BAPI，可以快速抓出「哪個環節沒對齊 SAP 慣例」。

---

## 測試驗證

1. 在 SE37 對 Function Module 設中斷點，直接測試執行，確認邏輯正確
2. 用 SE11 查詢資料表，確認資料真的被寫入
3. 對相同參數再執行一次（例如同一個員工編號重複新增），確認錯誤處理有正確擋下重複資料，回傳 `return-type = 'E'`
4. 最後用交易碼 **BAPI** 搜尋 Object Name，確認 Generate 之後可以看到 BO 與 Method（FM 名稱）的完整對應關係

---

## 常見陷阱

- **Object Name 大小寫打錯**：在 BAPI Explorer 搜尋不到自己建立的 BO，最常見原因就是大小寫沒對齊
- **只 Release BO 忘記 Release Method（或反過來）**：兩層 Release 缺一，BAPI Explorer 顯示不完整或呼叫失敗
- **參數型態沒有以 BAPI 開頭**：SWO1 綁定 Method 時可能無法正確關聯，或後續呼叫時型態不符
- **忘記勾選 RFC-Enabled 或忘記 Release Function Module**：外部系統完全無法呼叫，即使 BO 端設定都正確

---

## 實作提醒

- **先照抄 SAP 原生 BAPI 的參數結構再改**：與其從零設計參數型態，不如先找一個類似情境的 SAP 標準 BAPI，對照它的 Import/Export/Table 結構，降低出錯機率
- **開發完立即用 BAPI Explorer 驗證，不要只在 SE37 測完就結束**：SE37 測試只能證明邏輯正確，不能證明外部系統呼叫得到，兩者要分開確認
- **測試涵蓋重複呼叫與異常情境**：至少測試一次正常新增、一次重複資料，確認 `BAPIRET2` 的錯誤訊息機制真的有生效

---

## 來源筆記

- [[BAPI - Introduction]]
- [[BAPI - Creation of Table]]
- [[BAPI - Create Business Object]]
- [[BAPI - Create Function Module]]
- [[BAPI - Tables and Functions of Business Objects]]
- [[BAPI - Comparison of Customized BAPI with SAP BAPI]]
- [[BAPI - Othes Status]]
