import { z } from "zod";

export const cursoSchema = z.object({
  nombre_curso: z
    .string()
    .min(1, "El nombre del curso es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres"),

  descripcion: z
    .string()
    .optional(),

  duracion: z
    .string()
    .min(1, "Debes establecer la duracion del curso"),

  precio: z
    .number({
      error: "El precio debe ser un número",
    })  
    .min(0.01, "Debes establecer un precio mayor a 0"),
});

export type CursoFormData = z.infer<typeof cursoSchema>;