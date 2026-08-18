import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  cursoSchema,
  type CursoFormData,
} from "../../schema/cursoSchema";

import type { Curso } from "../../types/curso";

interface CursoFormProps {
  curso?: Curso;
  onSubmit: (data: CursoFormData) => Promise<void>;
}

function CursoForm({ curso, onSubmit }: CursoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CursoFormData>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nombre_curso: "",
      descripcion: "",
      duracion: "",
      precio: 0,
    },
  });

  useEffect(() => {
    reset({
      nombre_curso: curso?.nombre_curso ?? "",
      descripcion: curso?.descripcion ?? "",
      duracion: curso?.duracion?.toString() ?? "",
      precio: curso?.precio ?? 0,
    });
  }, [curso, reset]);

  async function handleFormSubmit(data: CursoFormData) {
    await onSubmit(data);

    if (!curso) {
      reset();
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-4 rounded-lg border bg-white p-6"
    >
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium">
          Nombre del curso
        </label>

        <input
          {...register("nombre_curso")}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />

        {errors.nombre_curso && (
          <p className="mt-1 text-sm text-red-600">
            {errors.nombre_curso.message}
          </p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium">
          Descripción
        </label>

        <textarea
          {...register("descripcion")}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />

        {errors.descripcion && (
          <p className="mt-1 text-sm text-red-600">
            {errors.descripcion.message}
          </p>
        )}
      </div>

      {/* Duración */}
      <div>
        <label className="block text-sm font-medium">
          Duración
        </label>

        <input
          {...register("duracion")}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="Ej. 3 meses"
        />

        {errors.duracion && (
          <p className="mt-1 text-sm text-red-600">
            {errors.duracion.message}
          </p>
        )}
      </div>

      {/* Precio */}
      <div>
        <label className="block text-sm font-medium">
          Precio
        </label>

        <input
          type="number"
          step="0.01"
          min="0"
          {...register("precio", {
            valueAsNumber: true,
          })}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />

        {errors.precio && (
          <p className="mt-1 text-sm text-red-600">
            {errors.precio.message}
          </p>
        )}
      </div>

      {/* Botón */}
      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        {curso ? "Guardar cambios" : "Crear curso"}
      </button>
    </form>
  );
}

export default CursoForm;