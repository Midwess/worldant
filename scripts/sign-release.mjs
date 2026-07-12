import { readFileSync, writeFileSync } from "node:fs"
import { sign } from "sigstore"

const manifest = readFileSync("release-assets/release-manifest.json")
const bundle = await sign(manifest)
writeFileSync("release-assets/release-manifest.json.sigstore", JSON.stringify(bundle))
