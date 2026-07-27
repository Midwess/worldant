# Commands

Commands are immediate public functions declared by a `"worldant::command"` directive or
`defineCommand()`. Their stable ID comes from the world namespace and top-level binding, not the
file path or authored exports.

```ts
async function hello(input: { name: string }) {
  "worldant::command"
  return { message: `Hello, ${input.name}` }
}
```
