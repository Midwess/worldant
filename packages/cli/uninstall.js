#!/usr/bin/env node
import { rmSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { pathToFileURL } from "node:url"

export const installRoot = () => process.env.WORLDANT_HOME ?? join(homedir(), ".worldant")

export function uninstall(root = installRoot()) {
  const removed = []
  const retained = []
  for (const owned of ["versions", "current", "installed.json"]) {
    const p = join(root, owned)
    if (existsSync(p)) {
      rmSync(p, { recursive: true, force: true })
      removed.push(p)
    }
  }
  const userData = join(root, "data")
  if (existsSync(userData)) retained.push(userData)
  return { removed, retained }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { removed, retained } = uninstall()
  console.log(`Removed ${removed.length} package-owned path(s).`)
  if (retained.length) {
    console.log("Retained user data (not deleted):")
    for (const r of retained) console.log(`  ${r}`)
  }
}
