import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative, resolve } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const SKIP_DIRS = new Set([".git", "node_modules"])
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(p, out)
    } else if (p.endsWith(".md") || p.endsWith("llms.txt")) {
      out.push(p)
    }
  }
  return out
}

const broken = []
for (const file of walk(root)) {
  const text = readFileSync(file, "utf8")
  for (const m of text.matchAll(LINK_RE)) {
    let target = m[1].trim()
    if (/^(https?:|mailto:|#)/.test(target)) continue
    target = target.split("#")[0]
    if (!target) continue
    const abs = resolve(dirname(file), target)
    if (!existsSync(abs)) {
      broken.push({ file: relative(root, file), target })
    }
  }
}

if (broken.length) {
  console.error("check-links: broken relative links:")
  for (const b of broken) console.error(`  ${b.file} -> ${b.target}`)
  process.exit(1)
}
console.log("check-links: OK (all relative links resolve).")
