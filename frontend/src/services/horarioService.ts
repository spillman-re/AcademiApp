import type { Horario } from "../types/horario";

const API_URL = "http://localhost:3000";

export async function obtenerHorariosPorGrupo(idGrupo: number): Promise<Horario[]> {
  const response = await fetch(`${API_URL}/grupos/${idGrupo}/horarios`);

  if (!response.ok) {
    throw new Error("No se pudieron obtener los horarios");
  }

  return response.json();
}