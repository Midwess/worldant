# Changelog

All notable changes to the public Worldant distribution are documented here. This changelog covers
the **public distribution model only** (packaging, installer, examples, docs), not the private
runtime's internal history.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.8] — 2026-07-13

### Changed
- Maintenance release carrying the current committed Worldant source, public package metadata,
  examples, and az-wire submodule updates after `1.0.7`.

## [1.0.7] — 2026-07-13

### Added
- `worldant serve` now requires explicit `wire` configuration for node identity, bind address,
  shared port, and enabled transports.
- Serve now binds enabled transports through one supervised host before reporting readiness, and
  shutdown awaits listeners, workers, middleware runtime, and the data plane.
- Public docs and init templates now describe separate world `name` and deployment `wire.nodeName`
  identities.

## [1.0.6] — 2026-07-12

### Added
- `worldant serve` now starts and announces the WebTransport endpoint alongside the websocket
  endpoint, including the self-signed certificate hash needed by WebTransport clients.
- If WebTransport cannot bind, `serve` prints the failure instead of staying silent.

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

[Unreleased]: https://github.com/Midwess/worldant/compare/v1.0.8...HEAD
[1.0.8]: https://github.com/Midwess/worldant/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/Midwess/worldant/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/Midwess/worldant/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/Midwess/worldant/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/Midwess/worldant/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/Midwess/worldant/compare/v1.0.2...v1.0.3
[1.0.0]: https://github.com/Midwess/worldant/releases/tag/v1.0.0
