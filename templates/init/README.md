# Worldant World

This is a blank Worldant world. Add executable functions under `src/`. The generated `worldant.ts`
names the application, world, application node, and network-facing host node explicitly.

Native-only listener, PgPaw, module, and runtime settings live under
`platform: { kind: "native", ... }`. Worldant installs its profile on the application node, links
that node to the host, and attaches WebSocket/WebTransport listeners only to the host.

```bash
worldant check
worldant serve
```

Read `llms.txt` before using an AI coding agent in this world. It points to the canonical docs in
the public Worldant repository and repeats the current authoring rules.
