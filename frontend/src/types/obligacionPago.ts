// src/types/obligacionPago.ts
export interface ObligacionPagoItem {
  id_obligacion: number;
  id_inscripcion: number;
  tipo_obligacion: "MATRICULA" | "MENSUALIDAD";
  numero_cuota: number | null;
  periodo: string | null;
  fecha_vencimiento: string;
  monto: number;
  estado: "PENDIENTE" | "PAGADA" | "ANULADA";
  total_pagado: number;
  saldo_pendiente: number;
  id_estudiante?: number;
  id_grupo?: number;
  nombre_grupo?: string;
  id_curso?: number;
  nombre_curso?: string;
}