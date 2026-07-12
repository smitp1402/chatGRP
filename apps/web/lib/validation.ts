import { z } from "zod"

export const sessionNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
})

export type SessionNameInput = z.infer<typeof sessionNameSchema>
