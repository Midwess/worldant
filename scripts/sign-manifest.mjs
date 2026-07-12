// Runs in the PUBLIC repo's protected sign.yml. Re-derives the manifest URL from THIS repo's fixed
// release base (never trusts a payload-supplied URL), re-verifies every artifact digest against the
// store, and requires every artifact to be hosted under this repo's own release path before keyless
// signing. It builds nothing and holds no private-source credential; the Sigstore SAN it produces is
// this public repo's identity.
import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { pickArtifact } from "../packages/cli/installer-core.mjs"
import { fetchBuffer } from "../packages/cli/download.mjs"
import { loadTrustPolicy } from "../packages/cli/verify-manifest.mjs"

const RELEASE_BASE = "https://github.com/Midwess/worldant/releases/download"
const ARTIFACT_PREFIX = "/Midwess/worldant/releases/download/"

const version = (process.env.RELEASE_VERSION || "").replace(/^v/, "")
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("sign-manifest: RELEASE_VERSION must be an exact semver.")
  process.exit(1)
}

const policy = loadTrustPolicy()
const allow = policy.immutableOrigins.allowlist
const hops = policy.immutableOrigins.maxRedirects
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex")

// The manifest location is derived, not received — an authorized dispatch cannot redirect the signer
// to an attacker-hosted manifest.
const manifestUrl = `${RELEASE_BASE}/v${version}/release-manifest.json`
const manifestBytes = await fetchBuffer(manifestUrl, allow, hops)
let manifest
try {
  manifest = JSON.parse(manifestBytes.toString("utf8"))
} catch {
  console.error("sign-manifest: manifest is not valid JSON.")
  process.exit(1)
}
if (manifest.version !== version) {
  console.error(`sign-manifest: manifest version ${manifest.version} != ${version}.`)
  process.exit(1)
}

// Every artifact must be hosted under THIS repo's own versioned release path, and its digest must
// match. This blocks signing a self-consistent manifest whose artifacts are attacker-hosted.
const requiredPrefix = `${ARTIFACT_PREFIX}v${version}/`
for (const target of Object.keys(manifest.artifacts || {})) {
  const artifact = pickArtifact(manifest, target)
  const path = new URL(artifact.url).pathname
  if (!path.startsWith(requiredPrefix)) {
    console.error(`sign-manifest: artifact ${target} is not under ${requiredPrefix}; refusing to sign.`)
    process.exit(1)
  }
  const bytes = await fetchBuffer(artifact.url, allow, hops)
  if (sha256(bytes) !== artifact.sha256) {
    console.error(`sign-manifest: digest mismatch for ${target}; refusing to sign.`)
    process.exit(1)
  }
}

// Sign the exact bytes we fetched (canonical form is defined by the publisher, not re-serialized).
writeFileSync("release-manifest.json", manifestBytes)
execFileSync(
  "cosign",
  ["sign-blob", "--yes", "--bundle", "release-manifest.json.sigstore", "release-manifest.json"],
  { stdio: "inherit" },
)
console.log(`sign-manifest: signed v${version} (${Object.keys(manifest.artifacts).length} artifacts verified).`)
