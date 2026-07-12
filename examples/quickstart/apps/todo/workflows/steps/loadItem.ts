import { db, sql } from "worldant"

export default async function loadItem(input: { id: number }) {
  return db.one<{ id: number; title: string; done: boolean }>(sql`
    select id, title, done from todo_items where id = ${input.id}
  `)
}
