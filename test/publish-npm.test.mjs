import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  missingReleaseAssets,
  releaseAssetNames,
  validatePackageIdentities,
} from "../scripts/publish-npm.mjs"

test("local publisher requires aligned scoped package identities", () => {
  assert.equal(
    validatePackageIdentities(
      { name: "@midwess/worldant", version: "1.2.0" },
      { name: "@midwess/worldant-cli", version: "1.2.0" },
    ),
    "1.2.0",
  )
  assert.throws(
    () => validatePackageIdentities(
      { name: "@midwess/worldant", version: "1.2.0" },
      { name: "@midwess/worldant-cli", version: "1.3.0" },
    ),
    /package versions differ/,
  )
})

test("local publisher refuses to expose a CLI without every signed platform asset", () => {
  const complete = releaseAssetNames("1.2.0")
  assert.deepEqual(missingReleaseAssets("1.2.0", complete), [])
  assert.deepEqual(
    missingReleaseAssets("1.2.0", complete.filter((name) => !name.includes("linux-arm64"))),
    ["worldant-1.2.0-linux-arm64.tar.gz"],
  )
})

test("npm run publish points at the local two-package publisher", () => {
  const root = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
  assert.equal(root.scripts.publish, "node scripts/publish-npm.mjs")
})
