import assert from "node:assert/strict"
import { test } from "node:test"

import {
  registryState,
  tarballIntegrity,
} from "../scripts/npm-release-state.mjs"
import { assertSameAssets } from "../scripts/verify-release-assets.mjs"

test("npm reconciliation accepts only the exact tarball integrity", () => {
  const path = new URL("../package.json", import.meta.url)
  const integrity = tarballIntegrity(path)
  assert.equal(registryState(integrity, null), "publish")
  assert.equal(registryState(integrity, integrity), "already-published")
  assert.throws(() => registryState(integrity, "sha512-other"), /does not match/)
})

test("finalized release reconciliation requires the exact asset set and digests", () => {
  const assets = { "one.tgz": "a", "two.json": "b" }
  assert.doesNotThrow(() => assertSameAssets(assets, { ...assets }))
  assert.throws(
    () => assertSameAssets(assets, { ...assets, "three.sig": "c" }),
    /immutable/,
  )
  assert.throws(
    () => assertSameAssets(assets, { ...assets, "one.tgz": "changed" }),
    /immutable/,
  )
})
