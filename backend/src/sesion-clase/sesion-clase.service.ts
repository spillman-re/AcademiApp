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

interface GrupoSesion {
  id_grupo: number;
  estado: 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';
  fecha_inicio: string | Date;
  fecha_fin: string | Date;
}

interface HorarioGrupo {
  id_horario: number;
  dia_semana: string;
  hora_inicio: string | Date;
  hora_fin: string | Date;
}

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
    'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' | 'SUSPENDIDO_POR_MORA';
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
      throw new NotFoundException(`La sesión con id ${id} no fue encontrada.`);
    }

    return result.recordset[0];
  }

  async getSesionesPorGrupo(idGrupo: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id_grupo', idGrupo).query(`
      SELECT
        s.id_sesion,
        s.id_grupo,
        s.id_horario,
        s.fecha_programada,
        s.hora_inicio,
        s.hora_fin,
        s.estado_sesion,
        s.tema,
        s.observacion,

        g.nombre_grupo,

        c.id_curso,
        c.nombre_curso

      FROM sesion_clase s

      INNER JOIN grupo g
        ON s.id_grupo = g.id_grupo

      INNER JOIN curso c
        ON g.id_curso = c.id_curso

      WHERE s.id_grupo = @id_grupo

      ORDER BY
        s.fecha_programada,
        s.hora_inicio;
    `);

    return result.recordset;
  }

  // ============================================================
  // CREAR SESIÓN MANUAL / EXTRACURRICULAR
  // ============================================================

  async createSesion(sesion: CreateSesionClaseDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Verificar grupo
    // ----------------------------------------------------------

    const grupo = await pool.request().input('id_grupo', sesion.id_grupo)
      .query<GrupoSesion>(`
        SELECT
          id_grupo,
          estado,
          fecha_inicio,
          fecha_fin
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
    // Verificar fecha dentro del período del grupo
    // ----------------------------------------------------------

    const fechaSesion = this.crearFechaUTC(sesion.fecha_programada);

    const fechaInicio = this.crearFechaUTC(
      this.formatearFechaDesdeValor(grupoActual.fecha_inicio),
    );

    const fechaFin = this.crearFechaUTC(
      this.formatearFechaDesdeValor(grupoActual.fecha_fin),
    );

    if (fechaSesion < fechaInicio) {
      throw new BadRequestException(
        'La fecha de la sesión no puede ser anterior a la fecha de inicio del grupo.',
      );
    }

    if (fechaSesion > fechaFin) {
      throw new BadRequestException(
        'La fecha de la sesión no puede ser posterior a la fecha de finalización del grupo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar horario
    // ----------------------------------------------------------

    if (sesion.id_horario !== undefined) {
      const horario = await pool
        .request()
        .input('id_horario', sesion.id_horario)
        .input('id_grupo', sesion.id_grupo).query(`
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
      .input('hora_fin', sesion.hora_fin).query(`
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
      .input('observacion', sesion.observacion ?? null).query(`
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
  // GENERAR SESIONES AUTOMÁTICAMENTE
  //
  // Usa:
  // grupo.fecha_inicio
  // grupo.fecha_fin
  // horario_clase
  //
  // fecha_fin ES INCLUSIVA.
  // ============================================================

  async generarSesiones(idGrupo: number) {
    const pool = this.databaseService.getPool();

    // ============================================================
    // OBTENER GRUPO
    // ============================================================

    const grupoResult = await pool.request().input('id_grupo', idGrupo)
      .query<GrupoSesion>(`
      SELECT
        id_grupo,
        estado,
        fecha_inicio,
        fecha_fin
      FROM grupo
      WHERE id_grupo = @id_grupo;
    `);

    if (grupoResult.recordset.length === 0) {
      throw new NotFoundException(
        `El grupo con id ${idGrupo} no fue encontrado.`,
      );
    }

    const grupo = grupoResult.recordset[0];

    // ============================================================
    // VALIDAR ESTADO
    // ============================================================

    if (grupo.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se pueden generar sesiones para un grupo que no está activo.',
      );
    }

    // ============================================================
    // VALIDAR FECHAS
    // ============================================================

    const fechaInicio = this.crearFechaUTC(
      this.formatearFechaDesdeValor(grupo.fecha_inicio),
    );

    const fechaFin = this.crearFechaUTC(
      this.formatearFechaDesdeValor(grupo.fecha_fin),
    );

    if (fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'El grupo tiene un rango de fechas inválido.',
      );
    }

    // ============================================================
    // VERIFICAR SESIONES REALIZADAS
    // ============================================================

    const sesionesRealizadas = await pool.request().input('id_grupo', idGrupo)
      .query(`
      SELECT TOP 1 id_sesion
      FROM sesion_clase
      WHERE id_grupo = @id_grupo
        AND estado_sesion = 'REALIZADA';
    `);

    if (sesionesRealizadas.recordset.length > 0) {
      throw new BadRequestException(
        'No se puede regenerar el calendario porque el grupo ya tiene sesiones realizadas.',
      );
    }

    // ============================================================
    // OBTENER HORARIOS
    // ============================================================

    const horariosResult = await pool.request().input('id_grupo', idGrupo)
      .query<HorarioGrupo>(`
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

    const horarios = horariosResult.recordset;

    if (horarios.length === 0) {
      throw new BadRequestException('El grupo no tiene horarios configurados.');
    }

    // ============================================================
    // VERIFICAR ASISTENCIAS / EVALUACIONES
    // ============================================================

    const dependencias = await pool.request().input('id_grupo', idGrupo).query(`
      SELECT TOP 1
        s.id_sesion
      FROM sesion_clase s
      WHERE s.id_grupo = @id_grupo
        AND s.id_horario IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM asistencia a
            WHERE a.id_sesion = s.id_sesion
          )
          OR EXISTS (
            SELECT 1
            FROM evaluacion e
            WHERE e.id_sesion = s.id_sesion
          )
        );
    `);

    if (dependencias.recordset.length > 0) {
      throw new BadRequestException(
        'No se puede regenerar el calendario porque existen asistencias o evaluaciones asociadas a sesiones anteriores.',
      );
    }

    // ============================================================
    // OBTENER SESIONES AUTOMÁTICAS EXISTENTES
    // ============================================================

    const sesionesExistentes = await pool.request().input('id_grupo', idGrupo)
      .query(`
      SELECT
        id_sesion,
        id_horario,
        fecha_programada
      FROM sesion_clase
      WHERE id_grupo = @id_grupo
        AND id_horario IS NOT NULL;
    `);

    // Creamos un Set para consultar rápidamente
    const sesionesSet = new Set(
      sesionesExistentes.recordset.map(
        (sesion) =>
          `${sesion.id_horario}_${this.formatearFechaDesdeValor(
            sesion.fecha_programada,
          )}`,
      ),
    );

    // ============================================================
    // GENERAR SESIONES FALTANTES
    // ============================================================

    const sesionesCreadas: object[] = [];
    const fechaActual = new Date(fechaInicio);

    while (fechaActual <= fechaFin) {
      const diaSemana = this.obtenerDiaSemana(fechaActual);

      const horariosDelDia = horarios.filter(
        (horario) => horario.dia_semana === diaSemana,
      );

      for (const horario of horariosDelDia) {
        const fechaSQL = this.formatearFecha(fechaActual);

        const clave = `${horario.id_horario}_${fechaSQL}`;

        // ========================================================
        // YA EXISTE -> NO INSERTAR
        // ========================================================

        if (sesionesSet.has(clave)) {
          continue;
        }

        // ========================================================
        // INSERTAR NUEVA SESIÓN
        // ========================================================

        const horaInicio = this.formatearHora(horario.hora_inicio);

        const horaFin = this.formatearHora(horario.hora_fin);

        const result = await pool
          .request()
          .input('id_grupo', idGrupo)
          .input('id_horario', horario.id_horario)
          .input('fecha_programada', fechaSQL)
          .input('hora_inicio', horaInicio)
          .input('hora_fin', horaFin).query(`
          INSERT INTO sesion_clase (
            id_grupo,
            id_horario,
            fecha_programada,
            hora_inicio,
            hora_fin,
            estado_sesion
          )
          OUTPUT INSERTED.*
          VALUES (
            @id_grupo,
            @id_horario,
            @fecha_programada,
            CAST(@hora_inicio AS TIME),
            CAST(@hora_fin AS TIME),
            'PROGRAMADA'
          );
        `);

        sesionesCreadas.push(result.recordset[0]);

        // Agregamos la nueva sesión al Set
        sesionesSet.add(clave);
      }

      fechaActual.setUTCDate(fechaActual.getUTCDate() + 1);
    }

    // ============================================================
    // RESPUESTA
    // ============================================================

    return {
      mensaje: 'Calendario de sesiones generado correctamente.',
      sesiones_existentes: sesionesExistentes.recordset.length,
      sesiones_creadas: sesionesCreadas.length,
      fecha_inicio: this.formatearFechaDesdeValor(grupo.fecha_inicio),
      fecha_fin: this.formatearFechaDesdeValor(grupo.fecha_fin),
      sesiones: sesionesCreadas,
    };
  }

  // ============================================================
  // ACTUALIZAR SESIÓN
  // ============================================================

  async updateSesion(id: number, sesion: UpdateSesionClaseDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener sesión
    // ----------------------------------------------------------

    const existente = await pool.request().input('id', id).query(`
        SELECT
          *
        FROM sesion_clase
        WHERE id_sesion = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(`La sesión con id ${id} no fue encontrada.`);
    }

    const actual = existente.recordset[0];

    // ----------------------------------------------------------
    // Solo sesiones programadas
    // ----------------------------------------------------------

    if (actual.estado_sesion !== 'PROGRAMADA') {
      throw new BadRequestException(
        'Solo se pueden modificar sesiones que están programadas.',
      );
    }

    // ----------------------------------------------------------
    // Obtener grupo
    // ----------------------------------------------------------

    const grupo = await pool.request().input('id_grupo', actual.id_grupo)
      .query<GrupoSesion>(`
        SELECT
          id_grupo,
          estado,
          fecha_inicio,
          fecha_fin
        FROM grupo
        WHERE id_grupo = @id_grupo;
      `);

    if (grupo.recordset.length === 0) {
      throw new NotFoundException(
        `El grupo con id ${actual.id_grupo} no fue encontrado.`,
      );
    }

    const grupoActual = grupo.recordset[0];

    // ----------------------------------------------------------
    // Mantener valores actuales
    // ----------------------------------------------------------

    const fechaProgramada =
      sesion.fecha_programada ??
      this.formatearFechaDesdeValor(actual.fecha_programada);

    const horaInicio =
      sesion.hora_inicio ?? this.formatearHora(actual.hora_inicio);

    const horaFin = sesion.hora_fin ?? this.formatearHora(actual.hora_fin);

    const tema = sesion.tema !== undefined ? sesion.tema : actual.tema;

    const observacion =
      sesion.observacion !== undefined
        ? sesion.observacion
        : actual.observacion;

    // ----------------------------------------------------------
    // Verificar fecha dentro del grupo
    // ----------------------------------------------------------

    const fechaSesion = this.crearFechaUTC(fechaProgramada);

    const fechaInicio = this.crearFechaUTC(
      this.formatearFechaDesdeValor(grupoActual.fecha_inicio),
    );

    const fechaFin = this.crearFechaUTC(
      this.formatearFechaDesdeValor(grupoActual.fecha_fin),
    );

    if (fechaSesion < fechaInicio || fechaSesion > fechaFin) {
      throw new BadRequestException(
        'La fecha de la sesión debe estar dentro del período del grupo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar hora
    // ----------------------------------------------------------

    if (horaInicio >= horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser menor que la hora de fin.',
      );
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
      .input('hora_fin', horaFin).query(`
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
      .input('fecha_programada', fechaProgramada)
      .input('hora_inicio', horaInicio)
      .input('hora_fin', horaFin)
      .input('tema', tema)
      .input('observacion', observacion).query(`
        UPDATE sesion_clase
        SET
          fecha_programada = @fecha_programada,
          hora_inicio = CAST(@hora_inicio AS TIME),
          hora_fin = CAST(@hora_fin AS TIME),
          tema = @tema,
          observacion = @observacion
        WHERE id_sesion = @id;
      `);

    // ----------------------------------------------------------
    // Obtener actualizado
    // ----------------------------------------------------------

    const actualizado = await pool.request().input('id', id).query(`
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

    const result = await pool.request().input('id', id).query(`
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

    const sesion = await pool.request().input('id_sesion', id).query(`
        SELECT
          id_sesion,
          id_grupo,
          estado_sesion,
          fecha_programada
        FROM sesion_clase
        WHERE id_sesion = @id_sesion;
      `);

    if (sesion.recordset.length === 0) {
      throw new NotFoundException(`La sesión con id ${id} no fue encontrada.`);
    }

    const sesionActual = sesion.recordset[0];

    // ----------------------------------------------------------
    // Solo programadas
    // ----------------------------------------------------------

    if (sesionActual.estado_sesion !== 'PROGRAMADA') {
      throw new BadRequestException(
        'Solo se puede finalizar una sesión que está programada.',
      );
    }

    // ----------------------------------------------------------
    // Validar asistencias
    // ----------------------------------------------------------

    await this.validarAsistenciasCompletas(id, sesionActual.id_grupo);

    // ----------------------------------------------------------
    // Validar evaluaciones
    // ----------------------------------------------------------

    await this.validarEvaluacionesCompletas(id, sesionActual.id_grupo);

    // ----------------------------------------------------------
    // Marcar como realizada
    // ----------------------------------------------------------

    const result = await pool.request().input('id_sesion', id).query(`
        UPDATE sesion_clase
        SET estado_sesion = 'REALIZADA'
        OUTPUT INSERTED.*
        WHERE id_sesion = @id_sesion
          AND estado_sesion = 'PROGRAMADA';
      `);

    if (result.recordset.length === 0) {
      throw new BadRequestException('La sesión no pudo ser finalizada.');
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
    // Inscripciones activas
    // ----------------------------------------------------------

    const inscripcionesResult = await pool.request().input('id_grupo', idGrupo)
      .query<{ id_inscripcion: number }>(`
          SELECT
            i.id_inscripcion
          FROM inscripcion i
          WHERE i.id_grupo = @id_grupo
            AND i.estado_inscripcion = 'ACTIVA';
        `);

    const idsInscripciones = inscripcionesResult.recordset.map(
      (inscripcion) => inscripcion.id_inscripcion,
    );

    const idsInscripcionesSet = new Set(idsInscripciones);

    // ----------------------------------------------------------
    // Asistencias
    // ----------------------------------------------------------

    const asistenciasResult = await pool.request().input('id_sesion', idSesion)
      .query<AsistenciaSesion>(`
          SELECT
            id_inscripcion,
            estado_asistencia
          FROM asistencia
          WHERE id_sesion = @id_sesion;
        `);

    const asistencias = asistenciasResult.recordset;

    // ----------------------------------------------------------
    // Verificar asistencias inválidas
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
      asistencias.map((asistencia) => asistencia.id_inscripcion),
    );

    const faltantes = idsInscripciones.filter(
      (idInscripcion) => !idsConAsistencia.has(idInscripcion),
    );

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se puede finalizar la sesión. Faltan asistencias para las inscripciones: ${faltantes.join(', ')}.`,
      );
    }

    // ----------------------------------------------------------
    // Estados válidos
    // ----------------------------------------------------------

    const estadosValidos = [
      'PRESENTE',
      'AUSENTE',
      'JUSTIFICADO',
      'SUSPENDIDO_POR_MORA',
    ];

    for (const asistencia of asistencias) {
      if (!estadosValidos.includes(asistencia.estado_asistencia)) {
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
    // Evaluaciones de la sesión
    // ----------------------------------------------------------

    const evaluacionesResult = await pool.request().input('id_sesion', idSesion)
      .query<EvaluacionSesion>(`
          SELECT
            id_evaluacion,
            tipo_evaluacion
          FROM evaluacion
          WHERE id_sesion = @id_sesion;
        `);

    const evaluaciones = evaluacionesResult.recordset;

    if (evaluaciones.length === 0) {
      return;
    }

    // ----------------------------------------------------------
    // Inscripciones activas
    // ----------------------------------------------------------

    const inscripcionesResult = await pool.request().input('id_grupo', idGrupo)
      .query<{ id_inscripcion: number }>(`
          SELECT
            i.id_inscripcion
          FROM inscripcion i
          WHERE i.id_grupo = @id_grupo
            AND i.estado_inscripcion = 'ACTIVA';
        `);

    const idsInscripciones = inscripcionesResult.recordset.map(
      (inscripcion) => inscripcion.id_inscripcion,
    );

    const idsInscripcionesSet = new Set(idsInscripciones);

    // ----------------------------------------------------------
    // Asistencias
    // ----------------------------------------------------------

    const asistenciasResult = await pool.request().input('id_sesion', idSesion)
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
    // Validar cada evaluación
    // ----------------------------------------------------------

    for (const evaluacion of evaluaciones) {
      const resultadosResult = await pool
        .request()
        .input('id_evaluacion', evaluacion.id_evaluacion)
        .query<ResultadoEvaluacion>(`
            SELECT
              id_inscripcion,
              nota,
              estado_resultado
            FROM resultado_evaluacion
            WHERE id_evaluacion = @id_evaluacion;
          `);

      const resultados = resultadosResult.recordset;

      const resultadosPorInscripcion = new Map<number, ResultadoEvaluacion>(
        resultados.map((resultado) => [resultado.id_inscripcion, resultado]),
      );

      // --------------------------------------------------------
      // Resultados inválidos
      // --------------------------------------------------------

      for (const resultado of resultados) {
        if (!idsInscripcionesSet.has(resultado.id_inscripcion)) {
          throw new BadRequestException(
            `La evaluación ${evaluacion.id_evaluacion} contiene un resultado para la inscripción ${resultado.id_inscripcion}, que no está activa en el grupo.`,
          );
        }
      }

      // --------------------------------------------------------
      // Faltantes
      // --------------------------------------------------------

      const faltantes = idsInscripciones.filter(
        (idInscripcion) => !resultadosPorInscripcion.has(idInscripcion),
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
        const resultado = resultadosPorInscripcion.get(idInscripcion);

        if (!resultado) {
          continue;
        }

        const estadoAsistencia = asistenciasPorInscripcion.get(idInscripcion);

        if (!estadoAsistencia) {
          throw new BadRequestException(
            `No existe asistencia para la inscripción ${idInscripcion}.`,
          );
        }

        // ------------------------------------------------------
        // NO PRESENTE
        // ------------------------------------------------------

        if (estadoAsistencia !== 'PRESENTE') {
          if (
            resultado.estado_resultado !== 'NO_SE_PRESENTO' ||
            resultado.nota !== null
          ) {
            throw new BadRequestException(
              `La inscripción ${idInscripcion} no estuvo presente y debe tener resultado NO_SE_PRESENTO con nota NULL en la evaluación ${evaluacion.id_evaluacion}.`,
            );
          }
        }

        // ------------------------------------------------------
        // PRESENTE
        // ------------------------------------------------------

        if (estadoAsistencia === 'PRESENTE') {
          if (resultado.estado_resultado !== 'CALIFICADO') {
            throw new BadRequestException(
              `La inscripción ${idInscripcion} estuvo presente y debe tener un resultado CALIFICADO en la evaluación ${evaluacion.id_evaluacion}.`,
            );
          }

          if (resultado.nota === null || resultado.nota === undefined) {
            throw new BadRequestException(
              `La inscripción ${idInscripcion} estuvo presente pero no tiene nota en la evaluación ${evaluacion.id_evaluacion}.`,
            );
          }

          if (resultado.nota < 0 || resultado.nota > 100) {
            throw new BadRequestException(
              `La nota de la inscripción ${idInscripcion} debe estar entre 0 y 100.`,
            );
          }
        }
      }
    }
  }

  // ============================================================
  // HELPER: DÍA DE LA SEMANA
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

    return dias[fecha.getUTCDay()];
  }

  // ============================================================
  // HELPER: FORMATEAR FECHA
  // ============================================================

  private formatearFecha(fecha: Date): string {
    const year = fecha.getUTCFullYear();

    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');

    const day = String(fecha.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // HELPER: CREAR FECHA UTC
  // ============================================================

  private crearFechaUTC(fecha: string): Date {
    const [year, month, day] = fecha.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day));
  }

  // ============================================================
  // HELPER: OBTENER FECHA YYYY-MM-DD
  // ============================================================

  private formatearFechaDesdeValor(valor: string | Date): string {
    if (typeof valor === 'string') {
      return valor.substring(0, 10);
    }

    return this.formatearFecha(valor);
  }

  // ============================================================
  // HELPER: FORMATEAR HORA
  // ============================================================

  private formatearHora(hora: any): string {
    // SQL Server TIME puede llegar como Date
    // dependiendo de mssql/tedious.

    if (hora instanceof Date) {
      const hours = String(hora.getUTCHours()).padStart(2, '0');

      const minutes = String(hora.getUTCMinutes()).padStart(2, '0');

      return `${hours}:${minutes}`;
    }

    if (typeof hora === 'string') {
      return hora.substring(0, 5);
    }

    return hora;
  }
}
