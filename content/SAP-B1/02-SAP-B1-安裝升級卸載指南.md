---
title: "SAP B1 安裝前檢查、升級與完整卸載指南"
tags:
  - SAP
  - B1
created: 2026-03-03
status: active
area: public
publish: true
source:
  - "[[B1-安裝-安裝TIPS]]"
  - "[[B1-安裝-安裝項目]]"
  - "[[B1-安裝-如何完整移除SAP B1 和 SQL Server]]"
  - "[[B1-full-uninstall]]"
  - "[[B1-使用第三方應用移除B1 安裝元件]]"
  - "[[B1-安裝-版本支援規格查詢]]"
---

## 【So What】安裝不乾淨，問題會留到下一次

SLD 無法連線、DI API 報錯、升級後 Client 端打不開，很多時候根本原因是前一次安裝或卸載留下的殘留：`SBO-COMMON`、`SLDData` 沒刪、登錄檔還在、服務沒清。

這篇整理三件事：安裝前要查什麼、升級前要備份什麼、卸載要清到哪裡。每一步都說為什麼，出問題時才判斷得出根因。

---

## 【What】一、安裝前環境檢查

安裝前的環境確認，決定了後續安裝是否順暢。跳過這個步驟，往往要在安裝到一半時才發現問題，代價更高。

### 版本相容性確認

SAP B1 的版本與作業系統、SQL Server 版本之間有嚴格的相容性矩陣。查詢方式：

1. 前往 SAP Support Portal（support.sap.com）
2. 進入 **Product Availability Matrix（PAM）**
3. 輸入目標版本號，確認支援的 OS 與 DB 版本

常見錯誤：使用 Windows Server 2019 搭配過舊版本的 SAP B1，或使用不在支援清單內的 SQL Server 版本，都可能導致安裝後出現不明錯誤。

### 安裝環境基本要求

- 確認伺服器的 Windows 版本、記憶體、磁碟空間符合 SAP 規格。
- 確認網路設定：伺服器的**主機名稱（Hostname）** 必須能被 Client 端正確解析，否則 SLD 連線會出問題。
- 確認防火牆規則：預設需開放 Port 40000（SLD）、1433（SQL Server）等。
- 安裝前先清理 `%temp%` 資料夾，避免舊的安裝暫存檔干擾。

---

## 二、資料庫選型：SQL Server vs HANA

選擇資料庫平台是安裝前最重要的架構決策，兩者的管理方式與後續維護成本差異很大。

| 比較面向 | SQL Server | SAP HANA |
|----------|-----------|----------|
| 部署環境 | Windows Server | Linux（SUSE 為主） |
| 管理工具 | SSMS（SQL Server Management Studio） | HANA Studio / Web IDE |
| 授權 | SAP B1 授權 + SQL Server 授權 | SAP B1 授權 + HANA 授權（臨時授權有期限，要換正式的） |
| 適合規模 | 中小型企業，顧問生態較成熟 | 有大量即時分析需求的企業 |
| 台灣市場現況 | 主流選擇 | 需搭配 Linux 維運能力 |

**HANA 版特別注意**：HANA 資料庫裝好時是臨時授權，期限通常是 90 天（以 SAP 核發通知為準），到期前要掛上正式授權，否則資料庫會鎖定。掛載要在 Linux 主機透過指令操作。

---

## 安裝順序

新環境從零開始裝，順序是這樣，順序錯了 SLD 會連不到資料庫：

1. 先裝好 SQL Server（或 HANA），確認 `sa` 可以登入、混合驗證模式有開。
2. 在伺服器執行 B1 安裝光碟的 Setup Wizard，選 **Server**，裝 Server Tools：SLD、License Service、Service Layer 這些都在裡面。
	- 過程中會要你設 Site User（`B1SiteUser`）密碼，記下來，之後進 SLD 和授權管理都要用。
3. Setup Wizard 接著建 `SBO-COMMON` 和示範公司資料庫，並在 SLD 註冊這台資料庫伺服器。
4. 最後在 Client 電腦裝 Client，或從伺服器的共用資料夾 `B1_SHR` 安裝。
	- 要寫 Add-on 或用 DTW 的機器，再用 Components Wizard 補裝 DI API。

裝完先用示範公司登入一次，確認 SLD、授權、Client 三者都通，再匯客戶資料。

---

## 【What For】三、升級備份策略

升級是所有維護作業中風險最高的一環，備份要做足。

### 升級前必做備份

1. **完整備份所有公司資料庫（Company DB）**。
2. **備份 `SBO-COMMON`**。
	- 這個資料庫存放授權、使用者、公司清單等系統設定，遺失後無法從應用程式層重建。
	- 升級失敗要退回舊版時，`SBO-COMMON` 已經被新版改過，沒有備份就全部公司連不上。
3. **備份 SLD 資料庫（`SLDData`）**。
	- 存放所有資料庫連線設定，升級後若連線異常可以還原。
4. **記錄當前版本號**。
	- 升級失敗時要知道退回哪個版本。
5. **備份客製化設定**。
	- Crystal Report 範本、PLD 版面、附件資料夾內容。

### 升級作業流程

1. 在測試環境先行驗證升級流程，永遠不要第一刀在正式環境。
	- 測試機規格跟正式環境一樣，用正式環境的資料庫備份當測試資料。
	- 這樣才能提前發現 B1UP、DI API 這些客製化和新版本的相容問題。
2. 關閉所有使用者連線。
3. 用 B1 安裝光碟的 **Setup Wizard** 選 Upgrade 執行升級（9.x 叫 Upgrade Wizard），不要手動替換 DLL 檔案。
	- Components Wizard 是裝、移除單機元件（Client、DI API）用的，不是升級工具。
4. 升級完成後，Client 端登入時會偵測到版本不一致並自動升級。
	- 自動升級失敗（通常是權限或共用資料夾 `B1_SHR` 連不到）才需要手動重裝 Client。
5. 驗證關鍵功能：登入、主要交易文件的新增、報表執行。

---

## 四、完整卸載步驟

「完整」卸載的意義在於：不只移除應用程式，還要清除資料庫和登錄檔殘留。許多安裝問題源自上一次不乾淨的卸載。

### 標準卸載流程

**Step 1：用 Setup Wizard 或 Components Wizard 執行 Uninstall**

這是 SAP 官方的卸載入口，會處理大部分的應用程式元件。伺服器端用安裝光碟的 Setup Wizard 選 Uninstall；單機元件用安裝目錄下 `Packages.x64` 資料夾裡的 Components Wizard。

![[SAP Business one 安裝項目.webp|800]]

安裝光碟的 `Packages.x64` 底下就是各元件的安裝包。

**Step 2：從「已安裝的應用程式」逐一移除殘留**

Wizard 跑完後，進入控制台的「應用程式與功能」，移除所有仍顯示為已安裝的 SAP Business One 相關項目。

以下兩個元件**例外，不要移除**，它們常被別的軟體共用，移掉可能害到其他程式，新版安裝時會自己處理：
- Remote Support Platform for SAP Business One
- SAP Crystal Reports Runtime

**Step 3：刪除 SQL Server 中的系統資料庫**

在 SSMS 中，手動刪除以下資料庫：
- **SBO-COMMON**：B1 的共用系統資料庫，存放所有公司的基本設定。
- **SLDData**：SLD（System Landscape Directory）的資料庫，存放所有公司的 DB 連線資訊。

這兩個資料庫 Wizard 不會自動刪，必須手動處理。只移除應用程式卻留下它們，下次重裝時 SLD 的初始化會因為舊資料庫已存在而失敗。

**Step 4：刪除 SAP 相關資料夾**

```
C:\Program Files\SAP\
C:\Program Files (x86)\SAP\
C:\ProgramData\SAP\
```

**Step 5：清理 Windows 服務**

開啟命令提示字元（以系統管理員身分），確認是否有殘留的 SAP 服務，若有則手動刪除：

```cmd
sc delete "服務名稱"
```

**Step 6：清理暫存資料夾並重新啟動**

清空 `%temp%`，重新啟動系統，再進行新版本的安裝。重啟不能省，有些服務的刪除要重啟才生效，跳過的話新版安裝時會出現莫名其妙的權限衝突。

---

## 五、第三方工具強制移除

當 SAP 元件已損毀或無法正常解除安裝（例如安裝到一半中斷、DI API 殘留），標準卸載流程無效時，需要使用第三方工具。

| 工具 | 特點 | 適用情境 |
|------|------|----------|
| Revo Uninstaller | 免費版可強制移除殘留登錄檔 | 首選，最適合清除卡住的 SAP 元件 |
| Geek Uninstaller | 免安裝綠色工具，輕巧快速 | 需要即點即用的情境 |
| IObit Uninstaller | 介面友善，有免費版 | 新手適用 |

IObit 安裝時注意略過推廣軟體。

使用 Revo Uninstaller 時，搜尋「SAP Business One」可以找出所有殘留項目，包括控制台中看不到的元件，一次清除。

---

## 相關閱讀

- [[25-SAP-B1-授權管理]]：裝好之後的授權申請與更新
