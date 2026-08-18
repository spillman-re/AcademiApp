import { useEffect, useState } from "react";

import {
  obtenerCursos,
  eliminarCurso as eliminarCursoApi,
  crearCurso,
  actualizarCurso,
} from "../../services/cursoService";

import type { Curso } from "../../types/curso";
import type { CursoFormData } from "../../schema/cursoSchema";

import CursoTable from "../../components/cursos/CursoTable";
import CursoForm from "../../components/cursos/CursoForm";
import Modal from "../../components/ui/Modal";

function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);

  const [cursoSeleccionado, setCursoSeleccionado] =
    useState<Curso | undefined>();

  useEffect(() => {
    cargarCursos();
  }, []);

  async function cargarCursos() {
    try {
      setLoading(true);
      setError("");

      const data = await obtenerCursos();

      setCursos(data);
    } catch {
      setError("No se pudieron cargar los cursos");
    } finally {
      setLoading(false);
    }
  }

  function abrirModalCrear() {
    setCursoSeleccionado(undefined);
    setModalAbierto(true);
  }

  function abrirModalEditar(curso: Curso) {
    setCursoSeleccionado(curso);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setCursoSeleccionado(undefined);
  }

  async function handleGuardarCurso(data: CursoFormData) {
    try {
      setError("");

      // EDITAR
      if (cursoSeleccionado) {
        const cursoActualizado = await actualizarCurso(
          cursoSeleccionado.id_curso,
          data
        );

        setCursos((cursosActuales) =>
          cursosActuales.map((curso) =>
            curso.id_curso === cursoActualizado.id_curso
              ? cursoActualizado
              : curso
          )
        );

        cerrarModal();

        return;
      }

      // CREAR
      const nuevoCurso = await crearCurso(data);

      setCursos((cursosActuales) => [
        ...cursosActuales,
        nuevoCurso,
      ]);

      cerrarModal();
    } catch {
      setError(
        cursoSeleccionado
          ? "No se pudo actualizar el curso"
          : "No se pudo crear el curso"
      );
    }
  }

  async function handleEliminarCurso(id: number) {
    try {
      setError("");

      await eliminarCursoApi(id);

      setCursos((cursosActuales) =>
        cursosActuales.filter(
          (curso) => curso.id_curso !== id
        )
      );
    } catch {
      setError("No se pudo eliminar el curso");
    }
  }

  if (loading) {
    return <p>Cargando cursos...</p>;
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Cursos
        </h1>

        <button
          type="button"
          onClick={abrirModalCrear}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nuevo curso
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Tabla */}
      <CursoTable
        cursos={cursos}
        onEditar={abrirModalEditar}
        onEliminar={handleEliminarCurso}
      />

      {/* Modal */}
      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={
          cursoSeleccionado
            ? "Editar curso"
            : "Nuevo curso"
        }
      >
        <CursoForm
          curso={cursoSeleccionado}
          onSubmit={handleGuardarCurso}
        />
      </Modal>
    </div>
  );
}

export default CursosPage;