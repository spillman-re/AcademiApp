import { useEffect, useState } from "react";

import type { Horario } from "../../types/horario";

interface HorarioFormProps {
  horario?: Horario;
  onSubmit: (data: {
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
  }) => Promise<void>;
}

function horaParaInput(hora: string | undefined) {
  const coincidencia = String(hora ?? "").match(/(\d{2}):(\d{2})/);
  return coincidencia ? `${coincidencia[1]}:${coincidencia[2]}` : "";
}

function separarHora(hora: string | undefined) {
  const horaNormalizada = horaParaInput(hora);
  const [hora24, minutos] = horaNormalizada.split(":");
  const horaNumero = Number(hora24);

  if (!horaNormalizada || Number.isNaN(horaNumero)) {
    return { hora: "", minutos: "", periodo: "AM" };
  }

  return {
    hora: String(horaNumero % 12 || 12),
    minutos,
    periodo: horaNumero >= 12 ? "PM" : "AM",
  };
}

function convertirA24Horas(hora: string, minutos: string, periodo: string) {
  const horaNumero = Number(hora);
  const minutosNumero = Number(minutos);
  if (
    !/^\d{1,2}$/.test(hora) ||
    !/^\d{1,2}$/.test(minutos) ||
    !Number.isInteger(horaNumero) ||
    horaNumero < 1 ||
    horaNumero > 12 ||
    !Number.isInteger(minutosNumero) ||
    minutosNumero < 0 ||
    minutosNumero > 59
  ) {
    return "";
  }

  let hora24 = horaNumero % 12;
  if (periodo === "PM") hora24 += 12;

  return `${String(hora24).padStart(2, "0")}:${String(minutosNumero).padStart(2, "0")}`;
}

function aceptarDigitos(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 2);
}

const dias = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
];

function HorarioForm({ horario, onSubmit }: HorarioFormProps) {
  const [diaSemana, setDiaSemana] = useState(horario?.dia_semana ?? "LUNES");
  const horaInicioInicial = separarHora(horario?.hora_inicio);
  const horaFinInicial = separarHora(horario?.hora_fin);
  const [horaInicio, setHoraInicio] = useState(horaInicioInicial.hora);
  const [minutosInicio, setMinutosInicio] = useState(horaInicioInicial.minutos);
  const [periodoInicio, setPeriodoInicio] = useState(horaInicioInicial.periodo);
  const [horaFin, setHoraFin] = useState(horaFinInicial.hora);
  const [minutosFin, setMinutosFin] = useState(horaFinInicial.minutos);
  const [periodoFin, setPeriodoFin] = useState(horaFinInicial.periodo);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setDiaSemana(horario?.dia_semana ?? "LUNES");
    const nuevaHoraInicio = separarHora(horario?.hora_inicio);
    const nuevaHoraFin = separarHora(horario?.hora_fin);
    setHoraInicio(nuevaHoraInicio.hora);
    setMinutosInicio(nuevaHoraInicio.minutos);
    setPeriodoInicio(nuevaHoraInicio.periodo);
    setHoraFin(nuevaHoraFin.hora);
    setMinutosFin(nuevaHoraFin.minutos);
    setPeriodoFin(nuevaHoraFin.periodo);
    setError("");
  }, [horario]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const horaInicio24 = convertirA24Horas(horaInicio, minutosInicio, periodoInicio);
    const horaFin24 = convertirA24Horas(horaFin, minutosFin, periodoFin);

    if (!horaInicio24 || !horaFin24 || horaInicio24 >= horaFin24) {
      setError("La asignacion es invalida.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      await onSubmit({
        dia_semana: diaSemana,
        hora_inicio: horaInicio24,
        hora_fin: horaFin24,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el horario");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Día
        <select
          value={diaSemana}
          onChange={(event) => setDiaSemana(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {dias.map((dia) => (
            <option key={dia} value={dia}>{dia}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-700">Desde</p>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={horaInicio}
              onChange={(event) => setHoraInicio(aceptarDigitos(event.target.value))}
              placeholder="8"
              aria-label="Hora de inicio"
              className="w-16 rounded-md border border-gray-300 px-3 py-2"
            />
            <span className="py-2 text-gray-500">:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={minutosInicio}
              onChange={(event) => setMinutosInicio(aceptarDigitos(event.target.value))}
              placeholder="00"
              aria-label="Minutos de inicio"
              className="w-20 rounded-md border border-gray-300 px-3 py-2"
            />
            <select value={periodoInicio} onChange={(event) => setPeriodoInicio(event.target.value)} aria-label="Periodo de inicio" className="rounded-md border border-gray-300 px-2 py-2">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Hasta</p>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={horaFin}
              onChange={(event) => setHoraFin(aceptarDigitos(event.target.value))}
              placeholder="10"
              aria-label="Hora de finalización"
              className="w-16 rounded-md border border-gray-300 px-3 py-2"
            />
            <span className="py-2 text-gray-500">:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={minutosFin}
              onChange={(event) => setMinutosFin(aceptarDigitos(event.target.value))}
              placeholder="00"
              aria-label="Minutos de finalización"
              className="w-20 rounded-md border border-gray-300 px-3 py-2"
            />
            <select value={periodoFin} onChange={(event) => setPeriodoFin(event.target.value)} aria-label="Periodo de finalización" className="rounded-md border border-gray-300 px-2 py-2">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : horario ? "Guardar cambios" : "Agregar horario"}
      </button>
    </form>
  );
}

export default HorarioForm;
