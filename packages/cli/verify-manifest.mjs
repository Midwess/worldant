import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { InstallError, parseManifest } from "./installer-core.mjs"

const here = dirname(fileURLToPath(import.meta.url))

const PLACEHOLDER = /RELEASE_SIGNER_REPO|REPLACE_ME|\$\{/

export function assertSignerResolved(policy) {
  const id = policy?.sigstore?.certificateIdentity
  const issuer = policy?.sigstore?.certificateIssuer
  if (typeof id !== "string" || !id.startsWith("https://") || PLACEHOLDER.test(id) || typeof issuer !== "string") {
    throw new InstallError(
      "TRUST_POLICY_UNRESOLVED",
      "Signing identity is unresolved. Refusing to verify against an unfinalized trust policy.",
    )
  }
  return { id, issuer }
}

export function loadTrustPolicy() {
  const policy = JSON.parse(readFileSync(join(here, "trust-policy.json"), "utf8"))
  assertSignerResolved(policy)
  return policy
}

// sigstore-js matches the identity with String.match, i.e. an UNANCHORED RegExp. Escape every regex
// metacharacter and anchor both ends so the pinned identity matches exactly and cannot be satisfied
// by a sibling ref (e.g. refs/heads/main-evil) or a `.`-as-wildcard collision.
export function toAnchoredIdentityPattern(identity) {
  const escaped = identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return `^${escaped}$`
}

export async function verifyManifest(manifestBytes, sigstoreBundleBytes, policy) {
  const { id, issuer } = assertSignerResolved(policy)
  let bundle
  try {
    bundle = JSON.parse(sigstoreBundleBytes.toString("utf8"))
  } catch {
    throw new InstallError("MALFORMED_SIGNATURE", "Sigstore bundle is not valid JSON.")
  }
  let verifyModule
  try {
    verifyModule = await import("sigstore")
  } catch {
    throw new InstallError("SIGSTORE_UNAVAILABLE", "The 'sigstore' verifier dependency is not installed.")
  }
  try {
    await verifyModule.verify(bundle, manifestBytes, {
      certificateIssuer: issuer,
      certificateIdentityURI: toAnchoredIdentityPattern(id),
    })
  } catch (e) {
    if (/TUF|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(e.message)) {
      throw new InstallError("TRUST_ROOT_UNAVAILABLE", `Could not fetch the Sigstore trust root: ${e.message}.`)
    }
    throw new InstallError("SIGNATURE_INVALID", `Manifest signature did not verify against ${id}: ${e.message}.`)
  }
  return parseManifest(manifestBytes)
}
