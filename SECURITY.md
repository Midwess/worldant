# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities privately through GitHub's **Report a vulnerability** feature on this
repository (Security tab → Advisories). Do not open a public issue for undisclosed vulnerabilities.

We aim to acknowledge reports within 3 business days.

## Release integrity model

Every official Worldant binary is described by a signed, versioned **release manifest**:

- **Immutable artifacts** — each target artifact has a version-addressed HTTPS URL and a SHA-256
  digest. The manifest is published only after every referenced artifact exists.
- **Signature** — the manifest is keyless-signed with Sigstore by the dedicated, protected `sign.yml`
  workflow in this public repository. The installer verifies the signature against a trust policy
  (`packages/cli/trust-policy.json`) shipped and versioned with the installer before trusting any
  artifact URL. The pinned identity is
  `https://github.com/Midwess/worldant/.github/workflows/sign.yml@refs/heads/main` with issuer
  `https://token.actions.githubusercontent.com`.
- **Evidence** — every release binds checksums, an SPDX SBOM, and in-toto provenance by URL, digest,
  and media type.
- **Fail-closed installer** — the installer rejects unsupported platforms, malformed manifests,
  invalid signatures, digest mismatches, path-traversal archives, and disallowed redirects.

## Signing trust lifecycle

- The signing trust policy is versioned with the installer; changing it requires a new installer
  release.
- Routine release keys/identities rotate before expiration; the trust policy authorizes a successor
  before the predecessor expires so supported installers verify without disabling signature checks.
- A compromised signing key cannot be trusted to revoke itself. Root compromise triggers an
  out-of-band security notice and a new installer trust root.

### Why signing happens in this public repository

Keyless Sigstore certificates embed the signing workflow's OIDC identity in the public signature
bundle. Signing from the private runtime repository would therefore leak its name in every public
release. Instead, the private authority builds and attests the binaries, publishes the immutable
artifacts and an **unsigned** manifest, then dispatches a signing request to `sign.yml` here.
`sign.yml` re-verifies every artifact digest against the immutable store and only then keyless-signs
the manifest bytes — so the signature's identity is this public repo, and no private repo is
disclosed. `sign.yml` runs in a protected environment, never on pull requests, and holds no
private-source credential. Cross-version replay is prevented because the signed bytes carry the
version and the installer requires `manifest.version == package.version`.

## Supported versions

The public distribution model begins at 1.0.0. Only the latest published minor line receives security
updates unless otherwise stated in the changelog.

## What this repository does not contain

This repository never contains the private runtime source, private build credentials, or signing
keys. Ordinary public CI has no credential that can clone the private repository. The protected
release environment alone receives a narrowly scoped checkout credential and never runs untrusted code
with publishing credentials.
