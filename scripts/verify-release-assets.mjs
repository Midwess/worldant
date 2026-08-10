import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex")

export function assetDigests(dir) {
  return Object.fromEntries(
    readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => [entry.name, digest(join(dir, entry.name))])
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

export function assertSameAssets(local, remote) {
  const localJson = JSON.stringify(local)
  const remoteJson = JSON.stringify(remote)
  if (localJson !== remoteJson) {
    throw new Error(
      `finalized release assets are immutable\nlocal: ${localJson}\nremote: ${remoteJson}`,
    )
  }
}

function main() {
  const [tag, localDir] = process.argv.slice(2)
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "") || !localDir) {
    throw new Error("usage: verify-release-assets.mjs <tag> <local-directory>")
  }
  const remoteDir = mkdtempSync(join(tmpdir(), "worldant-release-assets-"))
  try {
    execFileSync("gh", [
      "release",
      "download",
      tag,
      "--repo",
      "Midwess/worldant",
      "--dir",
      remoteDir,
    ], { stdio: "inherit" })
    assertSameAssets(assetDigests(resolve(localDir)), assetDigests(remoteDir))
  } finally {
    rmSync(remoteDir, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
