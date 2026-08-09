import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// Prohibited public-disclosure patterns. Built from fragments so this scanner does not match itself.
const PRIVATE_REPO = ["worldant", "internal"].join("-")
const DENY = [
  { name: "private repo identifier", re: new RegExp(`Midwess/${PRIVATE_REPO}`) },
  { name: "private repo bare name", re: new RegExp(`\\b${PRIVATE_REPO}\\b`) },
  { name: "local macOS home path", re: /\/Users\/[a-z0-9._-]+/i },
  { name: "local linux home path", re: /\/home\/[a-z0-9._-]+/i },
]

const SKIP_DIRS = new Set([".git", "node_modules"])
const SELF = join(root, "scripts", "scan-disclosure.mjs")
const PRIVATE_CHECKOUT_WORKFLOW = ".github/workflows/build-release.yml"

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(p, out)
    } else {
      out.push(p)
    }
  }
  return out
}

const violations = []
for (const file of walk(root)) {
  if (file === SELF) continue
  let text
  try {
    text = readFileSync(file, "utf8")
  } catch {
    continue
  }
  const lines = text.split("\n")
  lines.forEach((line, i) => {
    for (const rule of DENY) {
      if (rule.re.test(line)) {
        const rel = relative(root, file)
        const approvedCheckout = rel === PRIVATE_CHECKOUT_WORKFLOW && line.trim() === `repository: Midwess/${PRIVATE_REPO}`
        if (!approvedCheckout) violations.push({ file: rel, line: i + 1, rule: rule.name, text: line.trim().slice(0, 120) })
      }
    }
  })
}

if (violations.length) {
  console.error("scan-disclosure: prohibited private references found:")
  for (const v of violations) console.error(`  ${v.file}:${v.line} [${v.rule}] ${v.text}`)
  process.exit(1)
}
console.log("scan-disclosure: OK (no prohibited private references).")
