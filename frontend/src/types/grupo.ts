export interface Grupo {
  id_grupo: number;
  id_curso: number;
  nombre_grupo: string;
  fecha_inicio: string;
  duracion_meses?: number;
  fecha_fin?: string;
  estado: string;
}
