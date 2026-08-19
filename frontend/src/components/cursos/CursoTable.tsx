import type { Curso } from "../../types/curso";
import type { Grupo } from "../../types/grupo";
import { useState } from "react";


interface CursoTableProps {
  cursos: Curso[];
  grupos: Grupo[];
  onEditar: (curso: Curso) => void;
  onEliminar: (id: number) => void;
  onAgregarGrupo: (curso: Curso) => void;
  onEditarGrupo: (grupo: Grupo) => void;
  onEliminarGrupo: (id: number) => Promise<void>;
}

function CursoTable({
  cursos,
  grupos,
  onEditar,
  onEliminar,
  onAgregarGrupo,
  onEditarGrupo,
  onEliminarGrupo,
}: CursoTableProps) {
   const [cursoAEliminar, setCursoAEliminar] = useState<Curso | null>(null);
  const [grupoAEliminar, setGrupoAEliminar] = useState<Grupo | null>(null);

  function confirmarEliminacion() {
    if (cursoAEliminar) {
      onEliminar(cursoAEliminar.id_curso);
      setCursoAEliminar(null);
    }
  }

  async function confirmarEliminacionGrupo() {
    if (grupoAEliminar) {
      await onEliminarGrupo(grupoAEliminar.id_grupo);
      setGrupoAEliminar(null);
    }
  }

  return (
    <>
     <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {cursos.map((curso) => (
        <div
          key={curso.id_curso}
          className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
        >
          {/* Encabezado */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {curso.nombre_curso}
              </h2>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  curso.estado === "Activo"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {curso.estado}
              </span>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 px-6 py-5">
            <p className="min-h-[48px] text-sm leading-6 text-gray-500">
              {curso.descripcion}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  Duración
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {curso.duracion} meses
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  Precio
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-800">
                  C$ {curso.precio}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase text-gray-400">
                  Grupos activos
                </p>
                <button
                  type="button"
                  onClick={() => onAgregarGrupo(curso)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  + Agregar grupo
                </button>
              </div>

              {grupos.filter((grupo) => grupo.id_curso === curso.id_curso).length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {grupos
                    .filter((grupo) => grupo.id_curso === curso.id_curso)
                    .map((grupo) => (
                      <li
                        key={grupo.id_grupo}
                        className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-700">
                            {grupo.nombre_grupo}
                          </p>
                          <p className="text-xs text-gray-500">
                            Inicio: {grupo.fecha_inicio.slice(0, 10)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditarGrupo(grupo)}
                            aria-label={`Editar ${grupo.nombre_grupo}`}
                            title="Editar grupo"
                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setGrupoAEliminar(grupo)}
                            aria-label={`Cancelar ${grupo.nombre_grupo}`}
                            title="Cancelar grupo"
                            className="rounded-md p-2 text-red-600 transition hover:bg-red-100"
                          >
                            <span
                              aria-hidden="true"
                              className="block h-4 w-4 bg-red-600 [mask-image:url('/icons/trash3.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
                            />
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-400">
                  Aún no hay grupos.
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={() => onEditar(curso)}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => setCursoAEliminar(curso)}
              aria-label={`Eliminar ${curso.nombre_curso}`}
              title="Eliminar curso"
              className="rounded-md p-2 text-red-600 transition hover:bg-red-50"
            >
              <span
                aria-hidden="true"
                className="block h-5 w-5 bg-red-600 [mask-image:url('/icons/trash3.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
              />
            </button>


          </div>
        </div>
      ))}
    </div>

    {cursoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              Eliminar curso
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar{" "}
              <span className="font-medium">
                {cursoAEliminar.nombre_curso}
              </span>
              ? Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCursoAEliminar(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarEliminacion}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {grupoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              Cancelar grupo
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Estás seguro de que deseas cancelar{" "}
              <span className="font-medium">{grupoAEliminar.nombre_grupo}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setGrupoAEliminar(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminacionGrupo}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    
  );
}

export default CursoTable;