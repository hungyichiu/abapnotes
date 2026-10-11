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
        lightMode: {
          light: "#fbfcfe",
          lightgray: "#e3e8ef",
          gray: "#8a96a8",
          darkgray: "#333d4d",
          dark: "#141b2d",
          secondary: "#1f4ea3",
          tertiary: "#4c7ad1",
          highlight: "rgba(31, 78, 163, 0.08)",
          textHighlight: "#ffe08a88",
        },
        darkMode: {
          light: "#0f1420",
          lightgray: "#1f2736",
          gray: "#6b7a90",
          darkgray: "#c3cbd8",
          dark: "#eef2f8",
          secondary: "#86aefb",
          tertiary: "#b4ccff",
          highlight: "rgba(134, 174, 251, 0.14)",
          textHighlight: "#b4891e88",
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
