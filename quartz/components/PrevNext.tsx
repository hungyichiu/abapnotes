import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { getDate } from "./Date"

export default (() => {
  const PrevNext: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
    const currentSlug = fileData.slug!
    const currentFolder = currentSlug.includes("/")
      ? currentSlug.substring(0, currentSlug.lastIndexOf("/"))
      : ""

    const sorted = allFiles
      .filter((f) => {
        const slug = f.slug ?? ""
        const folder = slug.includes("/") ? slug.substring(0, slug.lastIndexOf("/")) : ""
        return folder === currentFolder && !slug.endsWith("/")
      })
      .sort((a, b) => {
        const da = getDate(cfg, a)
        const db = getDate(cfg, b)
        if (da && db) return da.getTime() - db.getTime()
        return (a.slug ?? "").localeCompare(b.slug ?? "")
      })

    const idx = sorted.findIndex((f) => f.slug === currentSlug)
    if (idx === -1) return null

    const prev = idx > 0 ? sorted[idx - 1] : null
    const next = idx < sorted.length - 1 ? sorted[idx + 1] : null

    if (!prev && !next) return null

    return (
      <nav class="prevnext">
        {prev ? (
          <a href={resolveRelative(currentSlug, prev.slug!)} class="prevnext-link prevnext-prev">
            <span class="prevnext-label">← 上一篇</span>
            <span class="prevnext-title">{prev.frontmatter?.title}</span>
          </a>
        ) : (
          <div />
        )}
        {next ? (
          <a href={resolveRelative(currentSlug, next.slug!)} class="prevnext-link prevnext-next">
            <span class="prevnext-label">下一篇 →</span>
            <span class="prevnext-title">{next.frontmatter?.title}</span>
          </a>
        ) : (
          <div />
        )}
      </nav>
    )
  }

  PrevNext.css = `
.prevnext {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--lightgray);
}

.prevnext-link {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  text-decoration: none;
  max-width: 48%;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.prevnext-link:hover {
  border-color: var(--secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.prevnext-next {
  margin-left: auto;
  text-align: right;
}

.prevnext-label {
  font-size: 0.72rem;
  color: var(--secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.prevnext-title {
  font-size: 0.88rem;
  color: var(--dark);
  font-weight: 500;
  line-height: 1.4;
}

@media (max-width: 600px) {
  .prevnext {
    flex-direction: column;
  }

  .prevnext-link {
    max-width: 100%;
  }

  .prevnext-next {
    margin-left: 0;
    text-align: left;
  }
}
`

  return PrevNext
}) satisfies QuartzComponentConstructor
