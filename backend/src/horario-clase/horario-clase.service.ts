import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';

import * as sql from 'mssql';

@Injectable()
export class HorarioClaseService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  // ============================================================
  // OBTENER HORARIOS DE UN GRUPO
  // ============================================================

  async getHorariosPorGrupo(idGrupo: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id_grupo', sql.Int, idGrupo)
      .query(`
        SELECT
          id_horario,
          id_grupo,
          dia_semana,
          CONVERT(VARCHAR(5), hora_inicio, 108) AS hora_inicio,
          CONVERT(VARCHAR(5), hora_fin, 108) AS hora_fin
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
          hora_inicio
      `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UN HORARIO
  // ============================================================

  async getHorario(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          id_horario,
          id_grupo,
          dia_semana,
          CONVERT(VARCHAR(5), hora_inicio, 108) AS hora_inicio,
          CONVERT(VARCHAR(5), hora_fin, 108) AS hora_fin
        FROM horario_clase
        WHERE id_horario = @id
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `El horario con id ${id} no fue encontrado.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // CREAR HORARIO
  // ============================================================

  async createHorario(
    idGrupo: number,
    horario: CreateHorarioDto,
  ) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Verificar grupo
    // ----------------------------------------------------------

    const grupoResult = await pool
      .request()
      .input('id_grupo', sql.Int, idGrupo)
      .query(`
        SELECT
          id_grupo,
          estado,
          fecha_inicio
        FROM grupo
        WHERE id_grupo = @id_grupo
      `);

    if (grupoResult.recordset.length === 0) {
      throw new NotFoundException(
        `El grupo con id ${idGrupo} no fue encontrado.`,
      );
    }

    const grupo = grupoResult.recordset[0];

    // ----------------------------------------------------------
    // Verificar estado
    // ----------------------------------------------------------

    if (grupo.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede crear un horario para un grupo que no está activo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar si el grupo ya inició
    //
    // IMPORTANTE:
    // fecha_inicio es DATE en SQL Server.
    // La comparación se hace directamente en SQL Server
    // para evitar problemas de zona horaria con JavaScript.
    // ----------------------------------------------------------

    const grupoIniciado = await pool
      .request()
      .input('id_grupo', sql.Int, idGrupo)
      .query(`
        SELECT id_grupo
        FROM grupo
        WHERE id_grupo = @id_grupo
          AND fecha_inicio <= CAST(GETDATE() AS DATE)
      `);

    if (grupoIniciado.recordset.length > 0) {
      throw new BadRequestException(
        'No se puede crear un horario porque el grupo ya ha iniciado.',
      );
    }

    // ----------------------------------------------------------
    // Verificar solapamiento
    // ----------------------------------------------------------

    const conflicto = await pool
      .request()
      .input('id_grupo', sql.Int, idGrupo)
      .input(
        'dia_semana',
        sql.VarChar(20),
        horario.dia_semana,
      )
      .input(
        'hora_inicio',
        sql.VarChar(5),
        horario.hora_inicio,
      )
      .input(
        'hora_fin',
        sql.VarChar(5),
        horario.hora_fin,
      )
      .query(`
        SELECT id_horario
        FROM horario_clase
        WHERE id_grupo = @id_grupo
          AND dia_semana = @dia_semana
          AND hora_inicio < CAST(@hora_fin AS TIME)
          AND hora_fin > CAST(@hora_inicio AS TIME)
      `);

    if (conflicto.recordset.length > 0) {
      throw new BadRequestException(
        'El horario se solapa con otro horario del mismo grupo.',
      );
    }

    // ----------------------------------------------------------
    // Crear horario
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id_grupo', sql.Int, idGrupo)
      .input(
        'dia_semana',
        sql.VarChar(20),
        horario.dia_semana,
      )
      .input(
        'hora_inicio',
        sql.VarChar(5),
        horario.hora_inicio,
      )
      .input(
        'hora_fin',
        sql.VarChar(5),
        horario.hora_fin,
      )
      .query(`
        INSERT INTO horario_clase (
          id_grupo,
          dia_semana,
          hora_inicio,
          hora_fin
        )
        OUTPUT
          INSERTED.id_horario,
          INSERTED.id_grupo,
          INSERTED.dia_semana,
          INSERTED.hora_inicio,
          INSERTED.hora_fin
        VALUES (
          @id_grupo,
          @dia_semana,
          CAST(@hora_inicio AS TIME),
          CAST(@hora_fin AS TIME)
        );
      `);

    return result.recordset[0];
  }

  // ============================================================
  // ACTUALIZAR HORARIO
  // ============================================================

  async updateHorario(
    id: number,
    horario: UpdateHorarioDto,
  ) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener horario + grupo
    // ----------------------------------------------------------

    const existente = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          h.id_horario,
          h.id_grupo,
          h.dia_semana,
          CONVERT(VARCHAR(5), h.hora_inicio, 108) AS hora_inicio,
          CONVERT(VARCHAR(5), h.hora_fin, 108) AS hora_fin,
          g.estado AS estado_grupo,
          g.fecha_inicio
        FROM horario_clase h
        INNER JOIN grupo g
          ON h.id_grupo = g.id_grupo
        WHERE h.id_horario = @id
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El horario con id ${id} no fue encontrado.`,
      );
    }

    const horarioActual = existente.recordset[0];

    // ----------------------------------------------------------
    // Verificar estado del grupo
    // ----------------------------------------------------------

    if (horarioActual.estado_grupo !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede modificar un horario cuyo grupo no está activo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar si el grupo ya inició
    // ----------------------------------------------------------

    const grupoIniciado = await pool
      .request()
      .input(
        'id_grupo',
        sql.Int,
        horarioActual.id_grupo,
      )
      .query(`
        SELECT id_grupo
        FROM grupo
        WHERE id_grupo = @id_grupo
          AND fecha_inicio <= CAST(GETDATE() AS DATE)
      `);

    if (grupoIniciado.recordset.length > 0) {
      throw new BadRequestException(
        'No se puede modificar el horario porque el grupo ya ha iniciado.',
      );
    }

    // ----------------------------------------------------------
    // Obtener valores finales
    // ----------------------------------------------------------

    const diaSemana =
      horario.dia_semana ??
      horarioActual.dia_semana;

    const horaInicio =
      horario.hora_inicio ??
      horarioActual.hora_inicio;

    const horaFin =
      horario.hora_fin ??
      horarioActual.hora_fin;

    // ----------------------------------------------------------
    // Verificar solapamiento
    // ----------------------------------------------------------

    const conflicto = await pool
      .request()
      .input('id', sql.Int, id)
      .input(
        'id_grupo',
        sql.Int,
        horarioActual.id_grupo,
      )
      .input(
        'dia_semana',
        sql.VarChar(20),
        diaSemana,
      )
      .input(
        'hora_inicio',
        sql.VarChar(5),
        horaInicio,
      )
      .input(
        'hora_fin',
        sql.VarChar(5),
        horaFin,
      )
      .query(`
        SELECT id_horario
        FROM horario_clase
        WHERE id_grupo = @id_grupo
          AND dia_semana = @dia_semana
          AND hora_inicio < CAST(@hora_fin AS TIME)
          AND hora_fin > CAST(@hora_inicio AS TIME)
          AND id_horario <> @id
      `);

    if (conflicto.recordset.length > 0) {
      throw new BadRequestException(
        'El horario se solapa con otro horario del mismo grupo.',
      );
    }

    // ----------------------------------------------------------
    // Actualizar
    // ----------------------------------------------------------

    await pool
      .request()
      .input('id', sql.Int, id)
      .input(
        'dia_semana',
        sql.VarChar(20),
        diaSemana,
      )
      .input(
        'hora_inicio',
        sql.VarChar(5),
        horaInicio,
      )
      .input(
        'hora_fin',
        sql.VarChar(5),
        horaFin,
      )
      .query(`
        UPDATE horario_clase
        SET
          dia_semana = @dia_semana,
          hora_inicio = CAST(@hora_inicio AS TIME),
          hora_fin = CAST(@hora_fin AS TIME)
        WHERE id_horario = @id
      `);

    // ----------------------------------------------------------
    // Obtener actualizado
    // ----------------------------------------------------------

    const actualizado = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          id_horario,
          id_grupo,
          dia_semana,
          CONVERT(VARCHAR(5), hora_inicio, 108) AS hora_inicio,
          CONVERT(VARCHAR(5), hora_fin, 108) AS hora_fin
        FROM horario_clase
        WHERE id_horario = @id
      `);

    return actualizado.recordset[0];
  }

  // ============================================================
  // ELIMINAR HORARIO
  // ============================================================

  async deleteHorario(id: number) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Obtener horario + grupo
    // ----------------------------------------------------------

    const existente = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          h.id_horario,
          h.id_grupo,
          g.estado AS estado_grupo,
          g.fecha_inicio
        FROM horario_clase h
        INNER JOIN grupo g
          ON h.id_grupo = g.id_grupo
        WHERE h.id_horario = @id
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El horario con id ${id} no fue encontrado.`,
      );
    }

    const horarioActual = existente.recordset[0];

    // ----------------------------------------------------------
    // Verificar estado
    // ----------------------------------------------------------

    if (horarioActual.estado_grupo !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede eliminar un horario cuyo grupo no está activo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar si el grupo ya inició
    // ----------------------------------------------------------

    const grupoIniciado = await pool
      .request()
      .input(
        'id_grupo',
        sql.Int,
        horarioActual.id_grupo,
      )
      .query(`
        SELECT id_grupo
        FROM grupo
        WHERE id_grupo = @id_grupo
          AND fecha_inicio <= CAST(GETDATE() AS DATE)
      `);

    if (grupoIniciado.recordset.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el horario porque el grupo ya ha iniciado.',
      );
    }

    // ----------------------------------------------------------
    // Verificar sesiones asociadas
    // ----------------------------------------------------------

    const sesiones = await pool
      .request()
      .input(
        'id_horario',
        sql.Int,
        id,
      )
      .query(`
        SELECT id_sesion
        FROM sesion_clase
        WHERE id_horario = @id_horario
      `);

    if (sesiones.recordset.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el horario porque tiene sesiones asociadas.',
      );
    }

    // ----------------------------------------------------------
    // Eliminar
    // ----------------------------------------------------------

    await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM horario_clase
        WHERE id_horario = @id
      `);

    return {
      mensaje: 'Horario eliminado correctamente.',
    };
  }
}