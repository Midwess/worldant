import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import {
  InstallError,
  mapTarget,
  parseManifest,
  pickArtifact,
  assertDigest,
  assertSafeEntryPath,
  assertHttpsImmutable,
  assertVersionMatch,
} from "../packages/cli/installer-core.mjs"

const sha256 = (s) => createHash("sha256").update(s).digest("hex")

const goodManifest = () => ({
  schemaVersion: 1,
  version: "1.0.0",
  sourceRevision: "rev-abc12345",
  documentation: { bundleSha256: "a".repeat(64) },
  artifacts: {
    "darwin-arm64": { url: "https://cdn.worldant.dev/1.0.0/worldant-1.0.0-darwin-arm64.tar.gz", sha256: "b".repeat(64) },
    "linux-x64": { url: "https://cdn.worldant.dev/1.0.0/worldant-1.0.0-linux-x64.tar.gz", sha256: "c".repeat(64) },
  },
  evidence: {
    checksums: { url: "https://cdn.worldant.dev/1.0.0/checksums.txt", sha256: "d".repeat(64), mediaType: "text/plain" },
    sbom: { url: "https://cdn.worldant.dev/1.0.0/sbom.spdx.json", sha256: "e".repeat(64), mediaType: "application/spdx+json" },
    provenance: { url: "https://cdn.worldant.dev/1.0.0/provenance.intoto.jsonl", sha256: "f".repeat(64), mediaType: "application/vnd.in-toto+json" },
  },
  signatures: {
    manifest: { url: "https://cdn.worldant.dev/1.0.0/release-manifest.json.sigstore", mediaType: "application/vnd.dev.sigstore.bundle+json", subject: "release-manifest.json" },
  },
})

// Scenario: Platform is unsupported -> clear error, no fallback artifact.
test("mapTarget resolves supported os/arch", () => {
  assert.equal(mapTarget("darwin", "arm64"), "darwin-arm64")
  assert.equal(mapTarget("linux", "x64"), "linux-x64")
})

test("mapTarget fails closed on unsupported platform", () => {
  assert.throws(() => mapTarget("win32", "x64"), (e) => e instanceof InstallError && e.code === "UNSUPPORTED_PLATFORM")
  assert.throws(() => mapTarget("darwin", "ia32"), (e) => e.code === "UNSUPPORTED_PLATFORM")
})

// Scenario: manifest parsing rejects malformed / wrong schema.
test("parseManifest accepts a valid v1 manifest", () => {
  const m = parseManifest(Buffer.from(JSON.stringify(goodManifest())))
  assert.equal(m.version, "1.0.0")
})

test("parseManifest fails closed on malformed json", () => {
  assert.throws(() => parseManifest(Buffer.from("{ not json")), (e) => e.code === "MALFORMED_MANIFEST")
})

test("parseManifest fails closed on wrong schemaVersion", () => {
  const bad = { ...goodManifest(), schemaVersion: 2 }
  assert.throws(() => parseManifest(Buffer.from(JSON.stringify(bad))), (e) => e.code === "MALFORMED_MANIFEST")
})

test("parseManifest fails closed when required field missing", () => {
  const bad = goodManifest(); delete bad.signatures
  assert.throws(() => parseManifest(Buffer.from(JSON.stringify(bad))), (e) => e.code === "MALFORMED_MANIFEST")
})

// Scenario: no fallback artifact for a target absent from the manifest.
test("pickArtifact returns the exact target entry", () => {
  const a = pickArtifact(goodManifest(), "linux-x64")
  assert.match(a.url, /linux-x64/)
})

test("pickArtifact fails closed with no fallback when target absent", () => {
  assert.throws(() => pickArtifact(goodManifest(), "linux-arm64"), (e) => e.code === "TARGET_NOT_IN_MANIFEST")
})

// Scenario: Artifact digest does not match -> fail closed.
test("assertDigest passes on matching sha256", () => {
  const buf = Buffer.from("hello world")
  assert.doesNotThrow(() => assertDigest(buf, sha256("hello world")))
})

test("assertDigest fails closed on digest mismatch", () => {
  const buf = Buffer.from("hello world")
  assert.throws(() => assertDigest(buf, "0".repeat(64)), (e) => e.code === "DIGEST_MISMATCH")
})

// Scenario: Archive attempts path traversal -> extraction fails.
test("assertSafeEntryPath resolves entries inside dest", () => {
  const p = assertSafeEntryPath("bin/worldant", "/opt/worldant/1.0.0")
  assert.equal(p, "/opt/worldant/1.0.0/bin/worldant")
})

test("assertSafeEntryPath fails closed on parent traversal", () => {
  assert.throws(() => assertSafeEntryPath("../../etc/passwd", "/opt/worldant/1.0.0"), (e) => e.code === "PATH_TRAVERSAL")
})

test("assertSafeEntryPath fails closed on absolute path", () => {
  assert.throws(() => assertSafeEntryPath("/etc/cron.d/evil", "/opt/worldant/1.0.0"), (e) => e.code === "PATH_TRAVERSAL")
})

// Scenario: redirects to disallowed origins / non-https -> fail closed.
test("assertHttpsImmutable accepts allowlisted https version-addressed url", () => {
  assert.doesNotThrow(() =>
    assertHttpsImmutable("https://cdn.worldant.dev/1.0.0/x.tar.gz", ["cdn.worldant.dev"]))
})

test("assertHttpsImmutable fails closed on http", () => {
  assert.throws(() => assertHttpsImmutable("http://cdn.worldant.dev/1.0.0/x", ["cdn.worldant.dev"]), (e) => e.code === "INSECURE_URL")
})

test("assertHttpsImmutable fails closed on disallowed host", () => {
  assert.throws(() => assertHttpsImmutable("https://evil.example/1.0.0/x", ["cdn.worldant.dev"]), (e) => e.code === "DISALLOWED_ORIGIN")
})

test("assertHttpsImmutable fails closed on mutable 'latest' path", () => {
  assert.throws(() => assertHttpsImmutable("https://cdn.worldant.dev/latest/x", ["cdn.worldant.dev"]), (e) => e.code === "MUTABLE_URL")
})

// Installer resolves its own exact version and requires manifest parity.
test("assertVersionMatch passes on equal versions", () => {
  assert.doesNotThrow(() => assertVersionMatch("1.0.0", "1.0.0"))
})

test("assertVersionMatch fails closed on mismatch", () => {
  assert.throws(() => assertVersionMatch("1.0.0", "1.0.1"), (e) => e.code === "VERSION_MISMATCH")
})
