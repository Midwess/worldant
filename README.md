# Worldant

Worldant is a filesystem-authored runtime for immediate application functions and durable
processes. Truth and realtime both come from a single embedded PostgreSQL engine — there is no
duplicate application data store.

This is the **public product, packaging, release, and support** repository. The Rust runtime source
is proprietary and lives in a separate private repository. Everything here is Apache-2.0. Ordinary
public CI consumes only signed, immutable release artifacts; the protected release environment may
check out an exact private source revision to build, sign, and publish a release.

## Install

Install the TypeScript authoring, client, and browser runtime in an application:

```bash
npm install @midwess/worldant
```

Install the native CLI globally:

```bash
npm install --global @midwess/worldant-cli
worldant --help
```

The `@midwess/worldant-cli` package is a thin, verifying installer. On install it:

1. Resolves its own exact version.
2. Maps your OS/architecture to one signed manifest target (macOS arm64/x64, Linux arm64/x64).
3. Fetches the exact signed release manifest from an immutable origin.
4. Verifies the manifest signature against a pinned trust policy shipped with the installer.
5. Downloads the exact artifact, verifies its SHA-256, and safely extracts it.
6. Installs into a package-owned versioned directory and runs only the verified binary.

It fails closed on unknown platforms, malformed manifests, signature failures, digest mismatches,
path-traversal archives, and redirects to disallowed origins. See [INSTALL.md](INSTALL.md).

## What Worldant runs

Two public callable concepts are declared by directives or their wrapper functions. Directories are
organizational: one source module may contain presentation code, Commands, Workflows, internal
Steps, and helpers. Public identity is the configured application plus the declared binding name.
Moving a declaration without renaming it does not change that identity.

| Declaration | Kind | Meaning |
|-------------|------|---------|
| `"worldant::command"` or `defineCommand()` | **Command** | Immediate, non-durable function. Reads/writes PostgreSQL; may schedule Workflows. |
| `"worldant::workflow"` or `defineWorkflow()` | **Workflow** | Durable, deterministic orchestration replayed from a PostgreSQL journal. |
| `"worldant::step"` or `defineStep()` | *Step* | **Internal** Workflow IO checkpoint — never publicly callable. |

Query, Mutation, Reactive/Rule, Goal, and generic Action are **not** current concepts. Collection
sync and event streams are protocol facilities, not authored artifacts.

## Documentation

Canonical Worldant documentation lives in this repository under [`docs/worldant`](docs/worldant).
The company website renders those files for humans, and [`llms.txt`](llms.txt) points AI tools to
the same source.

## Repositories

| Repository | Role |
|------------|------|
| `Midwess/worldant` (this) | Public product, packaging, releases, support, docs, templates, LLM entry points |
| `Midwess/web` | Company website renderer for multi-product documentation |

The Worldant runtime source lives in a separate private repository. The protected release workflow
checks out an exact revision, builds every target, signs the manifest, publishes both npm packages,
and finalizes one immutable GitHub release.

## Support

- Bugs and feature requests: [GitHub Issues](https://github.com/Midwess/worldant/issues).
- Security reports: see [SECURITY.md](SECURITY.md).
- Contributions to packaging/docs: see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
