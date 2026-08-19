import { z } from "zod";

export const crearGrupoSchema = z.object({
  nombre_grupo: z
    .string()
    .min(1, "El nombre del grupo es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres"),

  fecha_inicio: z
    .string()
    .min(1, "La fecha de inicio es obligatoria"),
});

export const actualizarGrupoSchema = z.object({
  nombre_grupo: z
    .string()
    .min(1, "El nombre del grupo es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres"),
});

export function esCrearGrupoFormData(
  data: CrearGrupoFormData | ActualizarGrupoFormData
): data is CrearGrupoFormData {
  return "fecha_inicio" in data;
}

export type CrearGrupoFormData = z.infer<typeof crearGrupoSchema>;

export type ActualizarGrupoFormData = z.infer<
  typeof actualizarGrupoSchema
>;
