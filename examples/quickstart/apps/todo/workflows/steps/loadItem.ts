import { pgpaw } from "worldant"

async function loadItem(input: { id: number }) {
  "worldant::step"
  const reply = await pgpaw.sql<{ id: number; title: string; done: boolean }>(
    "select id, title, done from todo_items where id = $1",
    [input.id],
  )
  return reply.rows[0]
}
