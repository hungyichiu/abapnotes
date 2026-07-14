---
title: "Enhancement Framework：Implicit 與 Explicit 擴充"
tags:
  - SAP
  - ABAP
  - Enhancement
created: 2026-05-15
status: active
area: resources
publish: true
---

# Enhancement Framework：Implicit 與 Explicit 擴充

> Enhancement 系列共三篇：[[04-Enhancement-1-總覽與傳統擴充機制|總覽與傳統擴充機制]] → [[04-Enhancement-2-BAdI|BAdI]] → Enhancement Framework(本篇)

## 為什麼還需要第四代

前兩篇的 User Exit、Customer Exit、BAdI 都是 SAP **預先定義好**的掛載點——只能在 SAP 決定的位置插入邏輯。但實務上常遇到「這個地方沒有任何 Exit 或 BAdI，但我就是需要在這裡加邏輯」的情況。Enhancement Framework 是第四代擴充機制，解決的正是這個問題：讓幾乎任何 FORM、Function Module、Method 的開頭或結尾都能掛載自訂邏輯，不需要 SAP 事先預留。

---

## Implicit Enhancement（隱式擴充）

每個 FORM、Function Module、Method 的開頭與結尾，SAP 自動預留了 Implicit Enhancement Spot。不需要 SAP 預先定義，任何地方都可以掛：

1. 在 SE38 開啟目標程式
2. 進入 Edit 模式
3. 選單：**Edit → Enhancement Operations → Show Implicit Enhancement Options**
4. 畫面上會出現所有可掛載位置（綠色小三角形）
5. 點擊目標位置 → Create Enhancement → 輸入 Enhancement 名稱

```abap
ENHANCEMENT 1  Z_CHECK_VENDOR_TAX.
  " 在標準 FORM 結尾加入稅籍編號格式驗證
  IF ls_lfa1-stcd1 IS NOT INITIAL.
    PERFORM validate_tax_id USING ls_lfa1-stcd1.
  ENDIF.
ENDENHANCEMENT.
```

---

## Explicit Enhancement（顯式擴充）

SAP 在標準程式中預先定義的擴充點（Enhancement Spot），提供有語意的掛載位置：

```abap
" 標準程式中的 Explicit Enhancement Spot（SAP 定義）
ENHANCEMENT-POINT my_spot SPOTS es_my_program.
```

在 SE18 可以查詢現有的 Enhancement Spot，在 SE19 建立 Implementation。

---

## 常見陷阱

**陷阱一：多個 Enhancement 的執行順序**

同一個 Enhancement Spot 可以有多個 Implementation，執行順序由系統決定。如果多個 Enhancement 互相依賴，需要特別注意順序控制（可透過 Implementation Priority 設定）。

**陷阱二：Transport 時遺漏 Implementation**

Enhancement Framework 的 Implementation 需要被正確納入 Transport Request，遺漏會導致上線後掛載的邏輯沒有生效。

---

## 實作提醒

- **命名規範**：Enhancement 名稱建議包含業務說明，例如 `Z_VENDOR_TAX_CHECK`，而非 `Z_ENH_001`
- **Implicit Enhancement 雖然靈活，但語意不清**：能用 BAdI 解決的需求，優先使用 BAdI（見 [[04-Enhancement-2-BAdI]]）；Implicit Enhancement 適合用在真的找不到其他掛載點的情況

---

## 來源筆記

- [[SAP ABAP 開發核心：RICEFW 學習路徑指南]]

**上一篇**：[[04-Enhancement-2-BAdI]]
