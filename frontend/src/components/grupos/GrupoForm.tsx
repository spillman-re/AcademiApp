import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Plus, Save, Users } from "lucide-react";
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
      className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm"
    >
      <div className="bg-blue-950 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-blue-200" />
          <div>
            <p className="text-base font-semibold">Información del grupo</p>
            <p className="mt-1 text-sm text-blue-200">
              Organiza una nueva sección para este curso.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Users className="h-4 w-4 text-blue-700" />
            Nombre del grupo
          </label>

          <input
            {...register("nombre_grupo")}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            placeholder="Ej. Grupo A"
          />

          {errors.nombre_grupo && (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {errors.nombre_grupo.message}
            </p>
          )}
        </div>

        {!grupo && (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <CalendarDays className="h-4 w-4 text-blue-700" />
              Fecha de inicio
            </label>

            <input
              type="date"
              {...register("fecha_inicio")}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />

            {"fecha_inicio" in errors && errors.fecha_inicio && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {errors.fecha_inicio.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            "Guardando..."
          ) : (
            <>
              {grupo ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {grupo ? "Guardar cambios" : "Crear grupo"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default GrupoForm;