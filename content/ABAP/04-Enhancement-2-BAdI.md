---
title: "BAdI：業務邏輯擴充的現代解法"
tags:
  - SAP
  - ABAP
  - BAdI
created: 2026-05-15
status: active
area: resources
publish: true
---

# BAdI：業務邏輯擴充的現代解法

> Enhancement 系列共三篇：[[04-Enhancement-1-總覽與傳統擴充機制|總覽與傳統擴充機制]] → BAdI(本篇)→ [[04-Enhancement-3-Enhancement-Framework|Enhancement Framework]]

## BAdI 是什麼

**BAdI（Business Add-In）** 是 SAP 擴充機制演進中的第三代，核心思想是：SAP 在標準程式的關鍵業務節點預先定義介面（Interface），顧問只需要建立實作類別（Class），填入自訂邏輯。BAdI 與後面的 Enhancement Framework（第四代）是各自獨立的機制，不是後者的子集，只是兩者都可以透過 SE18/SE19 管理。

與前一篇的 User Exit / Customer Exit 相比，BAdI 有幾個明顯優勢：

| 特性 | User Exit / Customer Exit | BAdI |
|------|--------------------------|------|
| 多個實作 | 只能有一個 | 可以有多個 Implementation 同時啟用 |
| 介面定義 | 無（空 FORM） | SAP 定義清楚的 Method 簽名 |
| Filter | 無 | 可依條件（銷售組織、公司代碼等）分流 |
| 語言 | FORM subroutine | ABAP OOP（Class / Interface） |

---

## 兩個世代：Classic BAdI vs New BAdI

BAdI 本身也有兩個世代：

| | Classic BAdI | New BAdI |
|-|-------------|----------|
| 管理交易碼 | SE18（定義）/ SE19（實作） | 同樣是 SE18/SE19，但底層走 Enhancement Spot 機制 |
| 實作類別 | Adapter Class | 直接 implement interface |
| Filter | 有限 | 更靈活 |
| 出現版本 | SAP Basis 4.6+ | SAP Basis 7.0+ |

S/4HANA 環境以 New BAdI 為主。接手舊系統時仍可能遇到 Classic BAdI。

---

## 找到適合的 BAdI

找 BAdI 的方式與找 Enhancement Exit 類似：

**方法一：SE18 關鍵字搜尋**

```
SE18 → 輸入業務關鍵字（如 ME_PROCESS、SD_SLS、FI_POST）→ 搜尋
```

SAP 的 BAdI 命名通常以業務模組縮寫開頭，例如 `ME_PROCESS_PO_CUST`（採購單處理）。

**方法二：Debug 追蹤 + GET BADI**

在 Debug 模式下，當程式執行到 `GET BADI lv_badi.` 語句時，可以看到系統正在呼叫哪個 BAdI，這是最直接的方式。

**方法三：SE24 查詢 BAdI Interface**

每個 BAdI 有對應的 Interface（以 `IF_EX_` 開頭的 Classic，或 `IF_` 開頭的 New），在 SE24 查詢 interface，可以看到它的 Method 定義和說明。

---

## 建立 BAdI Implementation（New BAdI）

以 `BADI_SD_SALES_ITEM`（銷售訂單明細處理）為例：

### Step 1：確認 BAdI 定義

```
SE18 → 輸入 BADI_SD_SALES_ITEM → 顯示
```

查看：
- **Interface**：要實作的 Method 清單和參數定義
- **Filter**：是否為 Filter-dependent BAdI（依條件分流）
- **Multiple Use**：是否允許多個同時啟用的 Implementation

### Step 2：建立 Enhancement Implementation

```
SE19 → Create → 選擇 Classic Enhancement Implementation 或 Enhancement Spot Implementation
→ 輸入名稱（建議 Z 開頭）→ 選擇對應的 BAdI 定義
```

### Step 3：建立實作類別

系統會自動建立一個 Class，繼承 BAdI 的 Interface。在 Class Builder（SE24）中開啟這個類別，找到要實作的 Method：

```abap
METHOD if_ex_badi_sd_sales_item~check_item.
  " 方法的參數由 BAdI 介面定義，例如：
  " im_item：銷售訂單明細資料
  " cs_item：可修改的明細結構

  " 自訂驗證邏輯：特定物料必須填寫工廠
  IF im_item-matnr = 'Z_SPECIAL'
  AND im_item-werks IS INITIAL.
    MESSAGE e001(z_custom) WITH '特殊物料必須指定工廠'.
  ENDIF.

ENDMETHOD.
```

### Step 4：Activate 並測試

```
SE24 → Activate Class（Ctrl+F3）
SE19 → Activate Enhancement Implementation
```

---

## Filter-dependent BAdI

Filter-dependent BAdI 允許根據特定條件決定「哪個 Implementation 被呼叫」，常見場景是：

- 依銷售組織分流：A 公司用台灣邏輯，B 公司用泰國邏輯
- 依公司代碼分流：財務報表格式依公司不同

```abap
" SAP 標準程式中的呼叫方式（示意）
GET BADI lv_badi
  FILTERS
    sales_org = ls_vbak-vkorg.   " 以銷售組織作為 filter

CALL BADI lv_badi->check_item
  EXPORTING im_item = ls_item
  CHANGING  cs_item = ls_item.
```

建立 Implementation 時，在 Filter 頁籤指定這個 Implementation 對應的 Filter 值（例如 `VKORG = '1000'`），系統在執行時自動只呼叫符合 filter 條件的 Implementation。

---

## 多個 Implementation 的執行

當一個 BAdI 有多個同時啟用的 Implementation，**所有 Implementation 都會被呼叫**，執行順序由系統管理（通常無法保證順序）。

如果多個 Implementation 之間有邏輯依賴，需要：
1. 透過 Enhancement Spot 的 Sequence 設定控制順序（部分 BAdI 支援）
2. 或將邏輯整合進同一個 Implementation，避免跨 Implementation 依賴

---

## Classic BAdI 的實作（SE18/SE19 舊版）

接手舊系統時，可能遇到 Classic BAdI：

```
SE19 → 建立 Classic Enhancement Implementation
→ 輸入 BAdI 名稱（如 CUSTOMER_ADD_DATA）
→ 系統建立 Adapter Class（ZCL_IM_CUSTOMER_ADD_DATA）
→ 在 Adapter Class 中實作 Method
```

Classic BAdI 的類別會繼承一個 Adapter Class，再 implement 對應的 Interface，多一層間接，但邏輯撰寫方式相同。

---

## 常見陷阱

**陷阱一：搞混 BAdI 定義和 Implementation**

SE18 是查看 BAdI 的定義（由 SAP 提供），SE19 是建立你自己的 Implementation（你填邏輯的地方）。定義不能修改，只能看。

**陷阱二：多個 Implementation 時的意外行為**

確認這個 BAdI 的 `Multiple Use` 屬性。若為 `No`（只允許一個 Implementation），啟用你的 Implementation 會停用其他已存在的。接手 MA 案時先確認是否已有現存的 Implementation。

**陷阱三：Filter 設定錯誤導致邏輯未觸發**

Filter-dependent BAdI 中，若 Filter 值設定有誤（例如公司代碼格式不對），你的 Implementation 不會被呼叫，也不會有任何錯誤訊息，只是靜默跳過。

**陷阱四：Class Activate 成功但 Enhancement Activate 忘記**

Class 和 Enhancement Implementation 都必須分別 Activate。兩者缺一，BAdI 都不會生效。

---

## 實作提醒

- **新開發優先選 BAdI**：如果 SAP 有提供對應的 BAdI，優先使用 BAdI 而非 [[04-Enhancement-3-Enhancement-Framework|Implicit Enhancement]]，因為 BAdI 有明確的介面定義和文件
- **接手 MA 案先清查現有 Implementation**：SE19 → Edit → 搜尋現有的 Enhancement Implementation，了解哪些 BAdI 已被使用
- **Method 參數要仔細看**：BAdI Method 的 Importing / Changing / Exporting 參數定義了你能讀什麼、改什麼——只有 Changing 和 Exporting 的值能影響標準流程

---

## 來源筆記

- [[SAP ABAP 開發核心：RICEFW 學習路徑指南]]
- [[8. ABAP OOPS 1-109]]

**上一篇**：[[04-Enhancement-1-總覽與傳統擴充機制]] ｜ **下一篇**：[[04-Enhancement-3-Enhancement-Framework]]
