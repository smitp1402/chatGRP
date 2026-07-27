import { z } from "zod"

export const sessionNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
})

export type SessionNameInput = z.infer<typeof sessionNameSchema>

const promptVariableSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  default: z.string().optional(),
})

export const promptCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().trim().min(1, "Body is required").max(8000),
  kind: z.enum(["user_prompt", "system_prompt"]).default("user_prompt"),
  variables: z.array(promptVariableSchema).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  folderId: z.string().uuid().nullable().optional(),
  defaultModelId: z.string().nullable().optional(),
  visibility: z.enum(["private", "team"]).default("private"),
})

export const promptUpdateSchema = promptCreateSchema.partial()

export const folderNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
})
