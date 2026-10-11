import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.PrevNext(),
    // 留言區只放在文章頁，首頁、標籤頁、資料夾頁不放
    Component.ConditionalRender({
      condition: (page) =>
        page.fileData.slug !== "index" &&
        !page.fileData.slug!.startsWith("tags/") &&
        !page.fileData.slug!.endsWith("/index"),
      component: Component.Comments({
      provider: "giscus",
      options: {
        repo: "hungyichiu/abapnotes",
        repoId: "R_kgDOSa3L9g",
        category: "Announcements",
        categoryId: "DIC_kwDOSa3L9s4C9AMp",
        mapping: "pathname",
        strict: false,
        reactionsEnabled: true,
        inputPosition: "bottom",
        lang: "zh-TW",
      },
    }),
    }),
  ],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/hungyichiu/abapnotes",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => page.fileData.slug !== "index",
    }),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer({
      filterFn: (node) => node.slugSegment !== "assets" && node.slugSegment !== "tags",
      // 資料夾顯示名稱來自各資料夾 index.md 的 title，不用在這裡對照
      // 依檔名排序（01-、02- 的系列編號），不用標題排，系列文章才會排在一起
      sortFn: (a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
        return a.slugSegment.localeCompare(b.slugSegment, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      },
    }),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      filterFn: (node) => node.slugSegment !== "assets" && node.slugSegment !== "tags",
      // 資料夾顯示名稱來自各資料夾 index.md 的 title，不用在這裡對照
      // 依檔名排序（01-、02- 的系列編號），不用標題排，系列文章才會排在一起
      sortFn: (a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
        return a.slugSegment.localeCompare(b.slugSegment, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      },
    }),
  ],
  right: [],
}
