import type { Curso } from "../types/curso";
import type { CursoFormData } from "../schema/cursoSchema";

const API_URL = "http://localhost:3000/cursos";

export async function obtenerCursos(): Promise<Curso[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("No se pudieron obtener los cursos");
  }

  return response.json();
}

export async function crearCurso(
  curso: CursoFormData
): Promise<Curso> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(curso),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear el curso");
  }

  return response.json();
}

export async function actualizarCurso(
  id: number,
  curso: CursoFormData
): Promise<Curso> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(curso),
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el curso");
  }

  return response.json();
}

export async function eliminarCurso(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("No se pudo eliminar el curso");
  }
}