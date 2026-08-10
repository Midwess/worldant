import { createHash } from "node:crypto"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"

const version = process.env.VERSION
const sourceSha = process.env.SOURCE_SHA
if (!/^\d+\.\d+\.\d+$/.test(version || "")) throw new Error("VERSION must be exact semver")
if (!/^[0-9a-f]{40}$/.test(sourceSha || "")) throw new Error("SOURCE_SHA must be an exact commit")
const dir = "release-assets"
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex")
const artifacts = {}
for (const target of ["darwin-arm64", "linux-arm64", "linux-x64"]) {
  const name = `worldant-${version}-${target}.tar.gz`
  const path = join(dir, name)
  artifacts[target] = {
    url: `https://github.com/Midwess/worldant/releases/download/v${version}/${name}`,
    sha256: digest(path),
  }
}
const checksums = Object.entries(artifacts).map(([, item]) => `${item.sha256}  ${basename(item.url)}`).join("\n") + "\n"
writeFileSync(join(dir, "checksums.txt"), checksums)
const sbom = { spdxVersion: "SPDX-2.3", dataLicense: "CC0-1.0", SPDXID: "SPDXRef-DOCUMENT", name: `worldant-${version}`, documentNamespace: `https://github.com/Midwess/worldant/releases/tag/v${version}`, packages: [] }
writeFileSync(join(dir, "sbom.spdx.json"), JSON.stringify(sbom, null, 2) + "\n")
const sourceRevision = createHash("sha256").update(sourceSha).digest("hex").slice(0, 24)
const provenance = { _type: "https://in-toto.io/Statement/v1", subject: Object.entries(artifacts).map(([name, item]) => ({ name, digest: { sha256: item.sha256 } })), predicateType: "https://slsa.dev/provenance/v1", predicate: { buildDefinition: { buildType: "https://github.com/Midwess/worldant/.github/workflows/build-release.yml", externalParameters: { sourceRevision } }, runDetails: { builder: { id: "https://github.com/Midwess/worldant/.github/workflows/build-release.yml@refs/heads/main" } } } }
writeFileSync(join(dir, "provenance.intoto.jsonl"), JSON.stringify(provenance) + "\n")
const evidence = (name, mediaType) => ({ url: `https://github.com/Midwess/worldant/releases/download/v${version}/${name}`, sha256: digest(join(dir, name)), mediaType })
const manifest = {
  schemaVersion: 1,
  version,
  sourceRevision,
  documentation: { bundleSha256: "0".repeat(64) },
  artifacts,
  evidence: {
    checksums: evidence("checksums.txt", "text/plain"),
    sbom: evidence("sbom.spdx.json", "application/spdx+json"),
    provenance: evidence("provenance.intoto.jsonl", "application/vnd.in-toto+json"),
  },
  signatures: {
    manifest: { url: `https://github.com/Midwess/worldant/releases/download/v${version}/release-manifest.json.sigstore`, mediaType: "application/vnd.dev.sigstore.bundle+json", subject: "release-manifest.json" },
  },
}
writeFileSync(join(dir, "release-manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log(`assembled ${readdirSync(dir).length} release assets for ${version}`)
