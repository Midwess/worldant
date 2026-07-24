import type { NodeConfig } from "worldant"

export default {
  pgpaw: {
    builtin: true,
    dataDir: ".worldant/data",
    databaseName: "postgres",
    minConnections: 0,
    maxConnections: 2,
  },
  wire: {
    nodeName: "worldant",
    bindAddress: "127.0.0.1",
    port: 8787,
    webTransport: true,
    webSocket: true,
  },
  maxWorkflowWorkers: 2,
  middleware: [],
} satisfies NodeConfig
