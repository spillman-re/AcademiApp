// src/schema/profesorSchema.ts
import { z } from "zod";

export const profesorSchema = z.object({
  nombres: z
    .string()
    .trim()
    .min(1, "Los nombres son requeridos")
    .max(100, "Máximo 100 caracteres"),
  apellidos: z
    .string()
    .trim()
    .min(1, "Los apellidos son requeridos")
    .max(100, "Máximo 100 caracteres"),
  telefono: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
  especialidad: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
});

export type ProfesorFormData = z.infer<typeof profesorSchema>;