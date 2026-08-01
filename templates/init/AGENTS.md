# Worldant Agent Instructions

Read `llms.txt` first. It points to the canonical Worldant AI docs and contains the local rules for
this generated world.

Canonical docs:

- AI entrypoint: https://github.com/Midwess/worldant/blob/main/ai/worldant.llms.txt
- Full AI context: https://github.com/Midwess/worldant/blob/main/ai/llms-full.txt
- Human docs: https://github.com/Midwess/worldant/tree/main/docs/worldant

Core rules:

- Commands and Workflows are the only public callables.
- Steps are internal Workflow checkpoints and are never public APIs.
- Declare them with `"worldant::command"`, `"worldant::workflow"`, and `"worldant::step"`; directories are organizational only.
- Do not create Query, Mutation, Reactive/Rule, Goal, generic Action, or public Step APIs.
- Auth is bring-your-own. Worldant exposes request headers to PostgreSQL as `request.headers`.
- Application-table RLS and migrations belong in a separate PgPaw project.
