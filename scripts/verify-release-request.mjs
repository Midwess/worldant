import { execFileSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createHash } from "node:crypto"
import { pickArtifact } from "../packages/cli/installer-core.mjs"
import { fetchBuffer } from "../packages/cli/download.mjs"
import { loadTrustPolicy, verifyManifest } from "../packages/cli/verify-manifest.mjs"

const version = (process.env.RELEASE_VERSION || process.env.REQ_VERSION || "").replace(/^v/, "")
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`verify-release-request: invalid or missing version '${version}'.`)
  process.exit(1)
}

const base = process.env.WORLDANT_RELEASE_BASE ?? "https://github.com/Midwess/worldant/releases/download"

function publishedRelease(v) {
  try {
    return JSON.parse(execFileSync("gh", ["release", "view", `v${v}`, "--json", "isDraft"], { encoding: "utf8" }))
  } catch {
    return null
  }
}

// A finalized (non-draft) release for this version already exists: reject a non-idempotent
// re-request. A draft is fine — the publish stage reconciles it against identical manifest identity.
const existing = publishedRelease(version)
if (existing && existing.isDraft === false) {
  console.error(`verify-release-request: version v${version} is already published; refusing to overwrite or reuse it.`)
  process.exit(1)
}

const policy = loadTrustPolicy() // throws TRUST_POLICY_UNRESOLVED until the signer identity is finalized
const allow = policy.immutableOrigins.allowlist
const hops = policy.immutableOrigins.maxRedirects
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex")

const manifestBytes = await fetchBuffer(`${base}/v${version}/release-manifest.json`, allow, hops)
const fetchedManifestSha = sha256(manifestBytes)

// Prefer the durable pin committed by the version PR; fall back to the transient dispatch payload.
const lockPath = join(dirname(fileURLToPath(import.meta.url)), "..", "release-lock.json")
const pinnedSha = existsSync(lockPath)
  ? (JSON.parse(readFileSync(lockPath, "utf8")).manifestSha256 || null)
  : (process.env.REQ_MANIFEST_SHA256 || null)
if (pinnedSha && fetchedManifestSha !== pinnedSha) {
  console.error(`verify-release-request: fetched manifest digest ${fetchedManifestSha} != pinned ${pinnedSha}.`)
  process.exit(1)
}
const sigBytes = await fetchBuffer(`${base}/v${version}/release-manifest.json.sigstore`, allow, hops)

const manifest = await verifyManifest(manifestBytes, sigBytes, policy)
if (manifest.version !== version) {
  console.error(`verify-release-request: manifest version ${manifest.version} != requested ${version}.`)
  process.exit(1)
}

// Every referenced artifact must download and match its pinned digest.
for (const target of Object.keys(manifest.artifacts)) {
  const artifact = pickArtifact(manifest, target)
  const bytes = await fetchBuffer(artifact.url, allow, hops)
  if (sha256(bytes) !== artifact.sha256) {
    console.error(`verify-release-request: digest mismatch for ${target}.`)
    process.exit(1)
  }
}

console.log(`verify-release-request: OK (v${version}, ${Object.keys(manifest.artifacts).length} artifacts, signature + digests verified).`)
