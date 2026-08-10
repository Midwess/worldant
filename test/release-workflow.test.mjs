import { createHash } from "node:crypto"
import { execFileSync, spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import assert from "node:assert/strict"
import { test } from "node:test"

const repository = new URL("..", import.meta.url)
const workflow = readFileSync(new URL("../.github/workflows/build-release.yml", import.meta.url), "utf8")
const cliManifest = JSON.parse(readFileSync(new URL("../packages/cli/package.json", import.meta.url), "utf8"))
const verifier = new URL("../scripts/verify-release-archive.mjs", import.meta.url)
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

test("release workflow builds and packages the pinned checker for every supported target", () => {
  assert.match(workflow, /resolve:\n\s+name: Resolve immutable source revision/)
  assert.match(workflow, /sha="\$\(git -C source rev-parse HEAD\)"/)
  assert.match(workflow, /ref: \$\{\{ needs\.resolve\.outputs\.source_sha \}\}/)
  assert.match(workflow, /SOURCE_SHA: \$\{\{ needs\.resolve\.outputs\.source_sha \}\}/)
  for (const [target, archive, binary] of [
    ["aarch64-apple-darwin", "darwin-arm64", "worldant-tscheck-darwin-arm64"],
    ["x86_64-unknown-linux-gnu", "linux-amd64", "worldant-tscheck-linux-amd64"],
    ["aarch64-unknown-linux-gnu", "linux-arm64", "worldant-tscheck-linux-arm64"],
  ]) {
    assert.match(
      workflow,
      new RegExp(
        `target: ${target}\\n\\s+key: [^\\n]+\\n\\s+go-archive: ${archive}\\n\\s+checker-binary: ${binary}`,
      ),
    )
  }
  assert.match(workflow, /source\/tools\/typescript-checker\/pin\.json/)
  assert.match(workflow, /go_archive_sha256/)
  assert.match(workflow, /shasum -a 256 --check/)
  assert.match(workflow, /source\/tools\/typescript-checker\/build\.sh/)
  assert.match(workflow, /fixtures\/semantic-error\.json/)
  assert.match(workflow, /cp -R "\$checker_root\/\." "\$package_checker\/"/)
  assert.match(workflow, /bin\/worldant "libexec\/worldant\/typescript\/\$CHECKER_COMMIT"/)
  assert.match(workflow, /public\/scripts\/verify-release-archive\.mjs/)
  assert.match(
    workflow,
    /cargo build --release --target "\$TARGET" -p world-compiler --example typescript_normalize/,
  )
  assert.match(workflow, /node tools\/typescript-checker\/conformance\.mjs/)
  assert.match(workflow, /release\/browser\/wasm_exec\.js/)
  assert.match(workflow, /release\/browser\/worldant-tscheck\.wasm/)
  assert.match(workflow, /tools\/typescript-checker\/fixtures/)
  assert.match(
    workflow,
    /cargo test --release --target "\$TARGET" --workspace --exclude world-browser --exclude integration-test/,
  )
  assert.match(workflow, /test:\n\s+description: Run the optimized engine suite/)
  assert.match(
    workflow,
    /- name: Test the engine on this platform\n\s+if: \$\{\{ inputs\.test == true \}\}/,
  )
  assert.doesNotMatch(workflow, /world-host|world-share|world-build/)
})

test("release workflow publishes separate library and CLI packages", () => {
  assert.equal(cliManifest.name, "@midwess/worldant-cli")
  assert.equal(cliManifest.version, "1.2.1")
  assert.equal(cliManifest.bin.worldant, "bin/worldant.js")
  assert.match(workflow, /source\/scripts\/package-npm\.sh/)
  assert.match(workflow, /worldant-\$VERSION\.tgz/)
  assert.match(workflow, /npm-release-state\.mjs @midwess\/worldant "\$VERSION"/)
  assert.match(workflow, /npm-release-state\.mjs @midwess\/worldant-cli "\$VERSION"/)
  assert.match(workflow, /npm publish "\.\/release-assets\/worldant-\$VERSION\.tgz" --access public --provenance/)
  assert.match(workflow, /npm publish "\$tarball" --access public --provenance/)
  assert.match(workflow, /verify-release-assets\.mjs "v\$VERSION" release-assets/)
  assert.match(workflow, /value\.isDraft \? 0 : 1/)
  assert.match(workflow, /npm install --global npm@11\.5\.1/)
  assert.match(workflow, /npm install --ignore-scripts --no-package-lock --prefix npm-smoke/)
  assert.match(workflow, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_SECRET_KEY \}\}/)
  assert.doesNotMatch(workflow, /_authToken/)
  assert.equal(existsSync(new URL("../.github/workflows/release.yml", import.meta.url)), false)
})

function write(path, content, mode) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  if (mode !== undefined) chmodSync(path, mode)
}

function fixtureArchive(root, { corruptPolicy = false, includeBundle = true } = {}) {
  const target = "x86_64-unknown-linux-gnu"
  const checker = "worldant-tscheck-linux-amd64"
  const commit = "a".repeat(40)
  const inventory = {
    standard: { count: 1, sha256: "1".repeat(64) },
    node: { count: 1, sha256: "2".repeat(64) },
    undici: { count: 1, sha256: "3".repeat(64) },
    bun: { count: 1, sha256: "4".repeat(64) },
  }
  const pin = {
    schema: "worldant.typescript-checker-pin.v1",
    typescript_go: { commit },
    go: { version: "1.26.5" },
    adapter_protocol: "worldant.typescript-checker.v1",
    policy: "worldant.typescript-policy.v1",
    native_platform_types: {
      "@types/node": "22.20.1",
      "undici-types": "6.21.0",
      bun_repository_commit: "b".repeat(40),
    },
    declaration_inventory: inventory,
    native_targets: [target],
  }
  const pinBytes = Buffer.from(`${JSON.stringify(pin, null, 2)}\n`)
  const sourcePin = join(root, "pin.json")
  write(sourcePin, pinBytes)

  const packageRoot = join(root, "package")
  write(join(packageRoot, "bin", "worldant"), "worldant\n", 0o755)
  if (includeBundle) {
    const bundle = join(packageRoot, "libexec", "worldant", "typescript", commit)
    const files = new Map([
      ["LICENSE", Buffer.from("license\n")],
      ["NOTICE.txt", Buffer.from("notice\n")],
      ["pin.json", pinBytes],
      ["policy.json", Buffer.from('{"schema":"worldant.typescript-policy.v1"}\n')],
      [checker, Buffer.from("checker\n")],
      ["lib/lib.es2023.d.ts", Buffer.from("interface Array<T> {}\n")],
      ["platform/node/index.d.ts", Buffer.from("declare const process: unknown\n")],
      [
        "platform/node/node_modules/undici-types/index.d.ts",
        Buffer.from("export interface Request {}\n"),
      ],
      ["platform/bun/index.d.ts", Buffer.from("declare const Bun: unknown\n")],
    ])
    for (const [path, bytes] of files) {
      write(join(bundle, ...path.split("/")), bytes, path === checker ? 0o755 : undefined)
    }
    const artifacts = [...files].map(([path, bytes]) => ({
      path,
      target: path === checker ? target : "all",
      sha256: sha256(bytes),
      bytes: bytes.byteLength,
    }))
    const manifest = {
      schema: "worldant.typescript-checker-bundle.v1",
      typescript_go_commit: commit,
      go_version: pin.go.version,
      adapter_protocol: pin.adapter_protocol,
      policy: pin.policy,
      node_types_version: pin.native_platform_types["@types/node"],
      undici_types_version: pin.native_platform_types["undici-types"],
      bun_types_commit: pin.native_platform_types.bun_repository_commit,
      declaration_inventory: inventory,
      artifacts,
    }
    write(join(bundle, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
    if (corruptPolicy) write(join(bundle, "policy.json"), "corrupt\n")
  }

  const archive = join(root, "worldant.tar.gz")
  execFileSync("tar", ["-C", packageRoot, "-czf", archive, "bin", "libexec"].filter((item) => {
    return includeBundle || item !== "libexec"
  }))
  return { archive, sourcePin, target, checker }
}

function verify(fixture) {
  return spawnSync(
    process.execPath,
    [verifier.pathname, fixture.archive, fixture.sourcePin, fixture.target, fixture.checker],
    { cwd: repository.pathname, encoding: "utf8" },
  )
}

test("release archive verifier accepts the complete pinned libexec tree", () => {
  const root = mkdtempSync(join(tmpdir(), "worldant-release-test-"))
  try {
    const result = verify(fixtureArchive(root))
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /verified worldant\.tar\.gz with 9 pinned checker artifacts/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("release archive verifier rejects missing and mismatched checker bundles", () => {
  for (const options of [{ includeBundle: false }, { corruptPolicy: true }]) {
    const root = mkdtempSync(join(tmpdir(), "worldant-release-test-"))
    try {
      const result = verify(fixtureArchive(root, options))
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /omits the pinned TypeScript checker manifest|failed manifest verification/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})
