# Workflow Steps

Steps are internal Workflow IO checkpoints declared with `"worldant::step"` or `defineStep()`.
They are callable only from Workflow replay and never appear in public catalogs. Keep external side
effects idempotent because a failed Step may be retried.
