export interface Profesor {
  id_profesor: number;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  especialidad?: string | null;
  estado: string;
}