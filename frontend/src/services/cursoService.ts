import type { Curso } from "../types/curso";
import type { CursoFormData } from "../schema/cursoSchema";

const API_URL = "http://localhost:3000/cursos";

function normalizarCurso(curso: Partial<Curso> & { duracion?: string | number; precio?: number }): Curso {
  return {
    id_curso: curso.id_curso ?? 0,
    nombre_curso: curso.nombre_curso ?? "",
    descripcion: curso.descripcion ?? "",
    matricula: Number(curso.matricula ?? curso.precio ?? 0),
    mensualidad: Number(curso.mensualidad ?? curso.precio ?? 0),
    estado: curso.estado ?? "ACTIVO",
  };
}

function mapearPayload(curso: CursoFormData) {
  return {
    nombre_curso: curso.nombre_curso,
    descripcion: curso.descripcion ?? "",
    matricula: Number(curso.matricula),
    mensualidad: Number(curso.mensualidad),
    precio: Number(curso.matricula),
    duracion: String(curso.mensualidad),
  };
}

export async function obtenerCursos(): Promise<Curso[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("No se pudieron obtener los cursos");
  }

  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizarCurso) : [];
}

export async function crearCurso(
  curso: CursoFormData
): Promise<Curso> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mapearPayload(curso)),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear el curso");
  }

  const data = await response.json();
  return normalizarCurso(data);
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
    body: JSON.stringify(mapearPayload(curso)),
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el curso");
  }

  const data = await response.json();
  return normalizarCurso(data);
}

export async function eliminarCurso(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("No se pudo eliminar el curso");
  }
}