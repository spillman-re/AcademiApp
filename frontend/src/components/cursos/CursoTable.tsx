import type { Curso } from "../../types/curso";

interface CursoTableProps {
  cursos: Curso[];
  onEditar: (curso: Curso) => void;
  onEliminar: (id: number) => void;
}

function CursoTable({
  cursos,
  onEditar,
  onEliminar,
}: CursoTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-left">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-sm font-semibold">
              Nombre
            </th>

            <th className="px-6 py-3 text-sm font-semibold">
              Descripción
            </th>

            <th className="px-6 py-3 text-sm font-semibold">
              Duración
            </th>

            <th className="px-6 py-3 text-sm font-semibold">
              Precio
            </th>

            <th className="px-6 py-3 text-sm font-semibold">
              Estado
            </th>

            <th className="px-6 py-3 text-sm font-semibold">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {cursos.map((curso) => (
            <tr
              key={curso.id_curso}
              className="hover:bg-gray-50"
            >
              <td className="px-6 py-4">
                {curso.nombre_curso}
              </td>

              <td className="px-6 py-4">
                {curso.descripcion}
              </td>

              <td className="px-6 py-4">
                {curso.duracion} meses
              </td>

              <td className="px-6 py-4">
                C$ {curso.precio}
              </td>

              <td className="px-6 py-4">
                {curso.estado}
              </td>

              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEditar(curso)}
                    className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const confirmar = window.confirm(
                        "¿Estás seguro de que deseas eliminar este curso?"
                      );

                      if (confirmar) {
                        onEliminar(curso.id_curso);
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CursoTable;