import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repository = "Midwess/worldant"
const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const cliRoot = join(publicRoot, "packages", "cli")

function manifest(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

export function releaseAssetNames(version) {
  return [
    "release-manifest.json",
    "release-manifest.json.sigstore",
    `worldant-${version}-darwin-arm64.tar.gz`,
    `worldant-${version}-linux-arm64.tar.gz`,
    `worldant-${version}-linux-x64.tar.gz`,
    `worldant-${version}.tgz`,
    `midwess-worldant-cli-${version}.tgz`,
  ]
}

export function validatePackageIdentities(library, cli) {
  if (library.name !== "@midwess/worldant") {
    throw new Error(`unexpected library package name ${library.name}`)
  }
  if (cli.name !== "@midwess/worldant-cli") {
    throw new Error(`unexpected CLI package name ${cli.name}`)
  }
  if (library.version !== cli.version) {
    throw new Error(`package versions differ: library ${library.version}, CLI ${cli.version}`)
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(library.version)) {
    throw new Error(`invalid package version ${library.version}`)
  }
  return library.version
}

export function missingReleaseAssets(version, assets) {
  const present = new Set(assets.map((asset) => typeof asset === "string" ? asset : asset.name))
  return releaseAssetNames(version).filter((name) => !present.has(name))
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options })
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`
    throw new Error(`${command} ${args.join(" ")} failed: ${detail}`)
  }
  return result.stdout.trim()
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}`)
  }
}

function release(version) {
  return JSON.parse(capture("gh", [
    "release",
    "view",
    `v${version}`,
    "--repo",
    repository,
    "--json",
    "tagName,isDraft,assets,url",
  ]))
}

function assertReleaseReady(version, candidate) {
  if (candidate.tagName !== `v${version}`) {
    throw new Error(`release tag ${candidate.tagName} does not match v${version}`)
  }
  const missing = missingReleaseAssets(version, candidate.assets ?? [])
  if (missing.length) {
    throw new Error(`GitHub release v${version} is missing required CLI assets: ${missing.join(", ")}`)
  }
}

function waitForPublication(name, version) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      if (capture("npm", ["view", `${name}@${version}`, "version"]) === version) return
    } catch {
      // Registry propagation can briefly return a miss immediately after publication.
    }
    const wait = spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 2000)"])
    if (wait.status !== 0) throw new Error("failed while waiting for npm registry propagation")
  }
  throw new Error(`npm did not expose ${name}@${version} after publication`)
}

async function main() {
  const sourceRoot = resolve(process.env.WORLDANT_SOURCE_DIR ?? join(publicRoot, ".."))
  const library = manifest(join(sourceRoot, "packages", "worldant", "package.json"))
  const cli = manifest(join(cliRoot, "package.json"))
  const version = validatePackageIdentities(library, cli)
  const candidate = release(version)
  assertReleaseReady(version, candidate)

  const npmUser = capture("npm", ["whoami"])
  console.log(`publish-npm: authenticated to npm as ${npmUser}.`)

  const temporary = mkdtempSync(join(tmpdir(), "worldant-publish-"))

  try {
    for (const name of [`worldant-${version}.tgz`, `midwess-worldant-cli-${version}.tgz`]) {
      run("gh", [
        "release",
        "download",
        `v${version}`,
        "--repo",
        repository,
        "--pattern",
        name,
        "--dir",
        temporary,
      ])
    }
    const libraryTarball = join(temporary, `worldant-${version}.tgz`)
    const cliTarball = join(temporary, `midwess-worldant-cli-${version}.tgz`)
    const stateScript = join(publicRoot, "scripts", "npm-release-state.mjs")
    const libraryState = capture(process.execPath, [
      stateScript,
      library.name,
      version,
      libraryTarball,
    ])
    const cliState = capture(process.execPath, [stateScript, cli.name, version, cliTarball])

    if (libraryState === "already-published") {
      console.log(`publish-npm: ${library.name}@${version} already exists; skipping.`)
    } else {
      run("npm", ["publish", libraryTarball, "--access", "public"], { cwd: publicRoot })
      waitForPublication(library.name, version)
      console.log(`publish-npm: published ${library.name}@${version}.`)
    }

    if (cliState === "already-published") {
      console.log(`publish-npm: ${cli.name}@${version} already exists; skipping.`)
    } else {
      run("npm", ["publish", cliTarball, "--access", "public"], { cwd: cliRoot })
      waitForPublication(cli.name, version)
      console.log(`publish-npm: published ${cli.name}@${version}.`)
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }

  if (candidate.isDraft) {
    run("gh", ["release", "edit", `v${version}`, "--repo", repository, "--draft=false", "--latest"])
    const finalized = release(version)
    if (finalized.isDraft) throw new Error(`GitHub release v${version} remained a draft`)
    console.log(`publish-npm: finalized GitHub release v${version}.`)
  }

  console.log(`publish-npm: ${library.name}@${version} and ${cli.name}@${version} are live.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`publish-npm: ${error.message}`)
    process.exitCode = 1
  })
}
