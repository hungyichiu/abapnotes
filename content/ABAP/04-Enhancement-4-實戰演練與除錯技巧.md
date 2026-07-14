---
title: "Enhancement 實戰演練與除錯技巧"
tags:
  - SAP
  - ABAP
  - Enhancement
created: 2026-07-14
status: active
area: resources
publish: true
---

# Enhancement 實戰演練與除錯技巧

> Enhancement 系列共四篇：[[04-Enhancement-1-總覽與傳統擴充機制|總覽與傳統擴充機制]] → [[04-Enhancement-2-BAdI|BAdI]] → [[04-Enhancement-3-Enhancement-Framework|Enhancement Framework]] → 實戰演練與除錯技巧(本篇)

## 為什麼需要這一篇

前三篇建立了「四個世代分別是什麼」的觀念，但實務上真正卡住顧問的，往往不是觀念，而是「現場遇到一個需求，該用哪一種擴充機制、去哪裡找切入點」。這篇整理實際動手練習過的情境（以 RQ / 需求描述呈現），聚焦前三篇沒有涵蓋的操作細節與除錯技巧。

---

## SAP 核心元件不可 Enhance 的限制

不是所有標準程式都能掛 Enhancement。以 `REUSE_ALV_GRID_DISPLAY` 所在的 `FUGR SALV` 為例：

> `FUGR SALV` 是 SAP 標準 ALV（Simple ALV / `CL_SALV_TABLE`）底層的 Function Group，SAP 不允許對 Central Basis 的元件使用 Enhancement Framework，因為這些元件是 SAP Kernel 和 ABAP 核心功能正確運作的必要條件。SALV 屬於 `SAP_BASIS` 軟體元件，其所在 Package 被 SAP 標記為「不可 enhance」（not enhanceable），這是刻意的設計限制，不是設定錯誤。

在 SE38 對這類程式執行 **Edit → Enhancement Operations → Show Implicit Enhancement Options** 時，若跳出錯誤訊息，先確認是不是踩到這個限制，不要花時間排查「為什麼找不到掛載點」。

---

## Customer Exit 三種類型的手把手練習

### Function Module Exit：VA01 業務夥伴自動帶入

**情境**：VA01 建立銷售訂單，當 Order Type 只有一個 Sold-To Party 選項時，希望系統自動帶入，不需要使用者手動選。

找 Function Module Exit 有三種方式，實務上通常搭配使用：

1. **中斷點法**：在 `CALL CUSTOMER-FUNCTION` 陳述式上設中斷點，`/h` 進 Debug 模式後執行，觀察程式停在哪個三位數代號
2. **SMOD 反查法**：VA01 執行後用 System → Status 查出程式的 Package 名稱，拿到 SMOD 用 Utilities → Find → Package Name 搜尋
3. **SE84 查詢法**：交易碼 SE84 → Enhancements → Customer Exit，直接依模組搜尋

三種方法找到的都是同一個結果，中斷點法最直接（保證是「這次執行真的會走到」的 Exit），但需要先知道大概的操作路徑；SMOD/SE84 反查法適合完全沒頭緒時使用。

**實作步驟**（CMOD）：
1. CMOD 建立 Project
2. Enhancement assignments 掛上找到的 Function Exit
3. Components 頁籤點選 Function Exit，進入對應的 Enhancement FM
4. 在 Source Code 加入邏輯，確認 Import/Export 參數
5. Activate Enhancement
6. `/h` 設中斷點回到 VA01 走一次流程，F5 單步確認邏輯真的有跑到
7. 練習結束後記得刪除 Program 跟 CMOD Project（避免留下測試用的垃圾設定）

### Menu Exit：CAT2 加入自訂選單

**情境**：CAT2（工時登打）畫面想加一個自訂選單項目，點擊後跳轉到 CAT4。

Menu Exit 的 Function Code 固定以 `+` 開頭。找法跟 Function Module Exit 一樣（System → Status 查 GUI Status 裡的選單項目、SMOD 反查、SE84），實作在 CMOD 裡判斷使用者按了哪個自訂代號：

```abap
IF sy-ucomm = '+CU6'.
  CALL TRANSACTION 'CAT4'.
ENDIF.
```

### Screen Exit：CAT2 加入自訂欄位

**情境**：CAT2 初始畫面想加一個自訂 checkbox。

Screen Exit 的機制是 SAP 在標準畫面裡預留一塊 **Subscreen Area**，透過 `CALL CUSTOMER-SUBSCREEN` 語法把自訂畫面掛進去。找法一樣是 System → Status 查畫面號碼，再確認該畫面是否有對應的 Subscreen Area。實作時在 CMOD 建立一個 Subscreen 類型的畫面（Dynpro Type - Subscreen），設計版面配置後 Activate，自訂欄位就會出現在標準畫面裡。

**三種 Customer Exit 的共同限制**：同一個 Customer Exit 一次只能被指派給一個 Project——如果專案 A 已經用掉某個 Exit，專案 B 想用同一個 Exit 就會衝突，這是接手 MA 案時常踩到的坑。

---

## Explicit Enhancement：Enhancement-Point 與 Enhancement-Section 的差異

[[04-Enhancement-3-Enhancement-Framework|上一篇]]提過 Explicit Enhancement 分成 Point 跟 Section 兩種，差異在於**能不能取代原本的邏輯**：

| | Enhancement-Point | Enhancement-Section |
|---|---|---|
| 預設實作 | 沒有，只能「加」邏輯 | 有，可以「取代」SAP 原始邏輯 |
| 風險 | 較低，不動原邏輯 | 較高，等於覆蓋了 SAP 寫的那段程式 |

**情境（Point）**：MM01 物料主檔，物料號碼只能是 0-9 的數字。用 `/omm01 → System → Status` 找到目前所在的 Screen 60，對應 `MODULE internal_material_number_get`，在這個 FORM 前後的 Enhancement Point 加入驗證邏輯：

```abap
ENHANCEMENT-POINT lmgmmi05_01 SPOTS es_saplmgmm.

ENHANCEMENT 1  ZVALIDATE_MATERIAL.    "active version

DATA: lv_check(10) TYPE c VALUE '0123456789'.
IF rmmg1-matnr NA lv_check.
  MESSAGE 'Should consist 0-9' TYPE 'E'.
ENDIF.

ENDENHANCEMENT.
```

**情境（Section）**：MM01 輸入 Industry 跟 Material Type 後，希望立刻看到物料號碼被顯示出來，用 Enhancement-Section 直接在對應位置補一行訊息：

```abap
MESSAGE S000(ZMSG_DEMO) WITH rmmg1-matnr.
```

一個練習用的 Demo 程式可以完整看出 Point 跟 Section 差在哪：

```abap
REPORT Z26Q1_CHIU_15_ENH.

DATA: lv_output(3) TYPE n.

PARAMETERS : p_input1(2) TYPE n,
             p_input2(2) TYPE n.

ENHANCEMENT-POINT ZEP_00 SPOTS ZES99.
ENHANCEMENT 1  ZIMPL_03.    "active version
lv_output = p_input1 - p_input2.
WRITE :/ 'The minus of 2 numbers :', lv_output.
ENDENHANCEMENT.

ENHANCEMENT-SECTION ZES_02 SPOTS ZES99.
lv_output = p_input1 / p_input2.
WRITE :/ 'The division of 2 numbers :', lv_output.
END-ENHANCEMENT-SECTION.
ENHANCEMENT 1  ZIMP_ERROR_HANDLING.    "active version
IF p_input2 = 0.
  WRITE: / 'The second input should not be zero'.
ELSE.
  lv_output = p_input1 / p_input2.
  WRITE :/ 'The division of 2 numbers :', lv_output.
ENDIF.
ENDENHANCEMENT.

lv_output = p_input1 + p_input2.
WRITE :/ 'The sum of 2 numbers :', lv_output.
```

重點看 `ENHANCEMENT-SECTION`：原本的除法邏輯（`lv_output = p_input1 / p_input2.`）被包在 Section 裡，Implementation 裡可以完全取代它（例如加上除以零的錯誤處理），這是 Enhancement-Point 做不到的。

---

## 用 CL_EXITHANDLER->GET_INSTANCE 除錯找 Classic BAdI

[[04-Enhancement-2-BAdI|BAdI 篇]]提過 SE18 關鍵字搜尋跟 Debug 追蹤兩種找 BAdI 的方式，這裡補一個更具體的除錯技巧：

**情境**：MM01 物料主檔，計量單位（UOM）不能是 KG，儲存時應該擋下來。

1. MM01 把 UOM 填成 KG
2. SE24 開啟 `CL_EXITHANDLER`，找到 `GET_INSTANCE` 方法，在 `sy-subrc` 這一行設中斷點
3. 回到 MM01 按儲存觸發中斷點
4. 中斷後檢查 `EXIT_NAME` 變數，會顯示目前正在檢查哪一個 BAdI（例如 `BADI_MATERIAL_CHECK`）
5. 拿著這個名稱到 SE18 查詢，確認對應的 Interface（例如 `IF_EX_BADI_MATERIAL_CHECK`）

`GET_INSTANCE` 是 BAdI 底層取得 Implementation 實例的標準方法，幾乎每次呼叫 BAdI 前都會先執行它——這代表這個中斷點是找 Classic BAdI 切入點最可靠的方式之一，比起在 SE18 裡憑關鍵字用猜的更準。

---

## 【What For】如何選擇該用哪種擴充技術

```
1. SAP 有提供切入點？
   ├─ SMOD 查到 Customer Exit → 用它
   └─ SE18 查到 BAdI → 用它

2. 都沒有？
   └─ 系統版本夠新？
      ├─ Yes → Implicit Enhancement
      └─ No → 舊式 Implicit

3. 真的無法用 Enhancement 解決？
   └─ 最後手段：Modification（需 SAP key）
```

**核心原則**：SAP 有提供的優先用（最安全）；沒有提供的才往下找；同時受系統版本限制。實務完整流程通常是：SMOD + SE18 同時查 → `/h` 設中斷點確認切入點真的會被觸發 → 依技術類型實作（CMOD 或 SE19）→ 啟用（容易忘記的一步）→ 實際測試驗證。

---

## 常見陷阱

- **忘記啟用 Project 或 Implementation**：CMOD 的 Project、SE19 的 Implementation 都需要額外啟用，寫完程式碼但沒啟用是最常見的「怎麼改都沒反應」原因
- **只查 SMOD 忘記查 SE18**：容易漏掉現成的 BAdI 切入點，多做一步查詢比事後才發現有更好的方案划算
- **直接用 `/h` debug 找切入點，跳過 SMOD/SE18**：應該先查正規管道，真的查無結果才用 Debug 追蹤，否則容易找到不該用的位置
- **Implicit Enhancement 濫用**：沒有現成切入點才用，而且務必加清楚註解說明用途，方便日後其他開發者辨識
- **同一個 Customer Exit 被多個專案搶用**：接手 MA 案時，先確認目標 Exit 有沒有被其他 Project 佔用

---

## 實作提醒

- **找切入點的順序固定下來**：SMOD/SE18 查詢 → 中斷點驗證 → 才動手實作，不要跳過驗證直接寫邏輯
- **練習用的 Program 跟 CMOD Project 用完記得清乾淨**：避免正式環境累積一堆測試用的垃圾設定
- **踩到「不可 Enhance」的元件不要死磕**：先確認是不是 Central Basis 元件的設計限制，改找別的切入點或改用 BAdI/User Exit 迂迴處理

---

## 來源筆記

- [[10. Enhancements & Modifications]]
- [[SAP_Enhancement_筆記]]
