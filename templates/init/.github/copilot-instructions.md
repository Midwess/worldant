# Worldant Copilot Instructions

Read `llms.txt` before editing this Worldant world.

Canonical Worldant AI docs:

- https://github.com/Midwess/worldant/blob/main/ai/worldant.llms.txt
- https://github.com/Midwess/worldant/blob/main/ai/llms-full.txt

Use Commands for immediate functions, Workflows for durable deterministic orchestration, and Steps
only as internal Workflow IO checkpoints. Auth is bring-your-own; write app authorization as normal
PostgreSQL RLS in migrations.
