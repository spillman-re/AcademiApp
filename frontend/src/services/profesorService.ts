import type { Profesor } from "../types/profesor";

const API_URL = "http://localhost:3000/profesores";

export async function obtenerProfesores(): Promise<Profesor[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("No se pudieron obtener los profesores");
  }

  return response.json();
}

export type CrearProfesorData = {
  nombres: string;
  apellidos: string;
  telefono?: string;
  especialidad?: string;
};

export async function crearProfesor(
  profesor: CrearProfesorData
): Promise<Profesor> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profesor),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear el profesor");
  }

  return response.json();
}