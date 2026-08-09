# worldant

Thin, verifying installer and launcher for the Worldant runtime.

```bash
npm install --global worldant-cli
worldant --help
```

This package does not contain the runtime binary. On install it fetches a signed release manifest,
verifies its Sigstore signature against a pinned trust policy, downloads the exact artifact for your
platform, verifies its SHA-256, safely extracts it, and runs only the verified binary. It fails
closed on unsupported platforms, bad signatures, digest mismatches, path-traversal archives, and
disallowed redirects.

See [INSTALL.md](https://github.com/Midwess/worldant/blob/main/INSTALL.md) and
[SECURITY.md](https://github.com/Midwess/worldant/blob/main/SECURITY.md).

License: Apache-2.0.
