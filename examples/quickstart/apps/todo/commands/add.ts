import { pgpaw } from "worldant"

async function add(input: { title: string }) {
  "worldant::command"
  const reply = await pgpaw.sql(
    "insert into todo_items (title) values ($1) returning id, title, done, created_at",
    [input.title],
  )
  return reply.rows[0]
}
