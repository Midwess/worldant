# Quickstart

A minimal Worldant world. It runs against a released `worldant` binary.

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

## 3. Check and serve

```bash
worldant check
pgpaw migrate --source ../quickstart-pgpaw --namespace todo \
  --data-dir .worldant/data --database postgres
worldant serve
```

## 4. Call the Command

The `"worldant::command"` directive on the `add` binding publishes Command `todo.add`; its path is
only organizational. Reads and writes are Commands, with no separate Query or Mutation kind. The
Workflow and internal Step examples use conventional folders for readability, but their directives,
not those folders, declare their roles.
