import { emit } from "worldant"

export default async function sendReminder(input: { id: number; title: string }) {
  emit("todo.reminder", { id: input.id, title: input.title })
  return { reminded: true }
}
