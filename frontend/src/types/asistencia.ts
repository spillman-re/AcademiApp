// src/types/asistencia.ts
export interface AsistenciaItem {
  id_asistencia: number;
  id_inscripcion: number;
  id_sesion: number;
  estado_asistencia: "PRESENTE" | "AUSENTE" | "JUSTIFICADO" | "SUSPENDIDO_POR_MORA";
  observacion?: string | null;
  id_estudiante?: number;
  nombres?: string;
  apellidos?: string;
  id_grupo?: number;
  fecha_programada?: string;
  hora_inicio?: string;
  hora_fin?: string;
}