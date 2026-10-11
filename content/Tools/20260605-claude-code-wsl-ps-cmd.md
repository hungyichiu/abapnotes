---
title: Claude Code CLI — WSL / PowerShell / CMD 環境比較與 Alias 設定
tags:
  - claude-code
  - wsl
  - powershell
  - cli
  - tools
created: 2026-06-05
status: active
area: public
publish: true
source:
  - "[[工具-Obsidian-20250806-obsidian-plugins]]"
  - "[[工具-AI-LLM]]"
---

## 為什麼要比較這三種環境

在 Windows 上使用 Claude Code，常常需要在 WSL、PowerShell、CMD 之間切換，而路徑寫法、設定檔位置、alias 持久化方式在三者之間完全不同——用錯環境設定 alias，重開視窗就失效；弄混路徑分隔符，存取 Vault（`G:\`）時就會找不到檔案。這篇筆記整理三種環境的差異，幫助選擇日常開發最適合的殼層，並避免踩雷。

---

## 環境總覽

| 項目 | WSL (Ubuntu) | PowerShell | CMD |
|------|-------------|------------|-----|
| 安裝方式 | `npm install -g @anthropic-ai/claude-code` | 同左（需先裝 Node.js） | 同左 |
| 執行指令 | `claude` | `claude` | `claude` |
| 路徑分隔 | `/` | `\` 或 `/` | `\` |
| 設定檔位置 | `~/.claude/` | `%APPDATA%\Claude\` | 同 PS |
| Alias 支援 | `~/.bashrc` / `~/.zshrc` | `$PROFILE` | `doskey`（不持久） |
| Unicode 支援 | 完整 | 需設 UTF-8 code page | 較弱 |
| Git 整合 | 原生 | 需安裝 Git for Windows | 需安裝 Git for Windows |
| 互動體驗 | 最佳（原生 terminal） | 良好 | 基本 |
| 顏色 / 樣式 | 完整支援 | Windows Terminal 下支援 | 部分支援 |
| 推薦程度 | ★★★★★ | ★★★★☆ | ★★☆☆☆ |

---

## 各環境說明

### WSL（推薦）

在 Linux 環境下執行，行為與 macOS terminal 完全一致。適合開發 Linux-target 專案或需要完整 POSIX 工具鏈時使用。

**優點：**
- Claude Code 原生設計為 Unix 環境，體驗最完整
- 可直接存取 Linux 檔案系統，也能透過 `/mnt/c/` 存取 Windows 檔案
- Bash/Zsh alias 設定簡單且持久

**注意：**
- WSL 的 `~/.claude/` 與 Windows 的設定檔是**分開**的，API Key 需分別設定
- 存取 Windows 路徑（如 `G:\`）需透過 `/mnt/g/`

---

### PowerShell（Windows 日常推薦）

適合主要在 Windows 工作、不想切換到 WSL 的使用者。Windows Terminal + PowerShell 7 的組合體驗相當好。

**優點：**
- 可直接操作 Windows 路徑與工具（如 Azure CLI、.NET）
- Windows Terminal 下顏色與互動式 UI 顯示正常

**注意：**
- 需確認 PowerShell 版本（建議 PS 7+，`pwsh`）
- 若出現亂碼，執行 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`

---

### CMD（不推薦用於 Claude Code）

CMD 缺乏現代 terminal 功能，互動式 UI（如選單、顏色）會顯示異常。僅在沒有其他選項時使用。

---

## Alias 設定

### WSL — Bash (`~/.bashrc`) 或 Zsh (`~/.zshrc`)

```bash
# 編輯設定檔
nano ~/.bashrc   # 或 ~/.zshrc

# 加入以下內容
alias cc='claude'
alias ccc='claude --continue'    # 繼續上次對話
alias ccr='claude --resume'      # 互動選擇對話恢復
alias ccp='claude --print'       # 非互動模式，直接輸出結果

# 儲存後重新載入
source ~/.bashrc
```

**驗證：**
```bash
which claude     # 確認安裝路徑
cc --version     # 測試 alias
```

---

### PowerShell — `$PROFILE`

PowerShell 的 alias 需寫入 profile 檔才能持久。

**步驟：**

```powershell
# 1. 確認 profile 檔路徑
echo $PROFILE
# 通常是：C:\Users\<你的名字>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1

# 2. 建立 profile（若不存在）
New-Item -ItemType File -Path $PROFILE -Force

# 3. 開啟編輯
notepad $PROFILE
```

**在 profile 中加入：**

```powershell
# Claude Code Aliases
function cc { claude @args }
function ccc { claude --continue @args }
function ccr { claude --resume @args }
function ccp { claude --print @args }

# 可選：設定 UTF-8（避免中文亂碼）
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

> PowerShell 的 `alias` 內建指令不支援帶參數，必須用 **function** 包裝。

**儲存後重新載入：**
```powershell
. $PROFILE
# 或重開 PowerShell 視窗
```

**若出現 ExecutionPolicy 錯誤：**
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

### CMD — `doskey`（僅本次 session）

CMD 的 alias 不會持久，僅供臨時使用：

```cmd
doskey cc=claude $*
doskey ccc=claude --continue $*
```

若要讓 CMD 每次開啟都自動載入，需設定登錄機碼，不建議為了 Claude Code 特地這樣做。

---

## 常用 Claude Code 指令備忘

```bash
claude                      # 開啟互動對話
claude "問題內容"            # 單次問答
claude --continue           # 繼續上次對話
claude --resume             # 從清單選擇要恢復的對話
claude --print "問題"       # 非互動，直接輸出（適合腳本）
claude --model claude-opus-4-8  # 指定模型
claude config               # 查看目前設定
```

---

## 建議工作流程

```
日常開發（Windows）
  └─ Windows Terminal
       ├─ PowerShell 分頁 → 執行 Windows 工具、Git
       └─ WSL 分頁 → 執行 claude、Node、Linux 工具

存取 Vault（G:\）時：
  PS：直接用 G:\路徑
  WSL：用 /mnt/g/路徑
```
