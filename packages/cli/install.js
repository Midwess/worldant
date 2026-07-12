import { readFileSync, mkdirSync, rmSync, renameSync, symlinkSync, existsSync, writeFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, join } from "node:path"
import { homedir, platform, arch } from "node:os"
import { InstallError, mapTarget, pickArtifact, assertDigest, assertSafeEntryPath, assertVersionMatch } from "./installer-core.mjs"
import { fetchBuffer } from "./download.mjs"
import { loadTrustPolicy, verifyManifest } from "./verify-manifest.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, "package.json"), "utf8"))

const RELEASE_BASE = process.env.WORLDANT_RELEASE_BASE ?? "https://github.com/Midwess/worldant/releases/download"
export const installRoot = () => process.env.WORLDANT_HOME ?? join(homedir(), ".worldant")

const SAFE_ENTRY_TYPES = new Set(["File", "Directory"])

async function extractTarGz(buffer, destDir) {
  let tar
  try {
    tar = await import("tar")
  } catch {
    throw new InstallError("EXTRACT_UNAVAILABLE", "The 'tar' dependency is not installed.")
  }
  const { Readable } = await import("node:stream")
  mkdirSync(destDir, { recursive: true })

  const violations = []
  await new Promise((res, rej) => {
    Readable.from(buffer)
      .pipe(
        tar.t({
          onentry: (entry) => {
            try {
              assertSafeEntryPath(entry.path, destDir)
              if (!SAFE_ENTRY_TYPES.has(entry.type)) violations.push(`${entry.path} (${entry.type})`)
            } catch {
              violations.push(entry.path)
            }
          },
        }),
      )
      .on("finish", res)
      .on("error", rej)
  })
  if (violations.length) {
    throw new InstallError("PATH_TRAVERSAL", `Unsafe archive entries rejected: ${violations.join(", ")}.`)
  }

  await new Promise((res, rej) => {
    Readable.from(buffer)
      .pipe(
        tar.extract({
          cwd: destDir,
          filter: (path) => {
            try {
              assertSafeEntryPath(path, destDir)
              return true
            } catch {
              return false
            }
          },
        }),
      )
      .on("finish", res)
      .on("error", rej)
  })
}

export async function installVersion(version) {
  assertVersionMatch(pkg.version, version)
  const target = mapTarget(platform(), arch())
  const policy = loadTrustPolicy()
  const allow = policy.immutableOrigins.allowlist
  const hops = policy.immutableOrigins.maxRedirects

  const manifestUrl = `${RELEASE_BASE}/v${version}/release-manifest.json`
  const sigUrl = `${RELEASE_BASE}/v${version}/release-manifest.json.sigstore`
  const manifestBytes = await fetchBuffer(manifestUrl, allow, hops)
  const sigBytes = await fetchBuffer(sigUrl, allow, hops)

  const manifest = await verifyManifest(manifestBytes, sigBytes, policy)
  assertVersionMatch(pkg.version, manifest.version)

  const artifact = pickArtifact(manifest, target)
  const artifactBytes = await fetchBuffer(artifact.url, allow, hops)
  assertDigest(artifactBytes, artifact.sha256)

  const root = installRoot()
  const versionsDir = join(root, "versions")
  const finalDir = join(versionsDir, version)
  const stagingDir = join(versionsDir, `.staging-${version}`)
  const asideDir = join(versionsDir, `.old-${version}`)
  rmSync(stagingDir, { recursive: true, force: true })
  await extractTarGz(artifactBytes, stagingDir)

  rmSync(asideDir, { recursive: true, force: true })
  if (existsSync(finalDir)) renameSync(finalDir, asideDir)
  renameSync(stagingDir, finalDir)
  rmSync(asideDir, { recursive: true, force: true })

  const currentLink = join(root, "current")
  const tmpLink = join(root, `.current-${version}`)
  rmSync(tmpLink, { force: true })
  symlinkSync(finalDir, tmpLink, "dir")
  renameSync(tmpLink, currentLink)

  writeFileSync(join(root, "installed.json"), JSON.stringify({ version, target, installedAt: new Date().toISOString() }, null, 2))
  return { version, target, dir: finalDir }
}

export function installedBinary(root = installRoot()) {
  const bin = join(root, "current", "bin", "worldant")
  if (!existsSync(bin)) {
    throw new InstallError("NOT_INSTALLED", `Worldant binary not found at ${bin}. Run the installer.`)
  }
  return bin
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  installVersion(pkg.version)
    .then((r) => console.log(`worldant ${r.version} (${r.target}) installed to ${r.dir}`))
    .catch((e) => {
      console.error(`worldant install failed [${e.code ?? "ERROR"}]: ${e.message}`)
      process.exit(1)
    })
}
