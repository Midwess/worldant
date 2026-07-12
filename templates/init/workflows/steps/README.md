# Workflow Steps

Steps are internal Workflow IO checkpoints. Each `.ts` file default-exports a serializable
function. Keep external side effects idempotent because a failed Step may be retried.

