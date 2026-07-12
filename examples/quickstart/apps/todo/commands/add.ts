import { db, sql } from "worldant"

export default async function add(input: { title: string }) {
  return db.one(sql`
    insert into todo_items (title)
    values (${input.title})
    returning id, title, done, created_at
  `)
}
