import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import {
  crearGrupoSchema,
  actualizarGrupoSchema,
  type CrearGrupoFormData,
  type ActualizarGrupoFormData,
} from "../../schema/grupoSchema";

import type { Grupo } from "../../types/grupo";

interface GrupoFormProps {
  grupo?: Grupo;
  onSubmit: (
    data: CrearGrupoFormData | ActualizarGrupoFormData
  ) => Promise<void>;
}

function GrupoForm({ grupo, onSubmit }: GrupoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CrearGrupoFormData | ActualizarGrupoFormData>({
    resolver: zodResolver(
      grupo ? actualizarGrupoSchema : crearGrupoSchema
    ),
    defaultValues: {
      nombre_grupo: "",
      ...(grupo ? {} : { fecha_inicio: "" }),
    },
  });

  useEffect(() => {
    reset({
      nombre_grupo: grupo?.nombre_grupo ?? "",
      ...(grupo ? {} : { fecha_inicio: "" }),
    });
  }, [grupo, reset]);

  async function handleFormSubmit(
    data: CrearGrupoFormData | ActualizarGrupoFormData
  ) {
    await onSubmit(data);
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nombre del grupo
        </label>

        <input
          {...register("nombre_grupo")}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="Ej. Grupo A"
        />

        {errors.nombre_grupo && (
          <p className="mt-1 text-sm text-red-600">
            {errors.nombre_grupo.message}
          </p>
        )}
      </div>

      {!grupo && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fecha de inicio
          </label>

          <input
            type="date"
            {...register("fecha_inicio")}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />

          {"fecha_inicio" in errors && errors.fecha_inicio && (
            <p className="mt-1 text-sm text-red-600">
              {errors.fecha_inicio.message}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Guardando..."
          : grupo
            ? "Guardar cambios"
            : "Crear grupo"}
      </button>
    </form>
  );
}

export default GrupoForm;