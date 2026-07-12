import { createHash } from "node:crypto"
import { resolve, sep } from "node:path"

export class InstallError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "InstallError"
    this.code = code
  }
}

const SUPPORTED_TARGETS = new Set(["darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64"])

const ARCH_ALIASES = { x64: "x64", arm64: "arm64" }

export function mapTarget(platform, arch) {
  const os = platform === "darwin" || platform === "linux" ? platform : null
  const cpu = ARCH_ALIASES[arch] ?? null
  const target = os && cpu ? `${os}-${cpu}` : null
  if (!target || !SUPPORTED_TARGETS.has(target)) {
    throw new InstallError(
      "UNSUPPORTED_PLATFORM",
      `Unsupported platform ${platform}/${arch}. Supported: ${[...SUPPORTED_TARGETS].join(", ")}.`,
    )
  }
  return target
}

const HEX64 = /^[a-f0-9]{64}$/
const isSha256 = (v) => typeof v === "string" && HEX64.test(v)
const isHttpsObj = (o) => o && typeof o.url === "string" && o.url.startsWith("https://") && isSha256(o.sha256)

export function parseManifest(bytes) {
  let m
  try {
    m = JSON.parse(bytes.toString("utf8"))
  } catch {
    throw new InstallError("MALFORMED_MANIFEST", "Manifest is not valid JSON.")
  }
  const fail = (why) => {
    throw new InstallError("MALFORMED_MANIFEST", `Manifest failed schema check: ${why}.`)
  }
  if (m == null || typeof m !== "object") fail("not an object")
  if (m.schemaVersion !== 1) fail("schemaVersion must be 1")
  if (typeof m.version !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(m.version)) fail("version")
  if (typeof m.sourceRevision !== "string" || m.sourceRevision.length < 8) fail("sourceRevision")
  if (!m.documentation || !isSha256(m.documentation.bundleSha256)) fail("documentation.bundleSha256")
  if (!m.artifacts || typeof m.artifacts !== "object" || Object.keys(m.artifacts).length === 0) fail("artifacts")
  for (const [k, a] of Object.entries(m.artifacts)) {
    if (!SUPPORTED_TARGETS.has(k)) fail(`unknown artifact target ${k}`)
    if (!isHttpsObj(a)) fail(`artifact ${k}`)
  }
  const ev = m.evidence
  if (!ev || !isHttpsObj(ev.checksums) || !isHttpsObj(ev.sbom) || !isHttpsObj(ev.provenance)) fail("evidence")
  const sig = m.signatures
  const manifestSig = sig?.manifest
  const validManifestSig =
    manifestSig &&
    typeof manifestSig.url === "string" &&
    manifestSig.url.startsWith("https://") &&
    typeof manifestSig.subject === "string"
  if (!validManifestSig) fail("signatures.manifest")
  return m
}

export function pickArtifact(manifest, target) {
  const a = manifest.artifacts?.[target]
  if (!a) {
    throw new InstallError(
      "TARGET_NOT_IN_MANIFEST",
      `No artifact for target ${target} in manifest ${manifest.version}. No fallback is selected.`,
    )
  }
  return a
}

export function assertDigest(buffer, expectedHex) {
  const actual = createHash("sha256").update(buffer).digest("hex")
  if (actual !== expectedHex) {
    throw new InstallError("DIGEST_MISMATCH", `SHA-256 mismatch: expected ${expectedHex}, got ${actual}.`)
  }
  return actual
}

export function assertSafeEntryPath(entryName, destDir) {
  const base = resolve(destDir)
  const target = resolve(base, entryName)
  if (target !== base && !target.startsWith(base + sep)) {
    throw new InstallError("PATH_TRAVERSAL", `Archive entry escapes install directory: ${entryName}.`)
  }
  return target
}

export function assertHttpsImmutable(url, allowlist) {
  let u
  try {
    u = new URL(url)
  } catch {
    throw new InstallError("INSECURE_URL", `Invalid URL: ${url}.`)
  }
  if (u.protocol !== "https:") {
    throw new InstallError("INSECURE_URL", `Non-HTTPS URL rejected: ${url}.`)
  }
  if (!allowlist.includes(u.hostname)) {
    throw new InstallError("DISALLOWED_ORIGIN", `Origin ${u.hostname} is not in the pinned allowlist.`)
  }
  if (/(^|\/)latest(\/|$)/.test(u.pathname)) {
    throw new InstallError("MUTABLE_URL", `Mutable 'latest' path is not version-addressed: ${url}.`)
  }
  return u
}

export function assertVersionMatch(installerVersion, manifestVersion) {
  if (installerVersion !== manifestVersion) {
    throw new InstallError(
      "VERSION_MISMATCH",
      `Installer version ${installerVersion} does not match manifest version ${manifestVersion}.`,
    )
  }
}
