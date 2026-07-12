// Opens or updates the reviewed version PR. Merging it (and tagging) is what triggers publication.
import { execFileSync } from "node:child_process"

const version = (process.env.REQ_VERSION || process.env.RELEASE_VERSION || "").replace(/^v/, "")
const branch = `release/v${version}`
const title = `Release worldant v${version}`
const body = [
  `Automated version PR for **worldant v${version}**.`,
  "",
  "The signed release manifest, signature, and every artifact digest were verified before this PR",
  "was opened. Merge to tag `v" + version + "` and trigger publication (draft → npm → finalize).",
].join("\n")

const sh = (args) => execFileSync("gh", args, { stdio: "pipe", encoding: "utf8" })
const existing = (() => {
  try {
    return JSON.parse(sh(["pr", "list", "--head", branch, "--json", "number"]))
  } catch {
    return []
  }
})()

if (existing.length) {
  sh(["pr", "edit", String(existing[0].number), "--title", title, "--body", body])
  console.log(`open-version-pr: updated PR #${existing[0].number} for ${branch}.`)
} else {
  sh(["pr", "create", "--head", branch, "--base", "main", "--title", title, "--body", body])
  console.log(`open-version-pr: opened PR for ${branch}.`)
}
