import { createHash } from "node:crypto"
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { basename, join, posix, relative } from "node:path"
import { execFileSync } from "node:child_process"

const [archivePath, sourcePinPath, target, checkerBinary] = process.argv.slice(2)

if (!archivePath || !sourcePinPath || !target || !checkerBinary) {
  throw new Error(
    "usage: verify-release-archive.mjs <archive.tar.gz> <pin.json> <target> <checker-binary>",
  )
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))
const sourcePinBytes = readFileSync(sourcePinPath)
const pin = JSON.parse(sourcePinBytes)

if (pin.schema !== "worldant.typescript-checker-pin.v1") {
  throw new Error("release source has an unsupported checker pin")
}
if (!pin.native_targets?.includes(target)) {
  throw new Error(`release target ${target} is absent from the checker pin`)
}

const archiveEntries = execFileSync("tar", ["-tzf", archivePath], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)

for (const entry of archiveEntries) {
  const path = entry.endsWith("/") ? entry.slice(0, -1) : entry
  if (!path || posix.isAbsolute(path) || posix.normalize(path) !== path || path.split("/").includes("..")) {
    throw new Error(`release archive contains unsafe path ${entry}`)
  }
}

const extracted = mkdtempSync(join(tmpdir(), "worldant-release-"))

try {
  execFileSync("tar", ["-xzf", archivePath, "-C", extracted])

  const worldant = join(extracted, "bin", "worldant")
  if (!existsSync(worldant) || !lstatSync(worldant).isFile() || !(lstatSync(worldant).mode & 0o111)) {
    throw new Error("release archive omits executable bin/worldant")
  }

  const bundle = join(
    extracted,
    "libexec",
    "worldant",
    "typescript",
    pin.typescript_go.commit,
  )
  const manifestPath = join(bundle, "manifest.json")
  if (!existsSync(manifestPath)) {
    throw new Error("release archive omits the pinned TypeScript checker manifest")
  }
  const manifest = readJson(manifestPath)
  const expected = {
    schema: "worldant.typescript-checker-bundle.v1",
    typescript_go_commit: pin.typescript_go.commit,
    go_version: pin.go.version,
    adapter_protocol: pin.adapter_protocol,
    policy: pin.policy,
    node_types_version: pin.native_platform_types["@types/node"],
    undici_types_version: pin.native_platform_types["undici-types"],
    bun_types_commit: pin.native_platform_types.bun_repository_commit,
  }
  for (const [field, value] of Object.entries(expected)) {
    if (manifest[field] !== value) {
      throw new Error(`checker manifest ${field} does not match the release pin`)
    }
  }
  if (JSON.stringify(manifest.declaration_inventory) !== JSON.stringify(pin.declaration_inventory)) {
    throw new Error("checker declaration inventory does not match the release pin")
  }
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    throw new Error("checker manifest has no artifact inventory")
  }

  const required = new Set([
    "LICENSE",
    "NOTICE.txt",
    "pin.json",
    "policy.json",
    checkerBinary,
    "platform/bun/index.d.ts",
    "platform/node/index.d.ts",
    "platform/node/node_modules/undici-types/index.d.ts",
  ])
  const manifested = new Set()
  let hasStandardDeclaration = false
  let hasTargetChecker = false

  for (const artifact of manifest.artifacts) {
    if (
      typeof artifact.path !== "string" ||
      !artifact.path ||
      posix.isAbsolute(artifact.path) ||
      posix.normalize(artifact.path) !== artifact.path ||
      artifact.path.split("/").includes("..") ||
      manifested.has(artifact.path)
    ) {
      throw new Error("checker manifest contains an invalid artifact path")
    }
    manifested.add(artifact.path)
    const artifactPath = join(bundle, ...artifact.path.split("/"))
    if (!existsSync(artifactPath) || !lstatSync(artifactPath).isFile()) {
      throw new Error(`checker artifact ${artifact.path} is absent from the release archive`)
    }
    const bytes = readFileSync(artifactPath)
    if (bytes.byteLength !== artifact.bytes || sha256(bytes) !== artifact.sha256) {
      throw new Error(`checker artifact ${artifact.path} failed manifest verification`)
    }
    if (artifact.path.startsWith("lib/lib.") && artifact.path.endsWith(".d.ts")) {
      hasStandardDeclaration = true
    }
    if (artifact.path === checkerBinary && artifact.target === target) {
      hasTargetChecker = true
      if (!(lstatSync(artifactPath).mode & 0o111)) {
        throw new Error(`checker executable ${checkerBinary} is not executable`)
      }
    }
    required.delete(artifact.path)
  }

  if (required.size > 0) {
    throw new Error(`checker manifest omits required artifacts: ${[...required].join(", ")}`)
  }
  if (!hasStandardDeclaration) {
    throw new Error("checker manifest omits the standard declaration bundle")
  }
  if (!hasTargetChecker) {
    throw new Error(`checker manifest omits ${target} executable ${checkerBinary}`)
  }
  if (!readFileSync(join(bundle, "pin.json")).equals(sourcePinBytes)) {
    throw new Error("packaged checker pin differs from the private release source")
  }

  const packaged = new Set()
  const pending = [bundle]
  while (pending.length > 0) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`checker bundle contains symlink ${entry.name}`)
      if (entry.isDirectory()) pending.push(path)
      else if (entry.isFile() && path !== manifestPath) {
        packaged.add(relative(bundle, path).split("\\").join("/"))
      }
    }
  }
  const omitted = [...packaged].filter((path) => !manifested.has(path))
  const absent = [...manifested].filter((path) => !packaged.has(path))
  if (omitted.length > 0 || absent.length > 0) {
    throw new Error(
      `checker manifest/archive inventory differs (unmanifested: ${omitted.join(", ")}; absent: ${absent.join(", ")})`,
    )
  }

  process.stdout.write(
    `verified ${basename(archivePath)} with ${manifested.size} pinned checker artifacts\n`,
  )
} finally {
  rmSync(extracted, { recursive: true, force: true })
}
