type HelloInput = {
  name: string
}

type HelloOutput = {
  message: string
}

async function hello(input: HelloInput): Promise<HelloOutput> {
  "worldant::command"
  return { message: `Hello, ${input.name}!` }
}
