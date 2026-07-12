import type { NodeConfig } from "worldant"

export default {
  dataDir: ".worldant/data",
  poolMaxConnections: 2,
  maxWorkflowWorkers: 2,
  middleware: [],
} satisfies NodeConfig
