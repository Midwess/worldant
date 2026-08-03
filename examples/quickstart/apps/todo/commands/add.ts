import { session } from "worldant/client"

type SqlReply<Row> = { command: string; rows: Row[]; rowsAffected: number }

async function add(input: { title: string }) {
  "worldant::command"
  const reply = (await session.request("pgpaw.sql", {
    sql: "insert into todo_items (title) values ($1) returning id, title, done, created_at",
    params: [input.title],
  })) as SqlReply<{ id: number; title: string; done: boolean; created_at: string }>
  return reply.rows[0]
}
