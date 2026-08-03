import { session } from "worldant/client"

type SqlReply<Row> = { command: string; rows: Row[]; rowsAffected: number }

async function loadItem(input: { id: number }) {
  "worldant::step"
  const reply = (await session.request("pgpaw.sql", {
    sql: "select id, title, done from todo_items where id = $1",
    params: [input.id],
  })) as SqlReply<{ id: number; title: string; done: boolean }>
  return reply.rows[0]
}
