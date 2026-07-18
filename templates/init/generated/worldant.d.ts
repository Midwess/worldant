declare module "worldant" {
  /**
   * Tagged SQL template: sql`select * from items where id = ${id}` binds values as parameters.
   * Values bind as JSON: arrays and objects arrive as jsonb (a JS array is NOT a Postgres array,
   * so `= any(${arr})` fails — unnest with `jsonb_array_elements_text(${arr})` instead), and
   * uuid parameters need an explicit cast (`${id}::uuid`).
   */
  export function sql(strings: TemplateStringsArray, ...values: unknown[]): SqlQuery;
  export type SqlQuery = { text: string; params: unknown[] };

  export type Tx = {
    /** First row as an object. Rejects when the query returns zero rows — use `many` when absence is expected. */
    one<T = Record<string, unknown>>(query: SqlQuery): Promise<T>;
    many<T = Record<string, unknown>>(query: SqlQuery): Promise<T[]>;
    /** Resolves to the number of affected rows. */
    exec(query: SqlQuery): Promise<number>;
  };

  export type Db = Tx & {
    /**
     * One explicit transaction over the callback-scoped `tx` handle (Commands only; unavailable
     * in Steps, whose db operations already join one kernel-owned transaction). Callback
     * resolution commits; rejection rolls back and rethrows. Nesting is not supported.
     */
    transaction<T>(callback: (tx: Tx) => Promise<T>): Promise<T>;
  };

  /**
   * Database access for Commands and Steps. Each standalone db operation owns an independent
   * transaction in Commands; in Steps all db operations join one kernel-owned transaction.
   * Type parameters are assertions only — results are not checked against your schema at
   * build time.
   */
  export const db: Db;

  /**
   * Emit a kernel event. Available in Commands and Steps. The runtime prefixes the app onto
   * the kind: `emit("reminder")` in app `todo` stores kind `todo.reminder`.
   */
  export function emit(kind: string, payload?: unknown): Promise<void>;

  /** Durable deterministic pause. Workflows only. */
  export function sleep(ms: number): Promise<void>;

  /** Durable wait until a matching event arrives. Workflows only. */
  export function waitForEvent(kind: string, condition?: unknown): Promise<unknown>;

  /** Type-level schema helper; erased at build time, inert at runtime. */
  export const z: any;

  /**
   * Served-ingress middleware for the root worldant.ts config. Runs before unary decoding and
   * once when a subscription is established. Subject, operation, origin, and original headers
   * are immutable; middleware may replace payload and opaque context or return a unary response.
   */
  export type Middleware = (
    request: {
      readonly subject: string;
      readonly operation: string;
      readonly headers: Record<string, string>;
      readonly metadata: unknown;
      readonly payload: unknown;
    },
    context: unknown,
    next: (payload?: unknown, context?: unknown) => Promise<unknown>,
  ) => unknown;

  export type WireConfig = {
    nodeName: string;
    bindAddress: string;
    port: number;
    webTransport: boolean;
    webSocket: boolean;
  };

  /** Static node settings for the root worldant.ts. Wire settings are required by serve. */
  export type NodeConfig = {
    name?: string;
    wire?: WireConfig;
    dsn?: string;
    dataDir?: string;
    poolMaxConnections?: number;
    maxWorkflowWorkers?: number;
    minVms?: number;
    maxVms?: number;
    vmIdleTtlSecs?: number;
    mailboxCap?: number;
    replicaCap?: number;
    warmSetBudget?: number;
    middleware?: Middleware[];
  };
}
