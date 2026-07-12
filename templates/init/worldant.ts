import type { NodeConfig } from "worldant"

export default {
  listen: "127.0.0.1:8787",
  dataDir: ".worldant/data",
  poolMaxConnections: 2,
  maxWorkflowWorkers: 2,
  middleware: [],
} satisfies NodeConfig

