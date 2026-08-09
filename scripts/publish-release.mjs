// Idempotent staged publication: draft -> npm -> finalize. Reruns reconcile channel state without
// republishing. Requires GH_TOKEN (draft/finalize) and OIDC (npm) provided by the release workflow.
import { execFileSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const cliDir = join(root, "packages", "cli")
const version = (process.env.RELEASE_VERSION || "").replace(/^v/, "")
const tag = `v${version}`
const packageName = "worldant-cli"
const stageArg = process.argv.indexOf("--stage")
const stage = stageArg >= 0 ? process.argv[stageArg + 1] : ""

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`publish-release: invalid version '${version}'.`)
  process.exit(1)
}

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts })
const tryOut = (cmd, args) => {
  try {
    return sh(cmd, args).trim()
  } catch {
    return null
  }
}

function ensureDraft() {
  const view = tryOut("gh", ["release", "view", tag, "--json", "isDraft,tagName"])
  if (view) {
    console.log(`publish-release: release ${tag} already exists; reusing.`)
    return
  }
  sh("gh", ["release", "create", tag, "--draft", "--title", tag, "--notes-file", join(root, "CHANGELOG.md")])
  console.log(`publish-release: created draft release ${tag}.`)
}

function publishNpm() {
  const published = tryOut("npm", ["view", `${packageName}@${version}`, "version"])
  if (published === version) {
    console.log(`publish-release: npm ${packageName}@${version} already published; skipping.`)
    return
  }
  // Trusted publishing (OIDC) — no long-lived token; provenance from the workflow identity.
  sh("npm", ["publish", "--access", "public", "--provenance"], { cwd: cliDir, stdio: "inherit" })
  console.log(`publish-release: published npm ${packageName}@${version}.`)
}

function finalize() {
  const npmOk = tryOut("npm", ["view", `${packageName}@${version}`, "version"]) === version
  if (!npmOk) {
    console.error("publish-release: refusing to finalize — npm publish not confirmed. Draft stays non-public.")
    process.exit(1)
  }
  sh("gh", ["release", "edit", tag, "--draft=false", "--latest"])
  console.log(`publish-release: finalized public release ${tag}.`)
}

switch (stage) {
  case "draft":
    ensureDraft()
    break
  case "npm":
    publishNpm()
    break
  case "finalize":
    finalize()
    break
  default:
    console.error("publish-release: --stage must be draft | npm | finalize.")
    process.exit(1)
}
