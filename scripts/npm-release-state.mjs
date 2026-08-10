import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

export function tarballIntegrity(path) {
  return `sha512-${createHash("sha512").update(readFileSync(path)).digest("base64")}`
}

export function registryState(localIntegrity, publishedIntegrity) {
  if (publishedIntegrity === null) return "publish"
  if (publishedIntegrity !== localIntegrity) {
    throw new Error(
      `registry integrity ${publishedIntegrity} does not match exact tarball ${localIntegrity}`,
    )
  }
  return "already-published"
}

function publishedIntegrity(name, version) {
  const result = spawnSync(
    process.env.NPM_COMMAND ?? "npm",
    ["view", `${name}@${version}`, "dist.integrity", "--json"],
    { encoding: "utf8" },
  )
  if (result.status === 0) {
    const value = JSON.parse(result.stdout)
    if (typeof value !== "string" || !value.startsWith("sha512-")) {
      throw new Error(`registry returned malformed integrity for ${name}@${version}`)
    }
    return value
  }
  try {
    const failure = JSON.parse(result.stdout)
    if (failure?.error?.code === "E404") return null
  } catch {}
  throw new Error(
    result.stderr.trim() || result.stdout.trim() ||
      `npm view failed with exit ${result.status}`,
  )
}

function main() {
  const [name, version, tarball] = process.argv.slice(2)
  if (!name || !/^\d+\.\d+\.\d+$/.test(version ?? "") || !tarball) {
    throw new Error("usage: npm-release-state.mjs <package> <version> <tarball>")
  }
  console.log(registryState(
    tarballIntegrity(resolve(tarball)),
    publishedIntegrity(name, version),
  ))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
