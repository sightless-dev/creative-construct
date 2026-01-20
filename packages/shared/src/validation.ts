import { z } from "zod";
export const TemplateV1Schema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    background: z.string().min(1),
  }),
  slots: z.array(z.object({
    key: z.string().min(1),
    kind: z.enum(["image","text"]),
    category: z.enum(["BG","TEXT","ELEMENTS"]),
    required: z.boolean().optional(),
  })),
  layers: z.array(z.any())
});
