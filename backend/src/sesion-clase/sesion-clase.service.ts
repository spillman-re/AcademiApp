import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateSesionClaseDto } from './dto/create-sesion-clase.dto';
import { UpdateSesionClaseDto } from './dto/update-sesion-clase.dto';

// ============================================================
// TIPOS INTERNOS
// ============================================================

interface EvaluacionSesion {
  id_evaluacion: number;
  tipo_evaluacion: string;
}

interface ResultadoEvaluacion {
  id_inscripcion: number;
  nota: number | null;
  estado_resultado: 'CALIFICADO' | 'NO_SE_PRESENTO';
}

interface AsistenciaSesion {
  id_inscripcion: number;
  estado_asistencia:
    | 'PRESENTE'
    | 'AUSENTE'
    | 'JUSTIFICADO'
    | 'SUSPENDIDO_POR_MORA';
}

// ============================================================
// SERVICE
// ============================================================

@Injectable()
export class SesionClaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================================
  // OBTENER TODAS
  // ============================================================

  async getSesiones() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT
        s.*,
        g.nombre_grupo,
        h.dia_semana
      FROM sesion_clase s
      INNER JOIN grupo g
        ON s.id_grupo = g.id_grupo
      LEFT JOIN horario_clase h
        ON s.id_horario = h.id_horario
      ORDER BY
        s.fecha_programada,
        s.hora_inicio;
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UNA
  // ============================================================

  async getSesion(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
      SELECT
        s.*,
        g.nombre_grupo,
        h.dia_semana
      FROM sesion_clase s
      INNER JOIN grupo g
        ON s.id_grupo = g.id_grupo
      LEFT JOIN horario_clase h
        ON s.id_horario = h.id_horario
      WHERE s.id_sesion = @id;
    `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `La sesión con id ${id} no fue encontrada.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // CREAR UNA SESIÓN MANUALMENTE
  // ============================================================

  async createSesion(sesion: CreateSesionClaseDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Verificar grupo
    // ----------------------------------------------------------

    const grupo = await pool
      .request()
      .input('id_grupo', sesion.id_grupo)
      .query(`
        SELECT
          id_grupo,
          estado,
          fecha_inicio
        FROM grupo
        WHERE id_grupo = @id_grupo;
      `);

    if (grupo.recordset.length === 0) {
      throw new NotFoundException(
        `El grupo con id ${sesion.id_grupo} no fue encontrado.`,
      );
    }

    const grupoActual = grupo.recordset[0];

    if (grupoActual.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede crear una sesión para un grupo que no está activo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar fecha
    // ----------------------------------------------------------

    if (
      new Date(sesion.fecha_programada) <
      new Date(grupoActual.fecha_inicio)
    ) {
      throw new BadRequestException(
        'La fecha de la sesión no puede ser anterior a la fecha de inicio del grupo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar horario
    // ----------------------------------------------------------

    if (sesion.id_horario !== undefined) {
      const horario = await pool
        .request()
        .input('id_horario', sesion.id_horario)
        .input('id_grupo', sesion.id_grupo)
        .query(`
          SELECT
            id_horario,
            id_grupo,
            dia_semana,
            hora_inicio,
            hora_fin
          FROM horario_clase
          WHERE id_horario = @id_horario
            AND id_grupo = @id_grupo;
        `);

      if (horario.recordset.length === 0) {
        throw new BadRequestException(
          'El horario indicado no pertenece al grupo.',
        );
      }
    }

    // ----------------------------------------------------------
    // Verificar solapamiento
    // ----------------------------------------------------------

    const conflicto = await pool
      .request()
      .input('id_grupo', sesion.id_grupo)
      .input('fecha_programada', sesion.fecha_programada)
      .input('hora_inicio', sesion.hora_inicio)
      .input('hora_fin', sesion.hora_fin)
      .query(`
        SELECT id_sesion
        FROM sesion_clase
        WHERE id_grupo = @id_grupo
          AND fecha_programada = @fecha_programada
          AND hora_inicio < CAST(@hora_fin AS TIME)
          AND hora_fin > CAST(@hora_inicio AS TIME)
          AND estado_sesion <> 'CANCELADA';
      `);

    if (conflicto.recordset.length > 0) {
      throw new BadRequestException(
        'Ya existe una sesión que se solapa con este horario.',
      );
    }

    // ----------------------------------------------------------
    // Crear sesión
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id_grupo', sesion.id_grupo)
      .input('id_horario', sesion.id_horario ?? null)
      .input('fecha_programada', sesion.fecha_programada)
      .input('hora_inicio', sesion.hora_inicio)
      .input('hora_fin', sesion.hora_fin)
      .input('tema', sesion.tema ?? null)
      .input('observacion', sesion.observacion ?? null)
      .query(`
        INSERT INTO sesion_clase (
          id_grupo,
          id_horario,
          fecha_programada,
          hora_inicio,
          hora_fin,
          tema,
          observacion
        )
        OUTPUT INSERTED.*
        VALUES (
          @id_grupo,
          @id_horario,
          @fecha_programada,
          CAST(@hora_inicio AS TIME),
          CAST(@hora_fin AS TIME),
          @tema,
          @observacion
        );
      `);

    return result.recordset[0];
  }

  // ============================================================
  // GENERAR SESIONES A PARTIR DE LOS HORARIOS
  // ============================================================

  async generarSesiones(idGrupo: number, fechaHasta: string) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener grupo
    // ----------------------------------------------------------

    const grupo = await pool
      .request()
      .input('id_grupo', idGrupo)
      .query(`
        SELECT
          id_grupo,
          estado,
          fecha_inicio
        FROM grupo
        WHERE id_grupo = @id_grupo;
      `);

    if (grupo.recordset.length === 0) {
      throw new NotFoundException(
        `El grupo con id ${idGrupo} no fue encontrado.`,
      );
    }

    const grupoActual = grupo.recordset[0];

    if (grupoActual.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se pueden generar sesiones para un grupo que no está activo.',
      );
    }

    // ----------------------------------------------------------
    // Validar rango
    // ----------------------------------------------------------

    const fechaInicio = new Date(grupoActual.fecha_inicio);
    const fechaFin = new Date(fechaHasta);

    if (fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha hasta no puede ser anterior a la fecha de inicio del grupo.',
      );
    }

    // ----------------------------------------------------------
    // Obtener horarios actuales del grupo
    // ----------------------------------------------------------

    const horarios = await pool
      .request()
      .input('id_grupo', idGrupo)
      .query(`
        SELECT
          id_horario,
          dia_semana,
          hora_inicio,
          hora_fin
        FROM horario_clase
        WHERE id_grupo = @id_grupo
        ORDER BY
          CASE dia_semana
            WHEN 'LUNES' THEN 1
            WHEN 'MARTES' THEN 2
            WHEN 'MIERCOLES' THEN 3
            WHEN 'JUEVES' THEN 4
            WHEN 'VIERNES' THEN 5
            WHEN 'SABADO' THEN 6
            WHEN 'DOMINGO' THEN 7
          END,
          hora_inicio;
      `);

    if (horarios.recordset.length === 0) {
      throw new BadRequestException(
        'El grupo no tiene horarios configurados.',
      );
    }

    // ----------------------------------------------------------
    // Recorrer fechas
    // ----------------------------------------------------------

    const sesionesCreadas: object[] = [];
    const fechaActual = new Date(fechaInicio);

    while (fechaActual <= fechaFin) {
      const diaSemana = this.obtenerDiaSemana(fechaActual);

      const horariosDelDia = horarios.recordset.filter(
        (horario) => horario.dia_semana === diaSemana,
      );

      for (const horario of horariosDelDia) {
        const fechaSQL = this.formatearFecha(fechaActual);

        // ------------------------------------------------------
        // Evitar duplicados
        // ------------------------------------------------------

        const existente = await pool
          .request()
          .input('id_grupo', idGrupo)
          .input('id_horario', horario.id_horario)
          .input('fecha_programada', fechaSQL)
          .query(`
            SELECT id_sesion
            FROM sesion_clase
            WHERE id_grupo = @id_grupo
              AND id_horario = @id_horario
              AND fecha_programada = @fecha_programada;
          `);

        if (existente.recordset.length > 0) {
          continue;
        }

        // ------------------------------------------------------
        // Convertir correctamente las horas
        // ------------------------------------------------------

        const horaInicio = this.formatearHora(horario.hora_inicio);
        const horaFin = this.formatearHora(horario.hora_fin);

        // ------------------------------------------------------
        // Crear sesión
        // ------------------------------------------------------

        const result = await pool
          .request()
          .input('id_grupo', idGrupo)
          .input('id_horario', horario.id_horario)
          .input('fecha_programada', fechaSQL)
          .input('hora_inicio', horaInicio)
          .input('hora_fin', horaFin)
          .query(`
            INSERT INTO sesion_clase (
              id_grupo,
              id_horario,
              fecha_programada,
              hora_inicio,
              hora_fin
            )
            OUTPUT INSERTED.*
            VALUES (
              @id_grupo,
              @id_horario,
              @fecha_programada,
              CAST(@hora_inicio AS TIME),
              CAST(@hora_fin AS TIME)
            );
          `);

        sesionesCreadas.push(result.recordset[0]);
      }

      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return {
      mensaje: 'Sesiones generadas correctamente.',
      cantidad: sesionesCreadas.length,
      sesiones: sesionesCreadas,
    };
  }

  // ============================================================
  // ACTUALIZAR SESIÓN
  // ============================================================

  async updateSesion(id: number, sesion: UpdateSesionClaseDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener sesión actual
    // ----------------------------------------------------------

    const existente = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT *
        FROM sesion_clase
        WHERE id_sesion = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `La sesión con id ${id} no fue encontrada.`,
      );
    }

    const actual = existente.recordset[0];

    // ----------------------------------------------------------
    // Solo modificar sesiones programadas
    // ----------------------------------------------------------

    if (actual.estado_sesion !== 'PROGRAMADA') {
      throw new BadRequestException(
        'Solo se pueden modificar sesiones que están programadas.',
      );
    }

    // ----------------------------------------------------------
    // Mantener valores actuales
    // ----------------------------------------------------------

    const fechaProgramada =
      sesion.fecha_programada ?? actual.fecha_programada;

    const horaInicio =
      sesion.hora_inicio ??
      this.formatearHora(actual.hora_inicio);

    const horaFin =
      sesion.hora_fin ??
      this.formatearHora(actual.hora_fin);

    const idHorario =
      sesion.id_horario !== undefined
        ? sesion.id_horario
        : actual.id_horario;

    const tema =
      sesion.tema !== undefined
        ? sesion.tema
        : actual.tema;

    const observacion =
      sesion.observacion !== undefined
        ? sesion.observacion
        : actual.observacion;

    // ----------------------------------------------------------
    // Validar horario
    // ----------------------------------------------------------

    if (idHorario !== null) {
      const horario = await pool
        .request()
        .input('id_horario', idHorario)
        .input('id_grupo', actual.id_grupo)
        .query(`
          SELECT id_horario
          FROM horario_clase
          WHERE id_horario = @id_horario
            AND id_grupo = @id_grupo;
        `);

      if (horario.recordset.length === 0) {
        throw new BadRequestException(
          'El horario indicado no pertenece al grupo.',
        );
      }
    }

    // ----------------------------------------------------------
    // Verificar solapamiento
    // ----------------------------------------------------------

    const conflicto = await pool
      .request()
      .input('id', id)
      .input('id_grupo', actual.id_grupo)
      .input('fecha_programada', fechaProgramada)
      .input('hora_inicio', horaInicio)
      .input('hora_fin', horaFin)
      .query(`
        SELECT id_sesion
        FROM sesion_clase
        WHERE id_grupo = @id_grupo
          AND fecha_programada = @fecha_programada
          AND hora_inicio < CAST(@hora_fin AS TIME)
          AND hora_fin > CAST(@hora_inicio AS TIME)
          AND id_sesion <> @id
          AND estado_sesion <> 'CANCELADA';
      `);

    if (conflicto.recordset.length > 0) {
      throw new BadRequestException(
        'La sesión se solapa con otra sesión del mismo grupo.',
      );
    }

    // ----------------------------------------------------------
    // Actualizar
    // ----------------------------------------------------------

    await pool
      .request()
      .input('id', id)
      .input('id_horario', idHorario)
      .input('fecha_programada', fechaProgramada)
      .input('hora_inicio', horaInicio)
      .input('hora_fin', horaFin)
      .input('tema', tema)
      .input('observacion', observacion)
      .query(`
        UPDATE sesion_clase
        SET
          id_horario = @id_horario,
          fecha_programada = @fecha_programada,
          hora_inicio = CAST(@hora_inicio AS TIME),
          hora_fin = CAST(@hora_fin AS TIME),
          tema = @tema,
          observacion = @observacion
        WHERE id_sesion = @id;
      `);

    const actualizado = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT *
        FROM sesion_clase
        WHERE id_sesion = @id;
      `);

    return actualizado.recordset[0];
  }

  // ============================================================
  // CANCELAR SESIÓN
  // ============================================================

  async cancelarSesion(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id', id)
      .query(`
        UPDATE sesion_clase
        SET estado_sesion = 'CANCELADA'
        OUTPUT INSERTED.*
        WHERE id_sesion = @id
          AND estado_sesion = 'PROGRAMADA';
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `La sesión con id ${id} no fue encontrada o ya no está programada.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // MARCAR COMO REALIZADA
  // ============================================================

  async finalizarSesion(id: number) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener sesión
    // ----------------------------------------------------------

    const sesion = await pool
      .request()
      .input('id_sesion', id)
      .query(`
        SELECT
          id_sesion,
          id_grupo,
          estado_sesion,
          fecha_programada
        FROM sesion_clase
        WHERE id_sesion = @id_sesion;
      `);

    if (sesion.recordset.length === 0) {
      throw new NotFoundException(
        `La sesión con id ${id} no fue encontrada.`,
      );
    }

    const sesionActual = sesion.recordset[0];

    // ----------------------------------------------------------
    // Solo se puede finalizar una sesión programada
    // ----------------------------------------------------------

    if (sesionActual.estado_sesion !== 'PROGRAMADA') {
      throw new BadRequestException(
        'Solo se puede finalizar una sesión que está programada.',
      );
    }

    // ----------------------------------------------------------
    // 1. Todas las asistencias deben estar registradas
    // ----------------------------------------------------------

    await this.validarAsistenciasCompletas(
      id,
      sesionActual.id_grupo,
    );

    // ----------------------------------------------------------
    // 2. Si existen evaluaciones, deben estar completas
    // ----------------------------------------------------------

    await this.validarEvaluacionesCompletas(
      id,
      sesionActual.id_grupo,
    );

    // ----------------------------------------------------------
    // 3. Todo correcto → REALIZADA
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id_sesion', id)
      .query(`
        UPDATE sesion_clase
        SET estado_sesion = 'REALIZADA'
        OUTPUT INSERTED.*
        WHERE id_sesion = @id_sesion
          AND estado_sesion = 'PROGRAMADA';
      `);

    if (result.recordset.length === 0) {
      throw new BadRequestException(
        'La sesión no pudo ser finalizada.',
      );
    }

    return {
      mensaje: 'Sesión finalizada correctamente.',
      sesion: result.recordset[0],
    };
  }

  // ============================================================
  // VALIDAR ASISTENCIAS COMPLETAS
  // ============================================================

  private async validarAsistenciasCompletas(
    idSesion: number,
    idGrupo: number,
  ): Promise<void> {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Estudiantes con inscripción activa
    // ----------------------------------------------------------

    const inscripcionesResult = await pool
      .request()
      .input('id_grupo', idGrupo)
      .query<{ id_inscripcion: number }>(`
        SELECT
          i.id_inscripcion
        FROM inscripcion i
        WHERE i.id_grupo = @id_grupo
          AND i.estado_inscripcion = 'ACTIVA';
      `);

    const idsInscripciones =
      inscripcionesResult.recordset.map(
        (inscripcion) => inscripcion.id_inscripcion,
      );

    const idsInscripcionesSet = new Set(idsInscripciones);

    // ----------------------------------------------------------
    // Asistencias registradas
    // ----------------------------------------------------------

    const asistenciasResult = await pool
      .request()
      .input('id_sesion', idSesion)
      .query<AsistenciaSesion>(`
        SELECT
          id_inscripcion,
          estado_asistencia
        FROM asistencia
        WHERE id_sesion = @id_sesion;
      `);

    const asistencias = asistenciasResult.recordset;

    // ----------------------------------------------------------
    // Detectar asistencias inválidas
    // ----------------------------------------------------------

    for (const asistencia of asistencias) {
      if (!idsInscripcionesSet.has(asistencia.id_inscripcion)) {
        throw new BadRequestException(
          `La asistencia pertenece a la inscripción ${asistencia.id_inscripcion}, que no está activa en el grupo.`,
        );
      }
    }

    // ----------------------------------------------------------
    // Detectar faltantes
    // ----------------------------------------------------------

    const idsConAsistencia = new Set(
      asistencias.map(
        (asistencia) => asistencia.id_inscripcion,
      ),
    );

    const faltantes = idsInscripciones.filter(
      (idInscripcion) =>
        !idsConAsistencia.has(idInscripcion),
    );

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se puede finalizar la sesión. Faltan asistencias para las inscripciones: ${faltantes.join(', ')}.`,
      );
    }

    // ----------------------------------------------------------
    // Verificar estados válidos
    // ----------------------------------------------------------

    const estadosValidos = [
      'PRESENTE',
      'AUSENTE',
      'JUSTIFICADO',
      'SUSPENDIDO_POR_MORA',
    ];

    for (const asistencia of asistencias) {
      if (
        !estadosValidos.includes(
          asistencia.estado_asistencia,
        )
      ) {
        throw new BadRequestException(
          `La asistencia de la inscripción ${asistencia.id_inscripcion} tiene un estado inválido.`,
        );
      }
    }
  }

  // ============================================================
  // VALIDAR EVALUACIONES COMPLETAS
  // ============================================================

  private async validarEvaluacionesCompletas(
    idSesion: number,
    idGrupo: number,
  ): Promise<void> {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // 1. Obtener todas las evaluaciones de la sesión
    // ----------------------------------------------------------

    const evaluacionesResult = await pool
      .request()
      .input('id_sesion', idSesion)
      .query<EvaluacionSesion>(`
        SELECT
          id_evaluacion,
          tipo_evaluacion
        FROM evaluacion
        WHERE id_sesion = @id_sesion;
      `);

    const evaluaciones = evaluacionesResult.recordset;

    // Una sesión puede no tener evaluaciones.
    if (evaluaciones.length === 0) {
      return;
    }

    // ----------------------------------------------------------
    // 2. Obtener estudiantes con inscripción activa
    // ----------------------------------------------------------

    const inscripcionesResult = await pool
      .request()
      .input('id_grupo', idGrupo)
      .query<{ id_inscripcion: number }>(`
        SELECT
          i.id_inscripcion
        FROM inscripcion i
        WHERE i.id_grupo = @id_grupo
          AND i.estado_inscripcion = 'ACTIVA';
      `);

    const idsInscripciones =
      inscripcionesResult.recordset.map(
        (inscripcion) => inscripcion.id_inscripcion,
      );

    const idsInscripcionesSet = new Set(idsInscripciones);

    // ----------------------------------------------------------
    // 3. Obtener todas las asistencias de la sesión
    // ----------------------------------------------------------

    const asistenciasResult = await pool
      .request()
      .input('id_sesion', idSesion)
      .query<AsistenciaSesion>(`
        SELECT
          id_inscripcion,
          estado_asistencia
        FROM asistencia
        WHERE id_sesion = @id_sesion;
      `);

    const asistenciasPorInscripcion = new Map<
      number,
      AsistenciaSesion['estado_asistencia']
    >(
      asistenciasResult.recordset.map((asistencia) => [
        asistencia.id_inscripcion,
        asistencia.estado_asistencia,
      ]),
    );

    // ----------------------------------------------------------
    // 4. Validar cada evaluación
    // ----------------------------------------------------------

    for (const evaluacion of evaluaciones) {
      // --------------------------------------------------------
      // Obtener resultados de esta evaluación
      // --------------------------------------------------------

      const resultadosResult = await pool
        .request()
        .input(
          'id_evaluacion',
          evaluacion.id_evaluacion,
        )
        .query<ResultadoEvaluacion>(`
          SELECT
            id_inscripcion,
            nota,
            estado_resultado
          FROM resultado_evaluacion
          WHERE id_evaluacion = @id_evaluacion;
        `);

      const resultados = resultadosResult.recordset;

      // --------------------------------------------------------
      // Crear mapa:
      // id_inscripcion → resultado
      // --------------------------------------------------------

      const resultadosPorInscripcion = new Map<
        number,
        ResultadoEvaluacion
      >(
        resultados.map((resultado) => [
          resultado.id_inscripcion,
          resultado,
        ]),
      );

      // --------------------------------------------------------
      // Detectar resultados pertenecientes a inscripciones
      // que no están activas
      // --------------------------------------------------------

      for (const resultado of resultados) {
        if (
          !idsInscripcionesSet.has(
            resultado.id_inscripcion,
          )
        ) {
          throw new BadRequestException(
            `La evaluación ${evaluacion.id_evaluacion} contiene un resultado para la inscripción ${resultado.id_inscripcion}, que no está activa en el grupo.`,
          );
        }
      }

      // --------------------------------------------------------
      // Detectar estudiantes sin resultado
      // --------------------------------------------------------

      const faltantes = idsInscripciones.filter(
        (idInscripcion) =>
          !resultadosPorInscripcion.has(idInscripcion),
      );

      if (faltantes.length > 0) {
        throw new BadRequestException(
          `No se puede finalizar la sesión. La evaluación ${evaluacion.id_evaluacion} no tiene resultado para las inscripciones: ${faltantes.join(', ')}.`,
        );
      }

      // --------------------------------------------------------
      // Validar cada resultado
      // --------------------------------------------------------

      for (const idInscripcion of idsInscripciones) {
        const resultado =
          resultadosPorInscripcion.get(idInscripcion);

        if (!resultado) {
          continue;
        }

        // ------------------------------------------------------
        // Obtener asistencia
        // ------------------------------------------------------

        const estadoAsistencia =
          asistenciasPorInscripcion.get(
            idInscripcion,
          );

        if (!estadoAsistencia) {
          throw new BadRequestException(
            `No existe asistencia para la inscripción ${idInscripcion}.`,
          );
        }

        // ------------------------------------------------------
        // NO PRESENTE
        //
        // AUSENTE
        // JUSTIFICADO
        // SUSPENDIDO_POR_MORA
        //
        // → NO_SE_PRESENTO + nota NULL
        // ------------------------------------------------------

        if (estadoAsistencia !== 'PRESENTE') {
          if (
            resultado.estado_resultado !==
              'NO_SE_PRESENTO' ||
            resultado.nota !== null
          ) {
            throw new BadRequestException(
              `La inscripción ${idInscripcion} no estuvo presente y debe tener resultado NO_SE_PRESENTO con nota NULL en la evaluación ${evaluacion.id_evaluacion}.`,
            );
          }
        }

        // ------------------------------------------------------
        // PRESENTE
        //
        // → CALIFICADO + nota entre 0 y 100
        // ------------------------------------------------------

        if (estadoAsistencia === 'PRESENTE') {
          // ----------------------------------------------------
          // Debe estar calificado
          // ----------------------------------------------------

          if (
            resultado.estado_resultado !==
            'CALIFICADO'
          ) {
            throw new BadRequestException(
              `La inscripción ${idInscripcion} estuvo presente y debe tener un resultado CALIFICADO en la evaluación ${evaluacion.id_evaluacion}.`,
            );
          }

          // ----------------------------------------------------
          // Debe tener nota
          // ----------------------------------------------------

          if (
            resultado.nota === null ||
            resultado.nota === undefined
          ) {
            throw new BadRequestException(
              `La inscripción ${idInscripcion} estuvo presente pero no tiene nota en la evaluación ${evaluacion.id_evaluacion}.`,
            );
          }

          // ----------------------------------------------------
          // Nota válida
          // ----------------------------------------------------

          if (
            resultado.nota < 0 ||
            resultado.nota > 100
          ) {
            throw new BadRequestException(
              `La nota de la inscripción ${idInscripcion} debe estar entre 0 y 100.`,
            );
          }
        }
      }
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private obtenerDiaSemana(fecha: Date): string {
    const dias = [
      'DOMINGO',
      'LUNES',
      'MARTES',
      'MIERCOLES',
      'JUEVES',
      'VIERNES',
      'SABADO',
    ];

    return dias[fecha.getDay()];
  }

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(
      fecha.getMonth() + 1,
    ).padStart(2, '0');
    const day = String(
      fecha.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatearHora(hora: any): string {
    // SQL Server TIME puede llegar como Date
    // debido al driver mssql/tedious.

    if (hora instanceof Date) {
      const hours = String(
        hora.getUTCHours(),
      ).padStart(2, '0');

      const minutes = String(
        hora.getUTCMinutes(),
      ).padStart(2, '0');

      return `${hours}:${minutes}`;
    }

    if (typeof hora === 'string') {
      return hora.substring(0, 5);
    }

    return hora;
  }
}