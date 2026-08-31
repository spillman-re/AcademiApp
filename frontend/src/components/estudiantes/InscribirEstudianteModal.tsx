import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, BookOpen, Layers, FileText, AlertCircle } from "lucide-react";
import { inscripcionSchema, type InscripcionFormData } from "../../schema/inscripcionSchema";
import type { Estudiante } from "../../types/estudiante";
import type { Curso } from "../../types/curso";
import type { Grupo } from "../../types/grupo";
import type { Inscripcion } from "../../types/inscripcion";

interface InscribirEstudianteModalProps {
  estudiante: Estudiante;
  cursos: Curso[];
  grupos: Grupo[];
  inscripciones: Inscripcion[];
  onSubmit: (data: { id_estudiante: number; id_grupo: number; observacion?: string }) => Promise<void>;
  onClose: () => void;
}

function InscribirEstudianteModal({
  estudiante,
  cursos,
  grupos,
  inscripciones,
  onSubmit,
  onClose,
}: InscribirEstudianteModalProps) {
  const [cursoSeleccionadoId, setCursoSeleccionadoId] = useState<number | "">("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InscripcionFormData>({
    resolver: zodResolver(inscripcionSchema) as any,
    defaultValues: {
      id_estudiante: estudiante.id_estudiante,
      id_curso: 0,
      id_grupo: 0,
      observacion: "",
    },
  });

  const hoyStr = useMemo(() => new Date().toISOString().substring(0, 10), []);

  const gruposInscritosIds = useMemo(
    () =>
      new Set(
        inscripciones
          .filter((i) => i.id_estudiante === estudiante.id_estudiante && i.estado_inscripcion === "ACTIVA")
          .map((i) => i.id_grupo)
      ),
    [inscripciones, estudiante.id_estudiante]
  );

  // Grupos disponibles: activos, del curso seleccionado, donde el estudiante no esté inscrito, y hoy <= fecha_inicio
  const gruposDisponibles = useMemo(() => {
    if (!cursoSeleccionadoId) return [];
    return grupos.filter((g) => {
      const fechaInicioStr = typeof g.fecha_inicio === "string" ? g.fecha_inicio.substring(0, 10) : "";
      return (
        g.id_curso === Number(cursoSeleccionadoId) &&
        g.estado.toUpperCase() === "ACTIVO" &&
        !gruposInscritosIds.has(g.id_grupo) &&
        hoyStr <= fechaInicioStr
      );
    });
  }, [grupos, cursoSeleccionadoId, gruposInscritosIds, hoyStr]);

  function handleCursoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value ? Number(e.target.value) : "";
    setCursoSeleccionadoId(val);
    setValue("id_curso", val ? Number(val) : 0);
    setValue("id_grupo", 0);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3.5">
        <p className="text-xs text-blue-800 font-medium">Estudiante a matricular:</p>
        <p className="text-sm font-bold text-blue-950 mt-0.5">
          {estudiante.nombres} {estudiante.apellidos}{" "}
          <span className="text-xs font-normal text-blue-700">({estudiante.codigo_estudiante})</span>
        </p>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
          <BookOpen className="h-3.5 w-3.5 text-blue-800" /> 1. Selecciona el Curso
        </label>
        <select
          value={cursoSeleccionadoId}
          onChange={handleCursoChange}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Seleccione un curso...</option>
          {cursos
            .filter((c) => c.estado.toUpperCase() === "ACTIVO")
            .map((c) => (
              <option key={c.id_curso} value={c.id_curso}>
                {c.nombre_curso} — C$ {c.precio} (Matrícula: C$ {c.precio_matricula})
              </option>
            ))}
        </select>
        {errors.id_curso && (
          <p className="mt-1 text-xs text-red-600 font-medium">{errors.id_curso.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
          <Layers className="h-3.5 w-3.5 text-blue-800" /> 2. Selecciona el Grupo Disponible
        </label>
        <select
          {...register("id_grupo", { valueAsNumber: true })}
          disabled={!cursoSeleccionadoId}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value={0}>
            {!cursoSeleccionadoId
              ? "Primero seleccione un curso"
              : gruposDisponibles.length === 0
              ? "No hay grupos disponibles por iniciar para este curso"
              : "Seleccione un grupo..."}
          </option>
          {gruposDisponibles.map((g) => (
            <option key={g.id_grupo} value={g.id_grupo}>
              {g.nombre_grupo} — Inicia: {String(g.fecha_inicio).substring(0, 10)} ({g.duracion_meses} meses)
            </option>
          ))}
        </select>
        {errors.id_grupo && (
          <p className="mt-1 text-xs text-red-600 font-medium">{errors.id_grupo.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
          <FileText className="h-3.5 w-3.5 text-blue-800" /> Observación (Opcional)
        </label>
        <textarea
          {...register("observacion")}
          rows={2}
          placeholder="Notas o acuerdos de matrícula..."
          className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-blue-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {isSubmitting ? "Inscribiendo..." : "Confirmar Inscripción"}
        </button>
      </div>
    </form>
  );
}

export default InscribirEstudianteModal;