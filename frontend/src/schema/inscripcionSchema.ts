// src/schema/inscripcionSchema.ts
import { z } from "zod";

export const inscripcionSchema = z.object({
  id_estudiante: z.number().min(1, "El estudiante es requerido"),
  id_curso: z.number().min(1, "Debe seleccionar un curso"),
  id_grupo: z.number().min(1, "Debe seleccionar un grupo"),
  observacion: z.string().trim().optional().or(z.literal("")),
});

export type InscripcionFormData = z.infer<typeof inscripcionSchema>;