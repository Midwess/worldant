# Installing Worldant

## Requirements

- Node.js >= 20 (for the installer only).
- A supported platform: macOS arm64, macOS x64, Linux arm64, Linux x64.

## Install

```bash
npm install --global @midwess/worldant-cli
worldant --help
```

## What the installer verifies

The `@midwess/worldant-cli` npm package is a thin launcher. It never contains the runtime binary. On
`postinstall` it performs a fail-closed verification chain:

1. **Version resolution** — resolves its own exact package version; requires the fetched manifest to
   declare the identical version.
2. **Target mapping** — maps `process.platform`/`process.arch` to exactly one manifest target. An
   unsupported platform is a hard error with no fallback.
3. **Manifest fetch** — downloads the exact signed manifest from a pinned immutable origin over
   HTTPS only, with a bounded redirect allowlist.
4. **Signature verification** — verifies the Sigstore bundle over the manifest bytes against the
   trust policy pinned in the installer (`trust-policy.json`). If verification fails, no artifact URL
   is trusted.
5. **Artifact download + digest** — downloads the exact artifact URL from the verified manifest and
   checks its SHA-256 before touching disk.
6. **Safe extraction** — rejects absolute paths and any entry that escapes the install directory.
7. **Versioned install + atomic activation** — extracts into
   `~/.worldant/versions/<version>/`, then atomically swaps `~/.worldant/current`. An interrupted
   upgrade leaves the previous version active.

## Upgrade

```bash
npm install --global @midwess/worldant-cli@<new-version>
```

Upgrades install into a new versioned directory and verify fully before the launcher pointer is
switched. Interruption before activation leaves the previously verified version active.

## Uninstall

Run the package-owned uninstall first (npm does not run scripts on global uninstall), then remove
the launcher:

```bash
worldant-uninstall
npm uninstall --global @midwess/worldant-cli
```

`worldant-uninstall` removes only package-owned binaries and metadata under `~/.worldant` and
reports any user data under `~/.worldant/data`, which is **retained**, never deleted implicitly.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `WORLDANT_HOME` | Override the package-owned install root (default `~/.worldant`). |
| `WORLDANT_RELEASE_BASE` | Override the immutable release origin (must remain in the trust-policy allowlist). |

## Manual verification

Every release publishes the manifest, its signature, checksums, an SBOM, and provenance as release
assets. To verify independently, download `release-manifest.json` and `release-manifest.json.sigstore`
and verify with your preferred Sigstore verifier against the identity documented in
[SECURITY.md](SECURITY.md), then check each artifact's SHA-256 against the manifest.
