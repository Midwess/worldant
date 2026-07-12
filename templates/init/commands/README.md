# Commands

Commands are ordinary executable TypeScript functions. Each `.ts` file default-exports a function;
its path defines its callable ID.

```ts
export default async function hello(input: { name: string }) {
  return { message: `Hello, ${input.name}` }
}
```

