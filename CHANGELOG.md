# Changelog

All notable changes to the public Worldant distribution are documented here. This changelog covers
the **public distribution model only** (packaging, installer, examples, docs), not the private
runtime's internal history.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Thin verifying npm installer (`worldant`) with a pinned Sigstore trust policy.
- Release-manifest schema v1 (`schema/release-manifest.v1.json`).
- Public installation, security, and contribution documentation.
- `llms.txt` machine-discovery entry point.

## [1.0.0] — unreleased

The first release under the public distribution model. Worldant's runtime reached `0.6.0` under the
prior private release scheme; those historical tags and releases remain with the private repository
and are **not** republished here. `1.0.0` marks the start of the signed, immutable public
distribution — it is not a continuation of the private `0.x` source-release line.

[Unreleased]: https://github.com/Midwess/worldant/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Midwess/worldant/releases/tag/v1.0.0
