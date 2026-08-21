import type { AsignacionProfesor } from "../types/asignacionProfesor";

type CrearAsignacionProfesorData = {
  id_profesor: number;
  id_grupo: number;
};

const API_URL = "http://localhost:3000/asignaciones-profesor";

export async function obtenerAsignaciones(): Promise<AsignacionProfesor[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("No se pudieron obtener las asignaciones");
  }

  return response.json();
}

export async function crearAsignacionProfesor(
  asignacion: CrearAsignacionProfesorData
): Promise<AsignacionProfesor> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(asignacion),
  });

  if (!response.ok) {
    throw new Error("No se pudo asignar el profesor");
  }

  return response.json();
}