import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "SAP 開發技術筆記",
    pageTitleSuffix: " · SAP 開發技術筆記",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "zh-TW",
    baseUrl: "hungyichiu.github.io/abapnotes",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        // 中文字型沒有 italic，includeItalic 要關掉，否則 Google Fonts 整份 CSS 會失敗
        header: { name: "Noto Serif TC", weights: [600, 700], includeItalic: false },
        body: { name: "Noto Sans TC", weights: [400, 500, 700], includeItalic: false },
        code: { name: "JetBrains Mono", weights: [400, 600], includeItalic: false },
      },
      colors: {
        // 對齊 LinkedIn 主圖：黑白為主＋橘色強調
        lightMode: {
          light: "#ffffff",
          lightgray: "#dedede",
          // 主圖的弱化文字 #b3b3b3 在白底只有 2.1:1，日期、目錄這類小字讀不清楚，改深一點
          gray: "#737373",
          darkgray: "#000000",
          dark: "#000000",
          secondary: "#ff6b00",
          // 深一階的橘：標籤、麵包屑這類小字用，白底對比約 5.5:1
          tertiary: "#b34700",
          highlight: "rgba(255, 107, 0, 0.10)",
          textHighlight: "#ffd2b088",
        },
        darkMode: {
          light: "#111111",
          lightgray: "#3a3a3a",
          gray: "#7a7a7a",
          darkgray: "#ffffff",
          dark: "#ffffff",
          secondary: "#ff6b00",
          tertiary: "#ff9a4d",
          highlight: "rgba(255, 107, 0, 0.16)",
          textHighlight: "#ff6b0066",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "light-plus",
          dark: "dark-plus",
        },
        keepBackground: true,
      }),
      Plugin.FixRelativeAssetPaths(),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.ExplicitPublish()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      //Plugin.CustomOgImages(),
    ],
  },
}

export default config
