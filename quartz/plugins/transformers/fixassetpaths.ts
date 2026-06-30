import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { Image } from "mdast"

// Normalizes Obsidian vault-relative image paths like ../../assets/foo.png
// to content-root-relative paths like assets/foo.png so that CrawlLinks
// can correctly resolve them regardless of how deep the note was in the vault.
export const FixRelativeAssetPaths: QuartzTransformerPlugin = () => {
  return {
    name: "FixRelativeAssetPaths",
    markdownPlugins() {
      return [
        () => (tree) => {
          visit(tree, "image", (node: Image) => {
            const match = node.url.match(/^(?:\.\.\/)+assets\/(.+)$/)
            if (match) {
              node.url = `assets/${match[1]}`
            }
          })
        },
      ]
    },
  }
}
