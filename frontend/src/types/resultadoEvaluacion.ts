// src/types/resultadoEvaluacion.ts
export interface ResultadoEvaluacionItem {
  id_resultado: number;
  id_evaluacion: number;
  id_inscripcion: number;
  nota: number | null;
  estado_resultado: "CALIFICADO" | "NO_SE_PRESENTO";
  tipo_evaluacion?: string;
  id_sesion?: number;
  id_estudiante?: number;
  codigo_estudiante?: string;
  nombres?: string;
  apellidos?: string;
}