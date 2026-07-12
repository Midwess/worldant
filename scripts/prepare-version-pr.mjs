// Bumps the installer package to the requested version on a dedicated branch. Does NOT publish.
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const version = (process.env.REQ_VERSION || process.env.RELEASE_VERSION || "").replace(/^v/, "")
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`prepare-version-pr: invalid version '${version}'.`)
  process.exit(1)
}

const branch = `release/v${version}`
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" })

sh("git", ["config", "user.name", "worldant-release-bot"])
sh("git", ["config", "user.email", "release-bot@users.noreply.github.com"])
sh("git", ["checkout", "-B", branch])

const pkgPath = join(root, "packages", "cli", "package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
pkg.version = version
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")

// Durably pin the signed-manifest identity for this version so reruns and the publish stage can
// assert it, instead of trusting a transient dispatch payload or a mutable store.
const manifestSha256 = process.env.REQ_MANIFEST_SHA256 || ""
if (!/^[a-f0-9]{64}$/.test(manifestSha256)) {
  console.error("prepare-version-pr: missing/invalid REQ_MANIFEST_SHA256; cannot pin manifest identity.")
  process.exit(1)
}
writeFileSync(join(root, "release-lock.json"), JSON.stringify({ version, manifestSha256 }, null, 2) + "\n")

sh("git", ["add", "packages/cli/package.json", "release-lock.json"])
sh("git", ["commit", "-m", `release: worldant v${version}`])
sh("git", ["push", "--force", "origin", branch])
console.log(`prepare-version-pr: pushed ${branch} with version ${version}.`)
