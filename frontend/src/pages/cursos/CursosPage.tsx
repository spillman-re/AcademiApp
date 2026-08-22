import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

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
  finalizarGrupo,
} from "../../services/grupoService";

import type { Curso } from "../../types/curso";
import type { Grupo } from "../../types/grupo";
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
import AdministrarGruposModal from "../../components/grupos/AdministrarGruposModal";

function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);

  const [cursoSeleccionado, setCursoSeleccionado] =
    useState<Curso | undefined>();
  const [cursoParaGrupo, setCursoParaGrupo] =
    useState<Curso | undefined>();
  const [cursoParaAdministrar, setCursoParaAdministrar] =
    useState<Curso | undefined>();
  const [grupoSeleccionado, setGrupoSeleccionado] =
    useState<Grupo | undefined>();

  useEffect(() => {
    cargarCursos();
  }, []);

  async function cargarCursos() {
    try {
      setLoading(true);
      setError("");

      const [cursosData, gruposData] = await Promise.all([
        obtenerCursos(),
        obtenerGrupos(),
      ]);

      setCursos(cursosData);
      setGrupos(gruposData);
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

  function abrirModalAdministrar(curso: Curso) {
    setCursoParaAdministrar(curso);
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

  async function handleFinalizarGrupo(id: number) {
    try {
      setError("");
      await finalizarGrupo(id);
      setGrupos((gruposActuales) =>
        gruposActuales.map((grupo) =>
          grupo.id_grupo === id ? { ...grupo, estado: "FINALIZADO" } : grupo
        )
      );
      await cargarCursos();
    } catch (finalizarError) {
      setError(finalizarError instanceof Error ? finalizarError.message : "No se pudo finalizar el grupo");
      throw finalizarError;
    }
  }

  const cursosFiltrados = cursos
    .filter((curso) => {
      const coincideNombre = curso.nombre_curso
        .toLowerCase()
        .includes(busqueda.trim().toLowerCase());
      const coincideEstado =
        estadoFiltro === "todos" || curso.estado.toLowerCase() === estadoFiltro;

      return coincideNombre && coincideEstado;
    })
    .sort((cursoA, cursoB) => {
      if (estadoFiltro !== "todos") return 0;

      const esActivoA = cursoA.estado.toUpperCase() === "ACTIVO";
      const esActivoB = cursoB.estado.toUpperCase() === "ACTIVO";

      return Number(esActivoB) - Number(esActivoA);
    });

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
          className="group flex items-center gap-2 rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-950/20 transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <Plus className="h-4 w-4 text-blue-200 transition group-hover:text-white" strokeWidth={2.5} />
          Nuevo curso
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Buscar cursos por nombre</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar curso por nombre..."
            className="w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="whitespace-nowrap font-medium">Estado</span>
          <select
            value={estadoFiltro}
            onChange={(event) => setEstadoFiltro(event.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="todos">Todos</option>
            <option value="activo">Activo</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </label>
      </div>

      {/* Cursos */}
      <CursoTable
        cursos={cursosFiltrados}
        grupos={grupos}
        onEditar={abrirModalEditar}
        onEliminar={handleEliminarCurso}
        onAdministrarGrupos={abrirModalAdministrar}
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
        zIndex={60}
        title={`${grupoSeleccionado ? "Editar grupo" : "Nuevo grupo"}${cursoParaGrupo ? `: ${cursoParaGrupo.nombre_curso}` : ""}`}
      >
        <GrupoForm
          grupo={grupoSeleccionado}
          onSubmit={handleAgregarGrupo}
        />
      </Modal>

      <Modal
        isOpen={Boolean(cursoParaAdministrar)}
        onClose={() => setCursoParaAdministrar(undefined)}
        title="Grupos del curso"
      >
        {cursoParaAdministrar && (
          <AdministrarGruposModal
            cursoNombre={cursoParaAdministrar.nombre_curso}
            grupos={grupos.filter((grupo) => grupo.id_curso === cursoParaAdministrar.id_curso)}
            onAgregarGrupo={() => abrirModalGrupo(cursoParaAdministrar)}
            onEditarGrupo={abrirModalEditarGrupo}
            onEliminarGrupo={handleEliminarGrupo}
            onFinalizarGrupo={handleFinalizarGrupo}
            onClose={() => setCursoParaAdministrar(undefined)}
          />
        )}
      </Modal>

    </div>
  );
}

export default CursosPage;