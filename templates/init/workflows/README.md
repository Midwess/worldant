# Workflows

Workflows are durable TypeScript functions for important work that must survive retries, waiting,
and process restarts. Declare them with `"worldant::workflow"` or `defineWorkflow()`. Callers receive
a non-callable reference and must use `start(workflowRef, input)`; direct Workflow calls are invalid.
Put reusable durable IO checkpoints in `steps/`.
