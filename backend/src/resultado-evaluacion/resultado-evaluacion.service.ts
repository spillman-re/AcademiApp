import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateResultadosEvaluacionDto } from './dto/create-resultados-evaluacion.dto';
import { UpdateResultadoEvaluacionDto } from './dto/update-resultado-evaluacion.dto';

@Injectable()
export class ResultadoEvaluacionService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================================
  // OBTENER TODOS
  // ============================================================

  async getResultados() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT
        r.*,
        e.tipo_evaluacion,
        e.id_sesion,
        i.id_estudiante,
        est.codigo_estudiante,
        est.nombres,
        est.apellidos
      FROM resultado_evaluacion r
      INNER JOIN evaluacion e
        ON r.id_evaluacion = e.id_evaluacion
      INNER JOIN inscripcion i
        ON r.id_inscripcion = i.id_inscripcion
      INNER JOIN estudiante est
        ON i.id_estudiante = est.id_estudiante
      ORDER BY
        e.id_evaluacion,
        est.apellidos,
        est.nombres;
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UNO
  // ============================================================

  async getResultado(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
        SELECT
          r.*,
          e.tipo_evaluacion,
          e.id_sesion,
          i.id_estudiante,
          est.codigo_estudiante,
          est.nombres,
          est.apellidos
        FROM resultado_evaluacion r
        INNER JOIN evaluacion e
          ON r.id_evaluacion = e.id_evaluacion
        INNER JOIN inscripcion i
          ON r.id_inscripcion = i.id_inscripcion
        INNER JOIN estudiante est
          ON i.id_estudiante = est.id_estudiante
        WHERE r.id_resultado = @id;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `El resultado con id ${id} no fue encontrado.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // REGISTRAR RESULTADOS DE UNA EVALUACIÓN
  // ============================================================

  async createResultados(
    idEvaluacion: number,
    data: CreateResultadosEvaluacionDto,
  ) {
    const pool = this.databaseService.getPool();

    // ==========================================================
    // VERIFICAR EVALUACIÓN + SESIÓN + GRUPO
    // ==========================================================

    const evaluacion = await pool.request().input('id_evaluacion', idEvaluacion)
      .query(`
      SELECT
        e.id_evaluacion,
        e.id_sesion,
        s.id_grupo,
        s.estado_sesion
      FROM evaluacion e
      INNER JOIN sesion_clase s
        ON e.id_sesion = s.id_sesion
      WHERE e.id_evaluacion = @id_evaluacion;
    `);

    if (evaluacion.recordset.length === 0) {
      throw new NotFoundException(
        `La evaluación con id ${idEvaluacion} no fue encontrada.`,
      );
    }

    const evaluacionActual = evaluacion.recordset[0];

    // ==========================================================
    // VALIDAR ESTADO DE LA SESIÓN
    // ==========================================================

    if (evaluacionActual.estado_sesion === 'CANCELADA') {
      throw new BadRequestException(
        'No se pueden registrar resultados para una sesión cancelada.',
      );
    }

    if (evaluacionActual.estado_sesion === 'REALIZADA') {
      throw new BadRequestException(
        'No se pueden registrar nuevos resultados para una sesión que ya fue realizada.',
      );
    }

    // ==========================================================
    // OBTENER ASISTENCIAS DE LA SESIÓN
    // ==========================================================

    const asistenciasResult = await pool
      .request()
      .input('id_sesion', evaluacionActual.id_sesion)
      .input('id_grupo', evaluacionActual.id_grupo).query(`
    SELECT
      a.id_inscripcion,
      a.estado_asistencia
    FROM asistencia a
    INNER JOIN inscripcion i
      ON a.id_inscripcion = i.id_inscripcion
    WHERE a.id_sesion = @id_sesion
      AND i.id_grupo = @id_grupo;
  `);

    const asistencias = asistenciasResult.recordset;

    if (asistencias.length === 0) {
      throw new BadRequestException(
        'No existen asistencias registradas para esta sesión. Primero debe registrarse la asistencia.',
      );
    }

    // ==========================================================
    // VERIFICAR QUE EXISTAN RESULTADOS ENVIADOS
    // ==========================================================

    if (!data.resultados || data.resultados.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un resultado.');
    }

    // ==========================================================
    // VERIFICAR INSCRIPCIONES REPETIDAS
    // ==========================================================

    const idsEnviados = data.resultados.map(
      (resultado) => resultado.id_inscripcion,
    );

    const idsUnicos = new Set(idsEnviados);

    if (idsEnviados.length !== idsUnicos.size) {
      throw new BadRequestException(
        'No puede haber inscripciones repetidas en los resultados.',
      );
    }

    // ==========================================================
    // MAPA DE ASISTENCIAS
    // ==========================================================

    const asistenciaMap = new Map<number, string>();

    for (const asistencia of asistencias) {
      asistenciaMap.set(
        asistencia.id_inscripcion,
        asistencia.estado_asistencia,
      );
    }

    // ==========================================================
    // VERIFICAR QUE TODAS LAS INSCRIPCIONES ENVIADAS
    // PERTENEZCAN A LA SESIÓN
    // ==========================================================

    for (const resultado of data.resultados) {
      if (!asistenciaMap.has(resultado.id_inscripcion)) {
        throw new BadRequestException(
          `La inscripción ${resultado.id_inscripcion} no tiene asistencia registrada para esta sesión.`,
        );
      }
    }

    // ==========================================================
    // VERIFICAR QUE TODOS LOS PRESENTES TENGAN RESULTADO
    // ==========================================================

    const presentes = asistencias.filter(
      (a) => a.estado_asistencia === 'PRESENTE',
    );

    const presentesSinResultado = presentes.filter(
      (asistencia) => !idsUnicos.has(asistencia.id_inscripcion),
    );

    if (presentesSinResultado.length > 0) {
      const idsFaltantes = presentesSinResultado.map((a) => a.id_inscripcion);

      throw new BadRequestException(
        `Debe registrar el resultado de todos los estudiantes presentes. Inscripciones faltantes: ${idsFaltantes.join(', ')}`,
      );
    }

    // ==========================================================
    // PROCESAR RESULTADOS
    // ==========================================================

    const resultadosProcesados: {
      id_inscripcion: number;
      nota: number | null;
      estado_resultado: 'CALIFICADO' | 'NO_SE_PRESENTO';
    }[] = [];

    for (const asistencia of asistencias) {
      const idInscripcion = asistencia.id_inscripcion;
      const estadoAsistencia = asistencia.estado_asistencia;

      const resultadoEnviado = data.resultados.find(
        (resultado) => resultado.id_inscripcion === idInscripcion,
      );

      // --------------------------------------------------------
      // PRESENTE
      // --------------------------------------------------------

      if (estadoAsistencia === 'PRESENTE') {
        if (!resultadoEnviado) {
          throw new BadRequestException(
            `La inscripción ${idInscripcion} estuvo presente y debe tener un resultado.`,
          );
        }

        if (
          resultadoEnviado.nota === undefined ||
          resultadoEnviado.nota === null
        ) {
          throw new BadRequestException(
            `La inscripción ${idInscripcion} estuvo presente y debe tener una nota.`,
          );
        }

        if (resultadoEnviado.nota < 0 || resultadoEnviado.nota > 100) {
          throw new BadRequestException(
            `La nota de la inscripción ${idInscripcion} debe estar entre 0 y 100.`,
          );
        }

        resultadosProcesados.push({
          id_inscripcion: idInscripcion,
          nota: resultadoEnviado.nota,
          estado_resultado: 'CALIFICADO',
        });

        continue;
      }

      // --------------------------------------------------------
      // AUSENTE / JUSTIFICADO / SUSPENDIDO POR MORA
      // --------------------------------------------------------

      if (
        estadoAsistencia === 'AUSENTE' ||
        estadoAsistencia === 'JUSTIFICADO' ||
        estadoAsistencia === 'SUSPENDIDO_POR_MORA'
      ) {
        resultadosProcesados.push({
          id_inscripcion: idInscripcion,
          nota: null,
          estado_resultado: 'NO_SE_PRESENTO',
        });

        continue;
      }

      throw new BadRequestException(
        `La inscripción ${idInscripcion} tiene un estado de asistencia no válido.`,
      );
    }

    // ==========================================================
    // VERIFICAR RESULTADOS PREVIOS
    // ==========================================================

    for (const resultado of resultadosProcesados) {
      const existente = await pool
        .request()
        .input('id_evaluacion', idEvaluacion)
        .input('id_inscripcion', resultado.id_inscripcion).query(`
        SELECT id_resultado
        FROM resultado_evaluacion
        WHERE id_evaluacion = @id_evaluacion
          AND id_inscripcion = @id_inscripcion;
      `);

      if (existente.recordset.length > 0) {
        throw new BadRequestException(
          `La inscripción ${resultado.id_inscripcion} ya tiene un resultado para esta evaluación.`,
        );
      }
    }

    // ==========================================================
    // CREAR RESULTADOS EN UNA TRANSACCIÓN
    // ==========================================================

    const transaction = pool.transaction();

    const resultadosCreados: any[] = [];

    await transaction.begin();

    try {
      for (const resultado of resultadosProcesados) {
        const request = transaction
          .request()
          .input('id_evaluacion', idEvaluacion)
          .input('id_inscripcion', resultado.id_inscripcion)
          .input('nota', resultado.nota)
          .input('estado_resultado', resultado.estado_resultado);

        const result = await request.query(`
        INSERT INTO resultado_evaluacion (
          id_evaluacion,
          id_inscripcion,
          nota,
          estado_resultado
        )
        OUTPUT INSERTED.*
        VALUES (
          @id_evaluacion,
          @id_inscripcion,
          @nota,
          @estado_resultado
        );
      `);

        resultadosCreados.push(result.recordset[0]);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return {
      mensaje: 'Resultados registrados correctamente.',
      cantidad: resultadosCreados.length,
      resultados: resultadosCreados,
    };
  }

  // ============================================================
  // ACTUALIZAR UN RESULTADO
  // ============================================================

  async updateResultado(id: number, data: UpdateResultadoEvaluacionDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener resultado actual + evaluación + sesión
    // ----------------------------------------------------------

    const existente = await pool.request().input('id', id).query(`
        SELECT
          r.id_resultado,
          r.id_evaluacion,
          r.id_inscripcion,
          r.nota,
          r.estado_resultado,
          e.id_sesion,
          s.id_grupo,
          s.estado_sesion
        FROM resultado_evaluacion r
        INNER JOIN evaluacion e
          ON r.id_evaluacion = e.id_evaluacion
        INNER JOIN sesion_clase s
          ON e.id_sesion = s.id_sesion
        WHERE r.id_resultado = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El resultado con id ${id} no fue encontrado.`,
      );
    }

    const actual = existente.recordset[0];

    // ----------------------------------------------------------
    // No modificar resultados de sesiones canceladas
    // ----------------------------------------------------------

    if (
      actual.estado_sesion === 'CANCELADA' ||
      actual.estado_sesion === 'REALIZADA'
    ) {
      throw new BadRequestException(
        'No se puede modificar un resultado perteneciente a una sesión cancelada o ya realizada.',
      );
    }

    // ----------------------------------------------------------
    // Verificar inscripción
    // ----------------------------------------------------------

    const inscripcion = await pool
      .request()
      .input('id_inscripcion', actual.id_inscripcion).query(`
        SELECT
          id_inscripcion,
          estado_inscripcion
        FROM inscripcion
        WHERE id_inscripcion = @id_inscripcion;
      `);

    if (inscripcion.recordset.length === 0) {
      throw new NotFoundException(
        `La inscripción ${actual.id_inscripcion} no fue encontrada.`,
      );
    }

    if (inscripcion.recordset[0].estado_inscripcion === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede modificar un resultado de una inscripción cancelada.',
      );
    }

    // ----------------------------------------------------------
    // Obtener asistencia actual
    // ----------------------------------------------------------

    const asistencia = await pool
      .request()
      .input('id_inscripcion', actual.id_inscripcion)
      .input('id_sesion', actual.id_sesion).query(`
        SELECT
          id_asistencia,
          estado_asistencia
        FROM asistencia
        WHERE id_inscripcion = @id_inscripcion
          AND id_sesion = @id_sesion;
      `);

    if (asistencia.recordset.length === 0) {
      throw new BadRequestException(
        'La inscripción no tiene asistencia registrada para esta sesión.',
      );
    }

    const estadoAsistencia = asistencia.recordset[0].estado_asistencia;

    // ==========================================================
    // LA ASISTENCIA MANDA
    // ==========================================================

    let nota: number | null;

    let estadoResultado: 'CALIFICADO' | 'NO_SE_PRESENTO';

    if (estadoAsistencia === 'PRESENTE') {
      // --------------------------------------------------------
      // PRESENTE → CALIFICADO + NOTA
      // --------------------------------------------------------

      estadoResultado = data.estado_resultado ?? actual.estado_resultado;

      nota = data.nota !== undefined ? data.nota : actual.nota;

      if (estadoResultado !== 'CALIFICADO') {
        throw new BadRequestException(
          'Un estudiante con asistencia PRESENTE debe tener un resultado CALIFICADO.',
        );
      }

      if (nota === null || nota === undefined) {
        throw new BadRequestException(
          'Un resultado CALIFICADO debe tener una nota.',
        );
      }

      if (nota < 0 || nota > 100) {
        throw new BadRequestException('La nota debe estar entre 0 y 100.');
      }
    } else if (
      estadoAsistencia === 'AUSENTE' ||
      estadoAsistencia === 'JUSTIFICADO' ||
      estadoAsistencia === 'SUSPENDIDO_POR_MORA'
    ) {
      // --------------------------------------------------------
      // NO PRESENTE → SIEMPRE NO_SE_PRESENTO + NULL
      // --------------------------------------------------------

      estadoResultado = 'NO_SE_PRESENTO';
      nota = null;
    } else {
      throw new BadRequestException('El estado de asistencia no es válido.');
    }

    // ==========================================================
    // ACTUALIZAR
    // ==========================================================

    const result = await pool
      .request()
      .input('id', id)
      .input('nota', nota)
      .input('estado_resultado', estadoResultado).query(`
        UPDATE resultado_evaluacion
        SET
          nota = @nota,
          estado_resultado = @estado_resultado
        WHERE id_resultado = @id;

        SELECT
          r.*,
          e.tipo_evaluacion,
          e.id_sesion,
          i.id_estudiante,
          est.codigo_estudiante,
          est.nombres,
          est.apellidos
        FROM resultado_evaluacion r
        INNER JOIN evaluacion e
          ON r.id_evaluacion = e.id_evaluacion
        INNER JOIN inscripcion i
          ON r.id_inscripcion = i.id_inscripcion
        INNER JOIN estudiante est
          ON i.id_estudiante = est.id_estudiante
        WHERE r.id_resultado = @id;
      `);

    return result.recordsets[1][0];
  }
}
