---
title: Module Pool Programming 進階：Table Control 與動態篩選
tags:
  - SAP
  - ABAP
created: 2026-07-16
status: active
area: public
publish: true
source: "[[ABAP-課程-7. Module Pool Programming 1-49]]"
description: 整理 ABAP Table Control 的 Flow Logic、Tab Strip、LOOP AT SCREEN 動態欄位、下拉選單依上層欄位動態篩選（VRM_SET_VALUES）、F4/F1 Help 客製化，附程式碼範例。
keywords:
  - ABAP Table Control
  - Tab Strip
  - VRM_SET_VALUES
  - F4 Help
  - LOOP AT SCREEN
---

## 前言

搞懂 [[Module-Pool-基礎-對話框設計|PBO/PAI 這組基礎事件]]後，實務上的 Module Pool 開發多半會碰到更複雜的畫面需求：一次顯示多筆資料、依條件動態隱藏欄位、下拉選單要依上層欄位動態篩選。

這篇整理 Table Control、Tab Strip、動態欄位屬性、動態篩選的下拉選單、F4/F1 Help 這幾個進階應用。

---

## 【So What】為什麼這些應用都要多寫一層邏輯

基礎的 Module Pool 畫面欄位是「靜態」的，欄位長什麼樣子、能不能編輯，在 Screen Painter 設計階段就固定了。

但 Table Control（多筆資料）、動態隱藏欄位、下拉選單這幾個需求，都要求畫面「依資料或條件變化」。這沒辦法只靠 Screen Painter 設計完成，得在 PBO/PAI 裡額外寫邏輯去操控畫面元素。

---

## 【What】Table Control：用表格顯示多筆資料

Table Control 讓一個畫面欄位區塊可以顯示多筆資料列，而不是像一般欄位只能顯示單筆。建立時透過 Screen Painter 的 Table Control Wizard，需要指定：

- **Internal Table**：畫面資料來源（如 `LT_DATA1`）
- **Work Area**：單筆資料的工作區（如 `LS_DATA1`）
- **欄位對應**：Table Control 裡每一欄要對應到 Work Area 的哪個欄位

Wizard 填完只是把畫面元件和變數對起來，多筆資料要真的顯示出來、改完要寫回內表，靠的是 Flow Logic 裡 PBO 和 PAI 各一組 `LOOP … WITH CONTROL`：

```abap
" 程式裡要先宣告 Table Control（Wizard 會自動產生）
CONTROLS tc_data1 TYPE TABLEVIEW USING SCREEN 0100.

PROCESS BEFORE OUTPUT.
  MODULE status_0100.
  LOOP AT lt_data1 INTO ls_data1
       WITH CONTROL tc_data1
       CURSOR tc_data1-current_line.
  ENDLOOP.

PROCESS AFTER INPUT.
  LOOP AT lt_data1.
    MODULE modify_data1.      " 把畫面上這一列寫回內表
  ENDLOOP.
  MODULE user_command_0100.
```

```abap
MODULE modify_data1 INPUT.
  MODIFY lt_data1 FROM ls_data1 INDEX tc_data1-current_line.
ENDMODULE.
```

PBO 的 `LOOP` 把內表一列一列填進畫面列，PAI 的 `LOOP` 把畫面列一列一列寫回內表。少了 PBO 那組，畫面是空的；少了 PAI 那組，使用者改的值不會回到內表。

明細資料本身通常在進入這個畫面前就撈好，搭配 `FOR ALL ENTRIES` 一次撈出所有明細：

```abap
IF lt_data IS NOT INITIAL.
  SELECT ono oin odesc icost
    FROM zordi_28
    INTO TABLE lt_data1
    FOR ALL ENTRIES IN lt_data
    WHERE ono = lt_data-ono.
ENDIF.
```

`IF lt_data IS NOT INITIAL` 不能省。`FOR ALL ENTRIES` 遇到空的驅動表會撈出整張表。

## Tab Strip：分頁畫面

Tab Strip 是指分頁式的畫面元件，每個分頁（Tab）底層對應一個獨立的 Subscreen。

用 Screen Painter 的 Tabstrip Wizard 建立時，SAP 會自動幫每個分頁產生對應的 Subscreen 區域和切換邏輯，開發者只要把邏輯寫進各自的 Subscreen 就好。

手動建的 Tabstrip 則要自己在 PAI 依 `sy-ucomm` 設定 `tabstrip-activetab`，不然按了分頁不會切換。

## 動態調整欄位屬性：LOOP AT SCREEN

如果需要依條件動態決定某些欄位要不要顯示、能不能編輯（例如已核准的單據，欄位就該變唯讀），要在 PBO 裡用 `LOOP AT SCREEN` 逐一檢查畫面元素並修改屬性：

```abap
MODULE status_0100 OUTPUT.
  LOOP AT SCREEN.
    IF screen-name = 'ZORDH_28-ODATE' OR screen-name = 'ZORDH_28-PM'
    OR screen-name = 'ZORDH_28-TA' OR screen-name = 'ZORDH_28-CURR'.
      screen-input = 0.
      MODIFY SCREEN.
    ENDIF.
  ENDLOOP.
ENDMODULE.
```

`screen-input = 0` 代表把這個欄位設為唯讀，`MODIFY SCREEN` 才會讓修改真正生效。

## 下拉選單：靜態清單與動態篩選

**做法一：綁定 Domain 固定值（靜態）**

1. 在 Data Dictionary 的 Domain 定義 Fixed Values。
2. 在 Screen Painter 把那個欄位的 Dropdown 屬性設成 Listbox（或 Listbox with Key）。

畫面上會自動變成下拉選單，但選項內容是靜態的，要異動得改 DDIC。

**做法二：`VRM_SET_VALUES` 動態篩選**

如果下拉選項要依查詢結果或上層欄位動態變化（例如選了「州」之後，「地區」的選項要跟著篩選），就要在 PBO 用 `VRM_SET_VALUES` 動態塞值：

```abap
DATA: lt_values  TYPE vrm_values,
      lwa_values TYPE vrm_value.

LOOP AT lt_data INTO lwa_data.
  lwa_values-key  = lwa_data-region.
  lwa_values-text = lwa_data-region.
  APPEND lwa_values TO lt_values.
  CLEAR lwa_values.
ENDLOOP.

CALL FUNCTION 'VRM_SET_VALUES'
  EXPORTING
    id     = 'ZTSTATE_REGION-REGION'
    values = lt_values.
```

實作時有三個常見的坑。

- 忘記 `REFRESH lt_values`，選項一直疊加。
- 切換上層欄位後忘記 `CLEAR` 下層欄位，殘留舊值。
- `id` 參數打錯，要精確對到畫面上的 `表名-欄位名`。

## Module Pool 裡的 Select-Options

Module Pool 畫面也能嵌入類似 Report 的 Select-Options 區塊：

```abap
SELECTION-SCREEN: BEGIN OF SCREEN 200 AS SUBSCREEN.
SELECT-OPTIONS: s_ono FOR lv_ono.
SELECTION-SCREEN: END OF SCREEN 200.
```

用法跟一般 Subscreen 一樣，把這個 Selection Screen 當成 Subscreen 掛載進主畫面即可。

## F4 Help：客製化搜尋輔助

按 F4 時想要跳出自訂的候選清單，要在 Flow Logic 宣告 `PROCESS ON VALUE-REQUEST`，並在對應的 MODULE 裡呼叫 `F4IF_INT_TABLE_VALUE_REQUEST`：

```abap
PROCESS ON VALUE-REQUEST.
FIELD lv_ono MODULE f4help.
```

```abap
MODULE f4help INPUT.
  CALL FUNCTION 'F4IF_INT_TABLE_VALUE_REQUEST'
    EXPORTING
      retfield    = 'ONO'
      dynpprog    = sy-repid
      dynpnr      = sy-dynnr
      dynprofield = 'LV_ONO'
      value_org   = 'S'
    TABLES
      value_tab   = lt_ono.
ENDMODULE.
```

`value_org = 'S'` 代表 `value_tab` 是結構化的，每一列就是一筆完整紀錄，欄位順序要和候選清單的欄位一致。另一個值 `'C'` 是逐欄傳，一般用 `'S'` 就好。

## F1 Help：客製化欄位說明

按 F1 時要跳出自訂技術文件，同樣是在 Flow Logic 宣告 `PROCESS ON HELP-REQUEST`，搭配 `HELP_OBJECT_SHOW`：

```abap
PROCESS ON HELP-REQUEST.
FIELD lv_ono MODULE f1help.
```

```abap
MODULE f1help INPUT.
  CALL FUNCTION 'HELP_OBJECT_SHOW'
    EXPORTING
      dokclass = 'TX'
      dokname  = 'ZONO'.
ENDMODULE.
```

文件內容要先透過 `SE61`（文件維護）建立，`HELP_OBJECT_SHOW` 才找得到對應的說明文字。

## Radio Button 分組：整合多個入口

當畫面上有多顆 Radio Button，分別代表不同的功能入口（例如選「表頭維護」還是「明細維護」），這幾顆 Radio Button 必須先分組。沒分組的話它們互不影響，可以同時選取多顆。

- 選取畫面上所有相關的 Radio Button
- `Edit → Grouping → Radio Button Group → Define` 設定成同一組，確保同時只能選一顆

分組完成後，PAI 邏輯就能單純依照哪個變數被設為 `'X'` 來決定要跳轉到哪個 Transaction：

```abap
IF r1 = 'X'.
  LEAVE TO TRANSACTION 'ZTC1_28'.   " ZTCn_28 是課程環境的 T-Code，換成你自己的
ELSEIF r2 = 'X'.
  LEAVE TO TRANSACTION 'ZTC2_28'.
ELSEIF r3 = 'X'.
  LEAVE TO TRANSACTION 'ZTC3_28'.
ELSEIF r4 = 'X'.
  LEAVE TO TRANSACTION 'ZTC4_28'.
ENDIF.
```

---

## 【What For】開發時的實戰注意事項

1. **Table Control 的 PBO 和 PAI 兩組 `LOOP` 都要有**。
	- 畫面空白先查 PBO 那組，改的值沒回內表先查 PAI 那組。
2. **撈明細前先判斷表頭資料是否存在**。
	- `FOR ALL ENTRIES` 遇到空的驅動表會撈出整張表。
3. **`LOOP AT SCREEN` 修改屬性後一定要 `MODIFY SCREEN`**。
	- 只改 `screen-input` 不呼叫 `MODIFY SCREEN`，畫面不會有任何變化。
4. **F4/F1 Help 出問題，在按下 F4/F1 的當下開除錯器**。
	- 看 `F4IF_INT_TABLE_VALUE_REQUEST`、`HELP_OBJECT_SHOW` 實際收到的參數值對不對。

本文的程式碼是依標準用法整理，實際專案裡的寫法建議對照自己測試過的版本再確認一次。

---

## 常見問題

**Table Control 跟一般畫面欄位差在哪？**
一般欄位只能顯示單筆資料，Table Control 把一個 Internal Table 的多筆資料整批顯示成表格。顯示靠 PBO 的 `LOOP … WITH CONTROL`，寫回靠 PAI 的 `LOOP`。

**動態下拉選單為什麼要用 VRM_SET_VALUES？**
綁定 Domain 固定值的選項是靜態的。下拉選項要依查詢結果或上層欄位動態篩選，就得在 PBO 用 `VRM_SET_VALUES` 把當下算出的候選清單塞進欄位。

---

## 相關閱讀

- [[Module-Pool-基礎-對話框設計]]：PBO/PAI、Subscreen、Modal Dialog、畫面堆疊、CHAIN
