---
title: Module Pool Programming 基礎：PBO/PAI 與對話框設計
tags:
  - SAP
  - ABAP
created: 2026-07-16
status: evergreen
area: public
publish: false
source: "[[ABAP-課程-7. Module Pool Programming 1-49]]"
description: 整理 ABAP Module Pool 基礎：PBO/PAI 事件模型、Subscreen、Modal Dialog Box、畫面堆疊行為、AT EXIT-COMMAND 與 CHAIN/ENDCHAIN，開發對話框畫面前必懂的機制。
keywords:
  - ABAP Module Pool
  - PBO PAI
  - Subscreen
  - Modal Dialog Box
  - CHAIN ENDCHAIN
---

## 前言

ALV Report 能處理大部分的查詢與清單需求，但遇到需要客製化輸入畫面、多步驟操作流程（例如先輸入單號、再跳到明細畫面確認）的場景，就得靠 Module Pool Programming（也叫 Dialog Programming）。

這篇整理 Module Pool 最基礎的事件模型、畫面切換與對話框設計。Table Control、動態篩選這些進階應用都建立在這些機制上，放在 [[Module-Pool-進階-TableControl與動態篩選|進階篇]]。

---

## 【So What】為什麼 Module Pool 需要自己的一套事件模型

一般的 ABAP Report 是「執行一次、跑完結束」，但畫面程式不一樣。使用者可能在畫面上按 F4、按 Enter、切換 Tab，程式得對每個動作分別反應。

Module Pool 因此設計了一套固定的事件（Event）來對應這些互動時機，而不是像 Report 一樣線性執行到底。

---

## 【What】Module Pool 的核心事件

Module Pool 是一組 Screen（畫面）、Include、Transaction 組合起來的程式集合，本質上是「一堆畫面的集合」。每個畫面在不同時機會觸發不同事件：

- **PBO（Process Before Output）**：畫面顯示前觸發，通常用來設定 PF-Status、Title、初始值
- **PAI（Process After Input）**：使用者在畫面上做完動作後觸發，通常用來讀取輸入、判斷按鈕、跳轉畫面
- **POV（Process On Value-Request）**：使用者按 F4 時觸發
- **POH（Process On Help-Request）**：使用者按 F1 時觸發

POV、POH 牽涉到 F4/F1 客製化的實作，留到 [[Module-Pool-進階-TableControl與動態篩選|進階篇]] 的 F4/F1 Help 段落再展開。這篇先專注在 PBO/PAI 這組最基礎的事件。

要執行 Module Pool 程式，必須先建立對應的 Transaction Code（`SE93`），單純的 Program 沒辦法直接執行畫面程式。

### PF-Status 與 Title 設定

PBO 階段最常見的動作是設定畫面的功能鍵與標題：

```abap
MODULE STATUS_0100 OUTPUT.
  SET PF-STATUS 'HEADER'.
  SET TITLEBAR 'HDR'.
ENDMODULE.
```

### PAI 判斷使用者動作並跳轉畫面

```abap
MODULE USER_COMMAND_0100 INPUT.
  CALL SCREEN '0200'.
ENDMODULE.
```

---

## Subscreen：把畫面拆成可重複使用的區塊

Subscreen 是指把一塊畫面區域獨立出來、可以在不同主畫面裡重複掛載的畫面元件。做法分兩步：

1. 在主畫面上劃出一塊 Subscreen Area
2. 在 Flow Logic 裡把指定的 Subscreen 呼叫進這塊區域

```abap
CALL SUBSCREEN SUB INCLUDING SY-REPID '0101'.
```

`SUB` 是 Subscreen Area 的名稱，`SY-REPID` 是系統變數（目前程式的 Report ID），`'0101'` 是要掛載的 Subscreen 編號。

---

## Modal Dialog Box：彈出視窗

Modal Dialog Box 是指彈出式的小視窗，常用在需要使用者確認、但不想跳整頁畫面的場景。呼叫方式是在 `CALL SCREEN` 加上座標範圍：

```abap
CALL SCREEN 0200 STARTING AT 10 20   " 左上角座標
                 ENDING AT 50 60.    " 右下角座標
```

關閉並返回上一層畫面則用：

```abap
LEAVE TO SCREEN 0.
```

---

## 畫面堆疊：CALL SCREEN 與 LEAVE TO SCREEN 的行為差異

畫面之間的切換是一個 **後進先出（LIFO，Last In First Out）的堆疊**，每一次 `CALL SCREEN` 就多疊一層。

- `CALL SCREEN` 會把新畫面壓進堆疊最上層。
	- 原本的畫面留在堆疊裡，等新畫面結束後再回來。
- `LEAVE TO SCREEN 0` 會結束目前這一層，回到 `CALL SCREEN` 的呼叫點。
	- 只有在沒有上層畫面（也就是最外層）時，才會結束整個 Transaction。
- `LEAVE TO SCREEN nnnn` 是結束目前畫面，在**同一層**改跑畫面 nnnn。
	- 它不會往回翻堆疊，堆疊層數不變，只是換了這一層正在顯示的畫面。
	- 效果等於 `SET SCREEN nnnn.` 加 `LEAVE SCREEN.`。只寫 `SET SCREEN nnnn.` 不接 `LEAVE SCREEN` 的話，會先跑完目前 PAI 剩下的程式碼才換畫面。

巢狀呼叫多層畫面之後，`LEAVE TO SCREEN` 到底會停在哪一層容易搞混。拿不準時直接用除錯器看畫面堆疊的即時狀態。

---

## AT EXIT-COMMAND：跳過輸入檢查直接離開

`AT EXIT-COMMAND` 是指讓按鈕觸發 PAI 時跳過輸入欄位自動檢查（Input Check）、直接離開畫面的機制，適合「返回」「取消」這類不需要驗證輸入就該離開的按鈕。做法是把按鈕的 Function Type 設為 `E`（Exit），並在 Flow Logic 裡宣告：

```abap
PROCESS AFTER INPUT.
  MODULE EXIT AT EXIT-COMMAND.
  MODULE USER_COMMAND_0100.
```

```abap
MODULE exit INPUT.
  LEAVE TO TRANSACTION 'ZTC5_28'.   " ZTC5_28 是課程環境的主選單 T-Code，換成你自己的；只想關掉這個畫面就用 LEAVE TO SCREEN 0
ENDMODULE.
```

---

## CHAIN / ENDCHAIN：多欄位驗證後仍可編輯

`CHAIN`/`ENDCHAIN` 是指把相關欄位包起來一起驗證、驗證失敗後畫面仍保持可編輯狀態的語法結構，用來解決一般驗證邏輯「跳出錯誤訊息後畫面就被鎖住」的問題：

```abap
CHAIN.
  FIELD: zordh_28-ono,
         zordh_28-odate.
  MODULE validate ON CHAIN-REQUEST.
ENDCHAIN.
```

這樣即使驗證失敗跳出錯誤訊息，`CHAIN` 裡的兩個欄位依然保持可輸入狀態，不會被系統自動鎖死。

`ON CHAIN-REQUEST` 是這組欄位有任何一個被使用者改過才跑 `MODULE`；`ON CHAIN-INPUT` 則是有任何一個欄位有值就跑。驗證「使用者剛改了什麼」用前者，驗證「欄位有沒有填」用後者。

> 這段 `CHAIN`/`ENDCHAIN` 語法是依標準用法整理，實際專案裡的寫法建議對照自己測試過的版本再確認一次。

---

## 【What For】開發時的實戰注意事項

1. **先確認有沒有建 Transaction Code**。
	- 寫完 Module Pool 程式卻沒辦法執行，第一件事先檢查 `SE93` 有沒有建對應的 T-Code。
	- 順便確認 Screen Number 有設定成起始畫面。
2. **Subscreen 記得同時處理兩邊的 Flow Logic**。
	- Subscreen Area 跟被呼叫的 Subscreen 各自都有自己的 PBO/PAI，兩邊都要設定。
	- 缺一邊很容易出現空白畫面。
3. **Modal Dialog 的座標單位是字元的欄與列，不是像素**。
	- `STARTING AT`/`ENDING AT` 的數字要多測試幾次才會抓到合適的視窗大小。
4. **畫面堆疊搞混時，直接開除錯器看**。
	- 在除錯模式下觀察堆疊狀態，比猜 `LEAVE TO SCREEN` 會跳到哪一層準。

---

## 常見問題

**CALL SCREEN 跟 LEAVE TO SCREEN 的差別是什麼？**
`CALL SCREEN` 會在畫面堆疊上多疊一層；`LEAVE TO SCREEN 0` 把目前這層收掉、回到呼叫點；`LEAVE TO SCREEN nnnn` 不動層數，只把這一層換成畫面 nnnn。

**為什麼 Module Pool 程式一定要建 Transaction Code？**
因為 Module Pool 是畫面程式，不像一般 Report 可以直接執行。必須透過 `SE93` 建立對應的 T-Code 並指定起始畫面，系統才知道要從哪個 Screen 開始。

---

## 相關閱讀

- [[Module-Pool-進階-TableControl與動態篩選]]：Table Control、F4/F1 Help、動態下拉選單
