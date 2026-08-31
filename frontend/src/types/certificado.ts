// src/types/certificado.ts
export interface CertificadoItem {
  id_certificado: number;
  id_inscripcion: number;
  fecha_emision: string;
  codigo_certificado: string;
  estado: "EMITIDO" | "ANULADO";
  id_estudiante?: number;
  codigo_estudiante?: string;
  nombres?: string;
  apellidos?: string;
  id_grupo?: number;
  nombre_grupo?: string;
  id_curso?: number;
  nombre_curso?: string;
}