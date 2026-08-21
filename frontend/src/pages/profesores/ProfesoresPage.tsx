import { useEffect, useState } from "react";

import {
  crearProfesor,
  obtenerProfesores,
} from "../../services/profesorService";
import type { Profesor } from "../../types/profesor";
import type { ProfesorFormData } from "../../schema/profesorSchema";
import Modal from "../../components/ui/Modal";
import ProfesorForm from "../../components/profesores/ProfesorForm";

function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    async function cargarProfesores() {
      try {
        setError("");
        setProfesores(await obtenerProfesores());
      } catch {
        setError("No se pudieron cargar los profesores");
      } finally {
        setLoading(false);
      }
    }

    cargarProfesores();
  }, []);

  async function handleCrearProfesor(data: ProfesorFormData) {
    try {
      setError("");
      const nuevoProfesor = await crearProfesor(data);
      setProfesores((profesoresActuales) => [
        ...profesoresActuales,
        nuevoProfesor,
      ]);
      setModalAbierto(false);
    } catch {
      setError("No se pudo crear el profesor");
      throw new Error("No se pudo crear el profesor");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profesores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Consulta los profesores activos de la academia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nuevo profesor
        </button>
      </div>

      {loading && <p className="mt-6 text-gray-500">Cargando profesores...</p>}

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && profesores.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
          No hay profesores activos registrados.
        </p>
      )}

      {!loading && !error && profesores.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profesores.map((profesor) => (
            <article
              key={profesor.id_profesor}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {profesor.nombres} {profesor.apellidos}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {profesor.especialidad || "Sin especialidad registrada"}
                  </p>
                </div>

                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  {profesor.estado}
                </span>
              </div>

              <p className="mt-5 text-sm text-gray-600">
                {profesor.telefono || "Sin teléfono registrado"}
              </p>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Nuevo profesor"
      >
        <ProfesorForm onSubmit={handleCrearProfesor} />
      </Modal>
    </div>
  );
}

export default ProfesoresPage;