// src/types/inscripcion.ts
export interface Inscripcion {
  id_inscripcion: number;
  id_estudiante: number;
  id_grupo: number;
  fecha_inscripcion: string;
  estado_inscripcion: "ACTIVA" | "FINALIZADA" | "CANCELADA";
  observacion?: string | null;
  nombre_estudiante?: string;
  apellido_estudiante?: string;
  nombre_grupo?: string;
  nombre_curso?: string;
}