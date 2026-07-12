# Worldant World

This is a blank Worldant world. Add executable functions under `commands/` and durable processes
under `workflows/`. Set `name` in `worldant.ts` to choose the app namespace. Otherwise Worldant
derives a valid name from the world directory.

`worldant serve` requires the complete `wire` object in `worldant.ts`. `name` identifies the world
and its callable addresses; `wire.nodeName` independently identifies this deployment node. The
generated config explicitly enables WebSocket and WebTransport on one bind address and shared port.

```bash
worldant build
worldant serve
```

Read `llms.txt` before using an AI coding agent in this world. It points to the canonical docs in
the public Worldant repository and repeats the current authoring rules.
