import { emit } from "worldant"

async function sendReminder(input: { id: number; title: string }) {
  "worldant::step"
  await emit("reminder", { id: input.id, title: input.title })
  return { reminded: true }
}
