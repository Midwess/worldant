import { sleep } from "worldant"
import loadItem from "./steps/loadItem.ts"
import sendReminder from "./steps/sendReminder.ts"

export default async function remind(input: { id: number; delayMs: number }) {
  await sleep(input.delayMs)
  const item = await loadItem({ id: input.id })
  if (item.done) return { reminded: false }
  return sendReminder({ id: item.id, title: item.title })
}
