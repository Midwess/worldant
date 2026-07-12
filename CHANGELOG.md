# Changelog

All notable changes to the public Worldant distribution are documented here. This changelog covers
the **public distribution model only** (packaging, installer, examples, docs), not the private
runtime's internal history.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] — 2026-07-12

### Added
- `worldant init` now prints the template URL, manifest file count, every downloaded template file,
  every written file, the generated namespace, and next commands.
- `worldant build` and `worldant serve` now print the data mode, namespace, generated snapshot
  paths, artifact counts, generated schema paths, and generated `llms.txt` path.
- `worldant serve` now prints HTTP request/response status lines and websocket profile request
  outcomes without dumping payloads or auth headers.

## [1.0.4] — 2026-07-12

### Added
- `worldant init` now creates AI guidance entrypoints for Codex/OpenAI agents, Claude, Gemini,
  GitHub Copilot, Cursor, and `llms.txt`.
- Generated AI entrypoints point back to the canonical public Worldant docs while repeating the
  current Command/Workflow/Step, BYO auth, and PostgreSQL RLS rules locally.

## [1.0.3] — 2026-07-12

### Added
- Configurable single-app namespaces through `name` in `worldant.ts`.
- Automatic valid namespace generation from world directory names during initialization.

### Added
- Thin verifying npm installer (`@midwess/worldant`) with a pinned Sigstore trust policy.
- Release-manifest schema v1 (`schema/release-manifest.v1.json`).
- Public installation, security, and contribution documentation.
- `llms.txt` machine-discovery entry point.

## [1.0.0] — unreleased

The first release under the public distribution model. Worldant's runtime reached `0.6.0` under the
prior private release scheme; those historical tags and releases remain with the private repository
and are **not** republished here. `1.0.0` marks the start of the signed, immutable public
distribution — it is not a continuation of the private `0.x` source-release line.

[Unreleased]: https://github.com/Midwess/worldant/compare/v1.0.5...HEAD
[1.0.5]: https://github.com/Midwess/worldant/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/Midwess/worldant/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/Midwess/worldant/compare/v1.0.2...v1.0.3
[1.0.0]: https://github.com/Midwess/worldant/releases/tag/v1.0.0
