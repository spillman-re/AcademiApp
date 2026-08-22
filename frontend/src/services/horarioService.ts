import type { Horario } from "../types/horario";

const API_URL = "http://localhost:3000";

export async function obtenerHorariosPorGrupo(idGrupo: number): Promise<Horario[]> {
  const response = await fetch(`${API_URL}/grupos/${idGrupo}/horarios`);

  if (!response.ok) {
    throw new Error("No se pudieron obtener los horarios");
  }

  return response.json();
}

type HorarioData = Omit<Horario, "id_horario" | "id_grupo">;

export async function crearHorario(idGrupo: number, horario: HorarioData): Promise<Horario> {
  const response = await fetch(`${API_URL}/grupos/${idGrupo}/horarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(horario),
  });

  if (!response.ok) throw new Error("No se pudo crear el horario");
  return response.json();
}

export async function actualizarHorario(id: number, horario: Partial<HorarioData>): Promise<Horario> {
  const response = await fetch(`${API_URL}/horarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(horario),
  });

  if (!response.ok) throw new Error("No se pudo actualizar el horario");
  return response.json();
}

export async function eliminarHorario(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/horarios/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("No se pudo eliminar el horario");
}