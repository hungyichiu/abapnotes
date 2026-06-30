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

# RAP Value Help (F4) 實作指南

## 步驟總覽

| 步驟 | 檔案類型 | 目的 | 關鍵語法 |
| :--- | :--- | :--- | :--- |
| **1. 準備來源** | Provider View | 定義選單內容與描述 | `@ObjectModel.text.element` |
| **2. 建立關聯** | Interface View | 串接主表與選單表 | `association on ...` |
| **3. 定義綁定** | Consumption View | 連結 UI 與選單來源 | `@Consumption.valueHelpDefinition` |
| **4. UI 調優** | MDE | 隱藏代碼只顯示文字 | `@UI.textArrangement: #TEXT_ONLY` |

---

## 第一步：完善 Value Help Provider View

確保 Provider View 具備正確的註解，讓 Fiori 知道哪個欄位是「代碼」，哪個是「描述」。

```abap
@Search.searchable: true
define view entity ZCH_I_GENDER_STD ... {
    @Search.defaultSearchElement: true
    @ObjectModel.text.element: ['text']
    key value_low,
    
    @Semantics.text: true
    @Search.defaultSearchElement: true
    text
}
```

---

## 第二步：在 Interface View 建立關聯

在底層的 Data Model 中，將主表與性別清單串聯起來。

```abap
association [0..*] to ZCH_I_GENDER_STD as _GenderValueHelp 
  on $projection.Gender = _GenderValueHelp.value_low

// 在欄位清單中
@ObjectModel.text.association: '_GenderValueHelp'
Gender,

_GenderValueHelp  " 記得暴露關聯
```

---

## 第三步：在 Consumption View 綁定 Value Help

```abap
@Consumption.valueHelpDefinition: [{ 
    entity: { name: 'ZCH_I_GENDER_STD', element: 'value_low' } 
}]
Gender;
```

---

## 第四步：在 Metadata Extension (MDE) 優化顯示

```abap
@UI.selectionField: [{ position: 20 }]
@UI.identification: [{ position: 20 }]
@UI.textArrangement: #TEXT_ONLY   " UI 只顯示「男/女」，隱藏技術代碼「M/F」
Gender;
```

---

## 注意事項

- **語言問題**：若 Provider View 使用 `DDCDS_CUSTOMER_DOMAIN_VALUE_T`（含語言欄位），看不到文字時請確認是否加上 `@Semantics.language: true`。
- **啟動順序**：Provider View → Interface View → Consumption View → MDE，順序錯誤可能導致 Metadata 未更新。
