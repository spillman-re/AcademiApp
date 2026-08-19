import type { Grupo } from "../types/grupo";

type ActualizarGrupoData = {
  nombre_grupo: string;
};

const API_URL = "http://localhost:3000/grupos";

export async function obtenerGrupos(): Promise<Grupo[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("No se pudieron obtener los grupos");
  }

  return response.json();
}

export async function crearGrupo(
  grupo: Omit<Grupo, "id_grupo" | "estado">
): Promise<Grupo> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(grupo),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear el grupo");
  }

  return response.json();
}

export async function eliminarGrupo(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("No se pudo cancelar el grupo");
  }
}

export async function actualizarGrupo(
  id: number,
  grupo: ActualizarGrupoData
): Promise<Grupo> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(grupo),
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el grupo");
  }

  return response.json();
}
