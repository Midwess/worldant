import { emit } from "worldant"

export default async function sendReminder(input: { id: number; title: string }) {
  await emit("reminder", { id: input.id, title: input.title })
  return { reminded: true }
}
