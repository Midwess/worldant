---
name: worldant
description: Build or integrate Worldant worlds using Commands, Workflows, PostgreSQL, and generated AI knowledge files.
---

# Worldant Skill

Read `../../worldant.llms.txt` before changing or generating Worldant code.

Use this skill when:

- Creating a Worldant world.
- Adding Commands, Workflows, Steps, or PgPaw-owned schema and RLS.
- Integrating a client with a served Worldant endpoint.
- Writing AI-facing docs for a Worldant world.

Rules:

- Commands and Workflows are the only public callables.
- Steps are internal Workflow checkpoints.
- Do not create Query, Mutation, Reactive/Rule, Goal, generic Action, or public Step APIs.
- Auth is bring-your-own. Worldant exposes headers to PostgreSQL as `request.headers`.
- Application-table schema, RLS, and migrations belong in a separate PgPaw project.
