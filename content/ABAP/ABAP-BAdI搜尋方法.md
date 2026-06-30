---
tags:
  - ABAP
  - wiki
  - BAdI
  - Enhancement
created: 2026-06-29
status: active
area: wiki
publish: true
sources:
  - "[[SAP_Enhancement_筆記]]"
  - "[[ABAP-BAdIs-CheatSheet]]"
---

# SAP BAdI 搜尋方法

> 遇到客製需求，第一步是確認 SAP 有沒有提供現成的 BAdI 切入點。找對了就用，找錯了白工。以下三種方法從快到準排列。

---

## 方法一：SE18 直接搜尋

最快的起手式。開啟 **SE18**，輸入業務關鍵字（如 `MATERIAL`、`SALES`），搭配 F4 選單縮小範圍。找到候選後查看 Interface 方法名稱，判斷是否符合需求。

找不到方向時，也可以改用 **SE84**（Repository Information System）→ Enhancements → BAdI Definitions，依套件或程式名稱瀏覽全部可用的 BAdI。

---

## 方法二：SE24 執行期 Debug（最準確）

不確定哪個 BAdI 會被觸發時用這招：

1. 開啟 **SE24**，找到 `CL_EXITHANDLER` 類別的 `GET_INSTANCE` 方法
2. 在 `sy-subrc` 那行設中斷點（Break-point）
3. 執行目標 T-Code（例如 MM01 存檔）
4. SAP 每次觸發 BAdI 時都會在這裡停下來，查看 `EXIT_NAME` 變數即為當下的 BAdI 名稱

這是最可靠的方法，看到的是系統實際執行到的切入點，不是靠猜。

---

## 確認有效才實作

找到候選 BAdI 後，用 `/h` 設中斷點實際測試一次，確認業務操作真的會觸發它。確認無誤後才到 **SE19** 建立 Enhancement Implementation，寫入自訂邏輯。

> 最容易忘記的一步：實作完成後要**啟用 Implementation**，沒有啟用的程式碼不會執行。

---

## 相關概念

- [[ABAP-BAdI]] — BAdI 結構與 GET BADI / CALL BADI 語法完整說明
- [[SAP_Enhancement_筆記]] — Customer Exit vs BAdI 選擇判斷

---
*由 LLM 從來源筆記編譯，最後人工審閱：2026-06-29*
