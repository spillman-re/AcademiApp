// src/types/prorroga.ts
export interface ProrrogaItem {
  id_prorroga: number;
  id_obligacion: number;
  fecha_inicio: string;
  fecha_fin: string;
  observacion?: string | null;
  id_inscripcion?: number;
  tipo_obligacion?: string;
  numero_cuota?: number | null;
  periodo?: string | null;
  fecha_vencimiento?: string;
  monto?: number;
  estado_obligacion?: string;
}