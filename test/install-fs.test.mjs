import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { uninstall } from "../packages/cli/uninstall.js"
import { installedBinary } from "../packages/cli/install.js"
import { loadTrustPolicy, assertSignerResolved, toAnchoredIdentityPattern } from "../packages/cli/verify-manifest.mjs"

const freshHome = () => mkdtempSync(join(tmpdir(), "worldant-home-"))

test("uninstall removes package-owned paths and retains user data", () => {
  const home = freshHome()
  try {
    mkdirSync(join(home, "versions", "1.0.0"), { recursive: true })
    mkdirSync(join(home, "data"), { recursive: true })
    writeFileSync(join(home, "installed.json"), "{}")
    writeFileSync(join(home, "data", "keep.db"), "user")
    const { removed, retained } = uninstall(home)
    assert.ok(removed.some((p) => p.endsWith("versions")))
    assert.ok(!existsSync(join(home, "versions")))
    assert.ok(!existsSync(join(home, "installed.json")))
    assert.ok(existsSync(join(home, "data", "keep.db")), "user data must survive uninstall")
    assert.ok(retained.some((p) => p.endsWith("data")))
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("installedBinary fails closed when nothing is installed", () => {
  const home = freshHome()
  try {
    assert.throws(() => installedBinary(home), (e) => e.code === "NOT_INSTALLED")
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("loadTrustPolicy loads a resolved public signer identity", () => {
  const policy = loadTrustPolicy()
  const id = policy.sigstore.certificateIdentity
  assert.match(id, /^https:\/\/github\.com\/Midwess\/worldant\/\.github\/workflows\//)
  const privateRepoFragment = ["worldant", "internal"].join("-")
  assert.ok(!id.includes(privateRepoFragment), "public signer identity must not reveal the private repo")
})

test("assertSignerResolved accepts a resolved public identity", () => {
  assert.doesNotThrow(() =>
    assertSignerResolved({
      sigstore: {
        certificateIssuer: "https://token.actions.githubusercontent.com",
        certificateIdentity: "https://github.com/Midwess/worldant/.github/workflows/build-release.yml@refs/heads/main",
      },
    }),
  )
})

test("assertSignerResolved refuses a placeholder identity", () => {
  assert.throws(
    () => assertSignerResolved({ sigstore: { certificateIssuer: "https://x", certificateIdentity: "https://github.com/Midwess/RELEASE_SIGNER_REPO/.github/workflows/sign.yml@refs/heads/main" } }),
    (e) => e.code === "TRUST_POLICY_UNRESOLVED",
  )
})

test("assertSignerResolved refuses a missing identity", () => {
  assert.throws(() => assertSignerResolved({ sigstore: { certificateIssuer: "https://x" } }), (e) => e.code === "TRUST_POLICY_UNRESOLVED")
})

test("toAnchoredIdentityPattern matches only the exact identity (no sibling-ref / dot-wildcard bypass)", () => {
  const id = loadTrustPolicy().sigstore.certificateIdentity
  const re = new RegExp(toAnchoredIdentityPattern(id))
  assert.ok(re.test(id), "exact identity must match")
  assert.ok(!re.test(id + "-evil"), "sibling ref must not match (anchored)")
  assert.ok(!re.test(id.replace("build-release.yml", "build-releaseXyml")), "dot must be escaped, not a wildcard")
  assert.ok(!re.test("https://github.com/attacker/worldant/.github/workflows/build-release.yml@refs/heads/main"), "other owner must not match")
})
