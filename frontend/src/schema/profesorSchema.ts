import { z } from "zod";

export const profesorSchema = z.object({
  nombres: z.string().trim().min(1, "Los nombres son obligatorios").max(100),
  apellidos: z.string().trim().min(1, "Los apellidos son obligatorios").max(100),
  telefono: z.string().trim().max(20, "Máximo 20 caracteres").optional(),
  especialidad: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
});

export type ProfesorFormData = z.infer<typeof profesorSchema>;