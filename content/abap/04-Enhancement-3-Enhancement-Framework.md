---
title: "Enhancement Framework：Implicit 與 Explicit 擴充"
description: "Enhancement 系列第 3 篇，說明 Enhancement Framework 的 Implicit 與 Explicit 擴充、Enhancement Point 與 Section 的差別、SE38 建立步驟與 SPAU_ENH 升級確認，並整理查找擴充點的順序。"
keywords:
  - Enhancement Framework
  - Implicit Enhancement
  - Enhancement Point Section
  - SPAU_ENH
  - SE19
tags:
  - SAP
  - ABAP
  - Enhancement
created: 2026-05-15
status: active
area: public
publish: false
source:
  - "[[ABAP-學習-開發核心：RICEFW 學習路徑指南]]"
---

> Enhancement 系列共三篇：[[04-Enhancement-1-總覽與傳統擴充機制|總覽與傳統擴充機制]] → [[04-Enhancement-2-BAdI|BAdI]] → Enhancement Framework(本篇)

## 【So What】為什麼還需要第四代

前兩篇的 User Exit、Customer Exit、BAdI 都是 SAP 預先定義好的掛載點，只能在 SAP 決定的位置插入邏輯。但實務上常遇到「這個地方沒有任何 Exit 或 BAdI，但我就是需要在這裡加邏輯」的情況。

Enhancement Framework 是第四代擴充機制，解決的正是這個問題。它讓幾乎任何 FORM、Function Module、Method 的開頭或結尾都能掛載自訂邏輯，不需要 SAP 事先預留。

---

## 【What】先認得三個名詞

SE18、SE19 會一直看到這三個名詞。

- **Enhancement Spot**：SAP 定義的擴充點容器，一個 Spot 裡有一個或多個可掛載的位置。在 SE18 查。
- **Enhancement Implementation**：你寫的那段邏輯的容器。在 SE19 建，一個 Implementation 可以掛在一個或多個位置。
- **Composite Enhancement Spot／Implementation**：把多個 Spot 或 Implementation 分組管理用的，純粹是整理用，新手可以先不管。

---

## Implicit Enhancement（隱式擴充）

每個 FORM、Function Module、Method 的開頭與結尾，SAP 自動預留了 Implicit Enhancement Option。不需要 SAP 預先定義，任何地方都可以掛。

1. 在 SE38 以**顯示模式**開啟目標程式（不要進 Edit 模式，標準程式進 Edit 會被要求 access key）
2. 按工具列的 **Enhance** 按鈕（螺旋圖示，Shift+F4）進入 Enhancement 模式
3. 選單：**Edit → Enhancement Operations → Show Implicit Enhancement Options**
4. 畫面上會出現所有可掛載位置（綠色小三角形）
5. 游標停在目標位置 → **Edit → Enhancement Operations → Create Implementation** → 選 Code → 輸入 Implementation 名稱

第 2 步沒做，第 3 步的選單不會出現。

```abap
ENHANCEMENT 1  Z_CHECK_VENDOR_TAX.
  " 在標準 FORM 結尾加入稅籍編號格式驗證
  IF ls_lfa1-stcd1 IS NOT INITIAL.
    PERFORM validate_tax_id USING ls_lfa1-stcd1.
  ENDIF.
ENDENHANCEMENT.
```

Implicit Enhancement 只能用掛載位置看得到的變數。範例裡的 `ls_lfa1` 要先看那個 FORM 的前後文確認存在，不是每支標準程式都叫這個名字。

---

## Explicit Enhancement（顯式擴充）

SAP 在標準程式中預先定義的擴充點，提供有語意的掛載位置。寫在程式裡有兩種形式。

```abap
" 形式一：Enhancement Point，在這個位置「加」程式碼
ENHANCEMENT-POINT ep_check_vendor SPOTS es_my_program.

" 形式二：Enhancement Section，用你的程式碼「取代」這一段
ENHANCEMENT-SECTION es_calc_price SPOTS es_my_program.
  " SAP 原本的程式碼
END-ENHANCEMENT-SECTION.
```

- **Point**：你的邏輯在這個位置插入，SAP 原本的程式碼照跑。
- **Section**：有 Implementation 時，SAP 原本那段完全不跑，只跑你的。要改標準邏輯而不是加邏輯時用這個。

建立 Implementation 的步驟：

1. 在 SE38 顯示模式按 Enhance 進入 Enhancement 模式
2. 游標停在 `ENHANCEMENT-POINT` 或 `ENHANCEMENT-SECTION` 那行 → **Edit → Enhancement Operations → Create Implementation**
3. 輸入 Implementation 名稱和說明，存進 Package 和 Transport
4. 在打開的 `ENHANCEMENT … ENDENHANCEMENT` 區塊裡寫邏輯，Activate

也可以先在 SE18 用 Spot 名稱查這個擴充點有哪些位置，再從 SE19 建 Implementation。

---

## 常見陷阱

**陷阱一：多個 Enhancement 的執行順序**

同一個位置可以有多個 Implementation，執行順序不保證。不要讓兩個 Implementation 互相依賴，要有順序就併成一個。

**陷阱二：Transport 時遺漏 Implementation**

Enhancement Framework 的 Implementation 需要被正確納入 Transport Request，遺漏會導致上線後掛載的邏輯沒有生效。

**陷阱三：系統升級後要逐一重新確認**

SAP 升級或打 Support Package 後，被掛了 Implicit Enhancement 的標準程式如果有改，系統會在 `SPAU_ENH` 列出來，要你逐一確認還掛得對不對。這是 Implicit 「語意不清」的實際代價，掛得越多，升級時要看的越多。

---

## 實作提醒

- **命名規範**：Enhancement 名稱建議包含業務說明，例如 `Z_VENDOR_TAX_CHECK`，而非 `Z_ENH_001`
- **Implicit Enhancement 雖然靈活，但語意不清**：能用 BAdI 解決的需求，優先使用 BAdI（見 [[04-Enhancement-2-BAdI]]）；Implicit Enhancement 適合用在真的找不到其他掛載點的情況

---

## 【What For】系列結語：遇到需求時先查哪一代

三篇看完，實務上拿到一個「要在標準流程裡加邏輯」的需求，照這個順序查。

1. **先找 BAdI**（SE18）。有就用，語意最清楚、可以多個實作。
2. **再找 Explicit Enhancement Point／Section**（SE80 看 Enhancement Spots）。SAP 預留的位置，升級時最穩。
3. **再找 Customer Exit**（SMOD）。舊模組常常只有這個，但一個 exit 只能有一個 project 用，接手時先看 CMOD 有沒有人佔了。
4. **都沒有才用 Implicit Enhancement**。記得升級時 `SPAU_ENH` 要回來看。
5. **直接改標準程式是最後的最後**，而且要先問過能不能申請 access key。

---

## 系列導覽

**上一篇**：[[04-Enhancement-2-BAdI]]
