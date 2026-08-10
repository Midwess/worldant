import type { NodeConfig } from "worldant"

export default {
  application: "worldant",
  world: "worldant",
  node: { name: "worldant-app" },
  host: { name: "worldant-host" },
  platform: {
    kind: "native",
    pgpaw: {
      builtin: true,
      dataDir: ".worldant/data",
      databaseName: "postgres",
      minConnections: 0,
      maxConnections: 2,
    },
    wire: {
      bindAddress: "127.0.0.1",
      port: 8787,
      webTransport: true,
      webSocket: true,
    },
    runtime: { maxWorkflowWorkers: 2 },
  },
  middleware: [],
} satisfies NodeConfig
