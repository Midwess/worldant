import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { parseManifest } from "../packages/cli/installer-core.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function fail(msg) {
  console.error(`validate-schema: ${msg}`)
  process.exit(1)
}

// The JSON Schema file must itself be valid JSON with a v1 identity.
let schema
try {
  schema = JSON.parse(readFileSync(join(root, "schema/release-manifest.v1.json"), "utf8"))
} catch (e) {
  fail(`schema is not valid JSON: ${e.message}`)
}
if (schema.properties?.schemaVersion?.const !== 1) fail("schema does not pin schemaVersion=1")

// The installer's runtime enforcement (parseManifest) is the operative gate; prove it agrees.
const good = {
  schemaVersion: 1,
  version: "1.0.0",
  sourceRevision: "rev-abc12345",
  documentation: { bundleSha256: "a".repeat(64) },
  artifacts: { "darwin-arm64": { url: "https://cdn.worldant.dev/1.0.0/x.tar.gz", sha256: "b".repeat(64) } },
  evidence: {
    checksums: { url: "https://cdn.worldant.dev/1.0.0/c.txt", sha256: "c".repeat(64), mediaType: "text/plain" },
    sbom: { url: "https://cdn.worldant.dev/1.0.0/s.json", sha256: "d".repeat(64), mediaType: "application/spdx+json" },
    provenance: { url: "https://cdn.worldant.dev/1.0.0/p.jsonl", sha256: "e".repeat(64), mediaType: "application/vnd.in-toto+json" },
  },
  signatures: { manifest: { url: "https://cdn.worldant.dev/1.0.0/m.sigstore", mediaType: "application/vnd.dev.sigstore.bundle+json", subject: "release-manifest.json" } },
}
try {
  parseManifest(Buffer.from(JSON.stringify(good)))
} catch (e) {
  fail(`known-good manifest rejected by installer: ${e.message}`)
}
let rejected = false
try {
  parseManifest(Buffer.from(JSON.stringify({ ...good, schemaVersion: 2 })))
} catch {
  rejected = true
}
if (!rejected) fail("installer accepted a wrong schemaVersion")

console.log("validate-schema: OK (schema pins v1; installer enforcement agrees).")
