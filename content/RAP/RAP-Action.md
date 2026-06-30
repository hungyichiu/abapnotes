---
tags:
  - abap
  - rap
  - SAP
created: 2026-04-29
status: active
area: resources
publish: true
---

# SAP RAP Action 開發實戰筆記：兩層式架構

## 1. 概覽 (Overview)
在 SAP RAP 的兩層式架構（Managed Scenario）中，Action 的開發需遵循從 **UI 定義** 到 **底層宣告**，再到 **投影層暴露**，最後 **後端實作** 的順序。

---

## 2. 開發五部曲 (Step-by-Step)

### 第一步：Metadata Extension (UI 佈局)
在 MDE 中定義按鈕在 Fiori UI 上的位置。
- **檔案**: `ZCH_C_STUDENT` (MDE)
```abap
annotate view ZCH_C_STUDENT with 
{
  @UI.lineItem: [
    { type: #FOR_ACTION, dataAction: 'setAdmitted', label: '錄取學生', position: 10 }
  ]
  @UI.identification: [
    { type: #FOR_ACTION, dataAction: 'setAdmitted', label: '錄取學生', position: 10 }
  ]
  StudentId;
}
```

### 第二步：Interface BDEF (底層行為定義)
在基底行為定義中宣告 Action 的屬性。
- **檔案**: `ZCH_I_STUDENT` (Base BDEF)
- **注意**: 若加上 `(features:instance)`，則必須在 BP 中實作控制邏輯，否則預覽會 Dump。
```abap
define behavior for ZCH_I_STUDENT alias Student
{
  // 定義動作：名稱、特徵控制、回傳值
  action ( features : instance ) setAdmitted result [1] $self;
}
```

### 第三步：Consumption BDEF (投影層暴露)
將底層定義好的行為「投影」到消費層，供 OData Service 使用。
- **檔案**: `ZCH_C_STUDENT` (Projection BDEF)
```abap
define behavior for ZCH_C_STUDENT alias Student
{
  use action setAdmitted;
}
```

### 第四步：Behavior Pool (ABAP 邏輯實作)
在 Local Types 中實作 Action 觸發後的變更與按鈕狀態控制。
- **檔案**: `ZBP_CH_I_STUDENT` (Behavior Pool)

#### 4.1 實作 Action 邏輯 (`FOR MODIFY`)
```abap
METHOD setAdmitted.
  " 1. 更新資料庫欄位
  MODIFY ENTITIES OF zch_i_student IN LOCAL MODE
    ENTITY Student UPDATE FIELDS ( Status )
    WITH VALUE #( FOR key IN keys ( %tky = key-%tky Status = abap_true ) )
    FAILED failed REPORTED reported.

  " 2. 重新讀取資料以更新 UI
  READ ENTITIES OF zch_i_student IN LOCAL MODE
    ENTITY Student ALL FIELDS WITH CORRESPONDING #( keys )
    RESULT DATA(lt_students).

  " 3. 回填結果
  result = VALUE #( FOR ls IN lt_students ( %tky = ls-%tky %param = ls ) ).
ENDMETHOD.
```

#### 4.2 實作按鈕控制 (`FOR INSTANCE FEATURES`)

```abap
METHOD get_instance_features.
  " 讀取狀態以決定按鈕是否可用
  READ ENTITIES OF zch_i_student IN LOCAL MODE
    ENTITY Student FIELDS ( Status ) WITH CORRESPONDING #( keys )
    RESULT DATA(lt_students).

  result = VALUE #( FOR ls IN lt_students (
    %tky = ls-%tky
    %action-setAdmitted = COND #( WHEN ls-Status = abap_true 
                                  THEN if_abap_behv=>fc-o-disabled 
                                  ELSE if_abap_behv=>fc-o-enabled )
  ) ).
ENDMETHOD.
```

---

## 3. 常見錯誤排查 (Troubleshooting)

### 錯誤現象：Preview 資料無法顯示 (Short Dump)
- **錯誤碼**: `CX_RAP_HANDLER_NOT_IMPLEMENTED`
- **原因**: 在 BDEF 定義了 `(features : instance)` 但 BP 類別中缺少 `get_instance_features` 方法。
- **解決方案**: 
  1. 在 BP 中使用 **Ctrl+1 (Quick Fix)** 補齊方法骨架。
  2. 或暫時在 BDEF 移除 `(features : instance)`。

---

## 4. 關鍵術語總結

| 術語 | 說明 |
|---|---|
| `%tky` | Transactional Key，自動處理 Draft 與 Active 資料 |
| `LOCAL MODE` | 跳過權限與特徵檢查，適合在 Handler 內部操作 |
| `$self` | Action 執行後回傳目前的 Entity 實例 |
