import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  profesorSchema,
  type ProfesorFormData,
} from "../../schema/profesorSchema";

interface ProfesorFormProps {
  onSubmit: (data: ProfesorFormData) => Promise<void>;
}

function ProfesorForm({ onSubmit }: ProfesorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfesorFormData>({
    resolver: zodResolver(profesorSchema),
    defaultValues: {
      nombres: "",
      apellidos: "",
      telefono: "",
      especialidad: "",
    },
  });

  async function handleFormSubmit(data: ProfesorFormData) {
    await onSubmit(data);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="nombres" className="block text-sm font-medium text-gray-700">
          Nombres
        </label>
        <input
          id="nombres"
          {...register("nombres")}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
        {errors.nombres && <p className="mt-1 text-sm text-red-600">{errors.nombres.message}</p>}
      </div>

      <div>
        <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700">
          Apellidos
        </label>
        <input
          id="apellidos"
          {...register("apellidos")}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
        {errors.apellidos && <p className="mt-1 text-sm text-red-600">{errors.apellidos.message}</p>}
      </div>

      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
          Teléfono
        </label>
        <input
          id="telefono"
          {...register("telefono")}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
        {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>}
      </div>

      <div>
        <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700">
          Especialidad
        </label>
        <input
          id="especialidad"
          {...register("especialidad")}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
        {errors.especialidad && <p className="mt-1 text-sm text-red-600">{errors.especialidad.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Guardando..." : "Crear profesor"}
      </button>
    </form>
  );
}

export default ProfesorForm;