import { SocialImageOptions } from "./og"
import { getFontSpecificationName } from "./theme"

// 每篇文章的預覽圖（og:image），配色對齊網站：黑白＋橘 #FF6B00
// satori 只支援 flex 排版，有多個子元素的 div 都要 display: flex

const ORANGE = "#FF6B00"
const ORANGE_TEXT = "#B34700"
const GRAY = "#737373"
const SITE_URL = "hungyichiu.github.io/abapnotes"
const AUTHOR = "Chris Chiu"

// 資料夾 → 顯示名稱（對齊各資料夾 index.md 的 title）
const FOLDER_LABELS: Record<string, string> = {
  abap: "ABAP",
  rap: "RAP",
  s4hana: "S/4HANA",
  "sap-b1": "SAP Business One",
  tools: "工具",
  ai: "AI 與 ABAP",
}

function folderLabel(slug: string): string | undefined {
  const parts = slug.split("/")
  if (parts.length < 2) return undefined
  const key = parts[0]
  return FOLDER_LABELS[key.toLowerCase()] ?? key
}

export const brandImage: SocialImageOptions["imageStructure"] = ({ cfg, title, description, fileData }) => {
  const headerFont = getFontSpecificationName(cfg.theme.typography.header)
  const bodyFont = getFontSpecificationName(cfg.theme.typography.body)
  const slug = fileData.slug ?? ""
  const suffix = cfg.pageTitleSuffix ?? ""
  const cleanTitle = suffix && title.endsWith(suffix) ? title.slice(0, -suffix.length) : title

  const frame = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderLeft: `24px solid ${ORANGE}`,
    fontFamily: bodyFont,
  }

  // 首頁：網站本身的介紹卡
  if (slug === "index") {
    return (
      <div style={{ ...frame, padding: "84px 96px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: 2, color: ORANGE_TEXT }}>
            SAP B1 · S/4HANA · ABAP
          </div>
          <div
            style={{ fontFamily: headerFont, fontWeight: 700, fontSize: 84, color: "#000", marginTop: 18 }}
          >
            {cfg.pageTitle}
          </div>
          <div style={{ fontSize: 36, fontWeight: 500, color: "#000", marginTop: 26 }}>
            從 B1 顧問到 ABAP 開發
          </div>
          <div style={{ fontSize: 28, color: GRAY, marginTop: 8 }}>複雜存系統，簡單予眾人。</div>
          <div style={{ width: 120, height: 8, backgroundColor: ORANGE, marginTop: 30 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: GRAY }}>
          <div>{AUTHOR}</div>
          <div style={{ color: "#000", fontWeight: 500 }}>{SITE_URL}</div>
        </div>
      </div>
    )
  }

  const label = folderLabel(slug)
  const titleSize = cleanTitle.length > 30 ? 52 : 60

  return (
    <div style={{ ...frame, padding: "72px 96px" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {label && (
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: 2, color: ORANGE_TEXT }}>
            {label}
          </div>
        )}
        <div
          style={{
            fontFamily: headerFont,
            fontWeight: 700,
            fontSize: titleSize,
            lineHeight: 1.3,
            color: "#000",
            marginTop: 20,
            wordBreak: "keep-all",
            lineClamp: 3,
          }}
        >
          {cleanTitle}
        </div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.6,
            color: GRAY,
            marginTop: 24,
            lineClamp: 3,
          }}
        >
          {description}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: GRAY }}>
        <div style={{ color: "#000", fontWeight: 500 }}>{cfg.pageTitle}</div>
        <div>
          {`${AUTHOR} · ${SITE_URL}`}
        </div>
      </div>
    </div>
  )
}
