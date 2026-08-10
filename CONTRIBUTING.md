# Contributing

Thank you for your interest in Worldant. This repository holds the **public packaging, installer,
examples, policies, and documentation** — not the runtime implementation.

## What you can contribute here

- Installer and verification code (`packages/cli/`, `scripts/`).
- Public examples that run only against released Worldant binaries (`examples/`).
- Documentation and policy improvements.

## What lives elsewhere

- The Rust runtime is proprietary and developed in a separate private repository. Runtime issues are
  triaged from public [Issues](https://github.com/Midwess/worldant/issues) but fixed privately.
- Long-form documentation is published from the company website repository (`Midwess/web`).

## Local development

```bash
git clone https://github.com/Midwess/worldant.git
cd worldant
npm install
npm test        # runs the installer verification test suite
```

The three repositories may be checked out as siblings for local work; none is nested as a submodule
of another.

## Ground rules

- Do not add any dependency, script, or ordinary CI workflow that fetches or embeds private
  Worldant source. The protected `build-release.yml` workflow is the sole release-authority
  exception and checks out only its explicit `source_ref`.
- Installer changes must preserve fail-closed behavior — new network or filesystem paths must route
  through the tested verification core in `packages/cli/installer-core.mjs`.
- Public CI must never execute contributor-controlled code with publishing credentials and must not
  use `pull_request_target`.
- Match the existing style; keep changes surgical and scoped to the request.

## Pull requests

Open a PR against `main`. CI runs the installer test suite, release-manifest schema validation, a
secret/private-reference disclosure scan, documentation link checks, and the installer fail-closed
smoke. Examples are exercised against a released binary in release CI, not on every PR. All checks
must pass.
