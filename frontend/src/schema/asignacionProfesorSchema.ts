import { z } from "zod";

export const asignacionProfesorSchema = z.object({
  id_profesor: z.number().min(1, "Debe seleccionar un profesor"),
  id_grupo: z.number().min(1, "Debe seleccionar un grupo"),
});

export type AsignacionProfesorFormData = z.infer<typeof asignacionProfesorSchema>;