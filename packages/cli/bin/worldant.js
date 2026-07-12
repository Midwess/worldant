#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { installedBinary } from "../install.js"

try {
  const bin = installedBinary()
  const result = spawnSync(bin, process.argv.slice(2), { stdio: "inherit" })
  process.exit(result.status ?? 1)
} catch (e) {
  console.error(`worldant [${e.code ?? "ERROR"}]: ${e.message}`)
  process.exit(1)
}
