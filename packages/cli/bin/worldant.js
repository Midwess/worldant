#!/usr/bin/env node
import { spawn } from "node:child_process"
import { constants } from "node:os"
import { installedBinary } from "../install.js"

try {
  const bin = installedBinary()
  const child = spawn(bin, process.argv.slice(2), { stdio: "inherit" })

  const signals = ["SIGINT", "SIGTERM", "SIGHUP"]
  for (const signal of signals) {
    process.on(signal, () => {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal)
    })
  }

  child.on("error", (e) => {
    console.error(`worldant [${e.code ?? "ERROR"}]: ${e.message}`)
    process.exit(1)
  })

  child.on("exit", (code, signal) => {
    if (signal) process.exit(128 + (constants.signals[signal] ?? 0))
    process.exit(code ?? 1)
  })
} catch (e) {
  console.error(`worldant [${e.code ?? "ERROR"}]: ${e.message}`)
  process.exit(1)
}
