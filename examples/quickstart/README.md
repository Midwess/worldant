# Quickstart

A minimal Worldant world. It runs only against a released `worldant` binary — no private source.

## 1. Install

```bash
npm install --global worldant
worldant --version
```

## 2. Initialize (or use this folder)

```bash
worldant init my-world --app todo
cd my-world
```

This folder mirrors what `init` produces: one app `todo` with a migration and one Command.

## 3. Build and serve

```bash
worldant build
worldant serve
```

## 4. Call the Command

`apps/todo/commands/add.ts` is published as Command `todo.add`. Reads and writes are Commands;
there is no separate Query or Mutation kind. Durable orchestration would live under
`apps/todo/workflows/` as a Workflow; internal Steps under `workflows/steps/` are never publicly
callable.
