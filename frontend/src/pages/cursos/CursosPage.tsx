import { useEffect, useState } from "react";

import {
  obtenerCursos,
  eliminarCurso as eliminarCursoApi,
  crearCurso,
  actualizarCurso,
} from "../../services/cursoService";
import {
  crearGrupo,
  eliminarGrupo as eliminarGrupoApi,
  actualizarGrupo,
  obtenerGrupos,
} from "../../services/grupoService";
import { obtenerProfesores } from "../../services/profesorService";
import {
  crearAsignacionProfesor,
  obtenerAsignaciones,
} from "../../services/asignacionProfesorService";
import { obtenerHorariosPorGrupo } from "../../services/horarioService";

import type { Curso } from "../../types/curso";
import type { Grupo } from "../../types/grupo";
import type { Profesor } from "../../types/profesor";
import type { AsignacionProfesor } from "../../types/asignacionProfesor";
import type { Horario } from "../../types/horario";
import type { CursoFormData } from "../../schema/cursoSchema";
import {
  type CrearGrupoFormData,
  type ActualizarGrupoFormData,
  esCrearGrupoFormData,
} from "../../schema/grupoSchema";

import CursoTable from "../../components/cursos/CursoTable";
import CursoForm from "../../components/cursos/CursoForm";
import Modal from "../../components/ui/Modal";
import GrupoForm from "../../components/grupos/GrupoForm";
import AsignarProfesorForm from "../../components/cursos/AsignarProfesorForm";

function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionProfesor[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);

  const [cursoSeleccionado, setCursoSeleccionado] =
    useState<Curso | undefined>();
  const [cursoParaGrupo, setCursoParaGrupo] =
    useState<Curso | undefined>();
  const [grupoSeleccionado, setGrupoSeleccionado] =
    useState<Grupo | undefined>();
  const [cursoParaProfesor, setCursoParaProfesor] =
    useState<Curso | undefined>();

  useEffect(() => {
    cargarCursos();
  }, []);

  async function cargarCursos() {
    try {
      setLoading(true);
      setError("");

      const [cursosData, gruposData, profesoresData, asignacionesData] = await Promise.all([
        obtenerCursos(),
        obtenerGrupos(),
        obtenerProfesores(),
        obtenerAsignaciones(),
      ]);

      setCursos(cursosData);
      setGrupos(gruposData);
      setProfesores(profesoresData);
      setAsignaciones(asignacionesData);
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

  function abrirModalGrupo(curso: Curso) {
    setGrupoSeleccionado(undefined);
    setCursoParaGrupo(curso);
  }

  function abrirModalEditarGrupo(grupo: Grupo) {
    setGrupoSeleccionado(grupo);
    setCursoParaGrupo(cursos.find((curso) => curso.id_curso === grupo.id_curso));
  }

  function cerrarModalGrupo() {
    setCursoParaGrupo(undefined);
    setGrupoSeleccionado(undefined);
  }

  async function abrirModalAsignarProfesor(curso: Curso) {
    try {
      setError("");
      const horariosPorGrupo = await Promise.all(
        grupos.map((grupo) => obtenerHorariosPorGrupo(grupo.id_grupo))
      );

      setHorarios(horariosPorGrupo.flat());
      setCursoParaProfesor(curso);
    } catch {
      setError("No se pudieron cargar los profesores disponibles");
    }
  }

  function cerrarModalAsignarProfesor() {
    setCursoParaProfesor(undefined);
  }

  async function handleAsignarProfesor(idGrupo: number, idProfesor: number) {
    const nuevaAsignacion = await crearAsignacionProfesor({
      id_grupo: idGrupo,
      id_profesor: idProfesor,
    });

    setAsignaciones((asignacionesActuales) => [
      ...asignacionesActuales,
      nuevaAsignacion,
    ]);
    cerrarModalAsignarProfesor();
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

  async function handleAgregarGrupo(
    data: CrearGrupoFormData | ActualizarGrupoFormData
  ) {
    if (!cursoParaGrupo) {
      return;
    }

    try {
      setError("");

      if (grupoSeleccionado) {
        const grupoActualizado = await actualizarGrupo(
          grupoSeleccionado.id_grupo,
          {
            nombre_grupo: data.nombre_grupo,
          }
        );

        setGrupos((gruposActuales) =>
          gruposActuales.map((grupo) =>
            grupo.id_grupo === grupoActualizado.id_grupo
              ? grupoActualizado
              : grupo
          )
        );
      } else {
        if (!esCrearGrupoFormData(data)) {
          return;
        }

        const nuevoGrupo = await crearGrupo({
          id_curso: cursoParaGrupo.id_curso,
          nombre_grupo: data.nombre_grupo,
          fecha_inicio: data.fecha_inicio,
        });

        setGrupos((gruposActuales) => [
          ...gruposActuales,
          nuevoGrupo,
        ]);
      }

      cerrarModalGrupo();
    } catch {
      setError(
        grupoSeleccionado
          ? "No se pudo actualizar el grupo"
          : "No se pudo crear el grupo"
      );
    }
  }
  

  async function handleEliminarGrupo(id: number) {
    try {
      setError("");

      await eliminarGrupoApi(id);

      setGrupos((gruposActuales) =>
        gruposActuales.filter((grupo) => grupo.id_grupo !== id)
      );
    } catch {
      setError("No se pudo cancelar el grupo");
      throw new Error("No se pudo cancelar el grupo");
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
        grupos={grupos}
        profesores={profesores}
        asignaciones={asignaciones}
        onEditar={abrirModalEditar}
        onEliminar={handleEliminarCurso}
        onAsignarProfesor={abrirModalAsignarProfesor}
        onAgregarGrupo={abrirModalGrupo}
        onEditarGrupo={abrirModalEditarGrupo}
        onEliminarGrupo={handleEliminarGrupo}
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

      <Modal
        isOpen={Boolean(cursoParaGrupo)}
        onClose={cerrarModalGrupo}
        title={`${grupoSeleccionado ? "Editar grupo" : "Nuevo grupo"}${cursoParaGrupo ? `: ${cursoParaGrupo.nombre_curso}` : ""}`}
      >
        <GrupoForm
          grupo={grupoSeleccionado}
          onSubmit={handleAgregarGrupo}
        />
      </Modal>

      <Modal
        isOpen={Boolean(cursoParaProfesor)}
        onClose={cerrarModalAsignarProfesor}
        title={`Asignar profesor${cursoParaProfesor ? `: ${cursoParaProfesor.nombre_curso}` : ""}`}
      >
        <AsignarProfesorForm
          grupos={
            cursoParaProfesor
              ? grupos.filter((grupo) => grupo.id_curso === cursoParaProfesor.id_curso)
              : []
          }
          profesores={profesores}
          asignaciones={asignaciones}
          horarios={horarios}
          onSubmit={handleAsignarProfesor}
        />
      </Modal>
    </div>
  );
}

export default CursosPage;