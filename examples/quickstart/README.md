# Quickstart

A minimal Worldant world. It runs only against a released `worldant` binary — no private source.

## 1. Install

```bash
npm install --global @midwess/worldant-cli
worldant --help
```

## 2. Initialize (or use this folder)

```bash
worldant init todo
cd todo
```

This folder is the Worldant source root. Its application schema lives separately in
`../quickstart-pgpaw`.

## 3. Build and serve

```bash
worldant build
pgpaw migrate --source ../quickstart-pgpaw --namespace todo \
  --data-dir .worldant/data --database postgres
worldant serve
```

## 4. Call the Command

`apps/todo/commands/add.ts` is published as Command `todo.add`. Reads and writes are Commands;
there is no separate Query or Mutation kind. Durable orchestration would live under
`apps/todo/workflows/` as a Workflow; internal Steps under `workflows/steps/` are never publicly
callable.
