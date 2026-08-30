import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update_grupo.dto';

@Injectable()
export class GrupoService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================================
  // OBTENER TODOS LOS GRUPOS
  // ============================================================

  async getGrupos() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT *
      FROM grupo
      WHERE estado IN ('ACTIVO', 'FINALIZADO')
      ORDER BY fecha_inicio;
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UN GRUPO
  // ============================================================

  async getGrupo(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
        SELECT *
        FROM grupo
        WHERE id_grupo = @id;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    return result.recordset[0];
  }

  // ============================================================
  // CREAR GRUPO
  // ============================================================

  async createGrupo(grupo: CreateGrupoDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Validar duración
    // ----------------------------------------------------------

    if (!Number.isInteger(grupo.duracion_meses) || grupo.duracion_meses <= 0) {
      throw new BadRequestException(
        'La duración del grupo debe ser un número entero mayor que 0.',
      );
    }

    // ----------------------------------------------------------
    // Verificar curso
    // ----------------------------------------------------------

    const curso = await pool.request().input('id_curso', grupo.id_curso).query(`
        SELECT
          id_curso,
          estado
        FROM curso
        WHERE id_curso = @id_curso;
      `);

    if (curso.recordset.length === 0) {
      throw new NotFoundException(
        `El curso con id ${grupo.id_curso} no fue encontrado.`,
      );
    }

    if (curso.recordset[0].estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede crear un grupo para un curso que no está activo.',
      );
    }

    // ----------------------------------------------------------
    // Validar fecha de inicio
    // ----------------------------------------------------------

    const fechaInicio = this.crearFecha(grupo.fecha_inicio);

    if (!fechaInicio) {
      throw new BadRequestException('La fecha de inicio no es válida.');
    }

    // ----------------------------------------------------------
    // Calcular fecha de finalización
    //
    // fecha_fin ES INCLUSIVA.
    //
    // Ejemplo:
    // 23/08/2026 + 1 mes = 22/09/2026
    // ----------------------------------------------------------

    const fechaFin = new Date(fechaInicio);

    fechaFin.setMonth(fechaFin.getMonth() + grupo.duracion_meses);

    fechaFin.setDate(fechaFin.getDate() - 1);

    const fechaFinSql = this.formatearFecha(fechaFin);

    // ----------------------------------------------------------
    // Crear grupo
    // ----------------------------------------------------------

    const result = await pool
      .request()
      .input('id_curso', grupo.id_curso)
      .input('nombre_grupo', grupo.nombre_grupo)
      .input('fecha_inicio', this.formatearFecha(fechaInicio))
      .input('duracion_meses', grupo.duracion_meses)
      .input('fecha_fin', fechaFinSql).query(`
        INSERT INTO grupo (
          id_curso,
          nombre_grupo,
          fecha_inicio,
          duracion_meses,
          fecha_fin
        )
        OUTPUT INSERTED.*
        VALUES (
          @id_curso,
          @nombre_grupo,
          @fecha_inicio,
          @duracion_meses,
          @fecha_fin
        );
      `);

    return result.recordset[0];
  }

  // ============================================================
  // ACTUALIZAR GRUPO
  // ============================================================

  async updateGrupo(id: number, grupo: UpdateGrupoDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Verificar existencia
    // ----------------------------------------------------------

    const existente = await pool.request().input('id', id).query(`
        SELECT *
        FROM grupo
        WHERE id_grupo = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    const grupoActual = existente.recordset[0];

    // ----------------------------------------------------------
    // Solo grupos activos
    // ----------------------------------------------------------

    if (grupoActual.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede modificar un grupo que ya fue finalizado o cancelado.',
      );
    }

    // ----------------------------------------------------------
    // Verificar si el grupo ya inició
    // ----------------------------------------------------------

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaInicioActual = this.crearFecha(
      this.formatearFechaDesdeValor(grupoActual.fecha_inicio),
    );

    if (!fechaInicioActual) {
      throw new BadRequestException(
        'El grupo tiene una fecha de inicio inválida.',
      );
    }

    const grupoYaIniciado = fechaInicioActual <= hoy;

    // ----------------------------------------------------------
    // No modificar configuración después de iniciado
    // ----------------------------------------------------------

    if (
      grupoYaIniciado &&
      (grupo.fecha_inicio !== undefined || grupo.duracion_meses !== undefined)
    ) {
      throw new BadRequestException(
        'No se puede modificar la fecha de inicio ni la duración de un grupo que ya ha iniciado.',
      );
    }

    // ----------------------------------------------------------
    // Validar nueva duración
    // ----------------------------------------------------------

    if (
      grupo.duracion_meses !== undefined &&
      (!Number.isInteger(grupo.duracion_meses) || grupo.duracion_meses <= 0)
    ) {
      throw new BadRequestException(
        'La duración del grupo debe ser un número entero mayor que 0.',
      );
    }

    // ----------------------------------------------------------
    // Construir actualización
    // ----------------------------------------------------------

    const campos: string[] = [];

    const request = pool.request();

    request.input('id', id);

    // ----------------------------------------------------------
    // Nombre
    // ----------------------------------------------------------

    if (grupo.nombre_grupo !== undefined) {
      campos.push('nombre_grupo = @nombre_grupo');

      request.input('nombre_grupo', grupo.nombre_grupo);
    }

    // ----------------------------------------------------------
    // Mantener valores actuales
    // ----------------------------------------------------------

    let nuevaFechaInicio = this.formatearFechaDesdeValor(
      grupoActual.fecha_inicio,
    );

    let nuevaDuracion = grupoActual.duracion_meses;

    // ----------------------------------------------------------
    // Nueva fecha de inicio
    // ----------------------------------------------------------

    if (grupo.fecha_inicio !== undefined) {
      const fechaValidada = this.crearFecha(grupo.fecha_inicio);

      if (!fechaValidada) {
        throw new BadRequestException('La fecha de inicio no es válida.');
      }

      nuevaFechaInicio = this.formatearFecha(fechaValidada);

      campos.push('fecha_inicio = @fecha_inicio');

      request.input('fecha_inicio', nuevaFechaInicio);
    }

    // ----------------------------------------------------------
    // Nueva duración
    // ----------------------------------------------------------

    if (grupo.duracion_meses !== undefined) {
      nuevaDuracion = grupo.duracion_meses;

      campos.push('duracion_meses = @duracion_meses');

      request.input('duracion_meses', grupo.duracion_meses);
    }

    // ----------------------------------------------------------
    // Recalcular fecha_fin
    //
    // fecha_fin es inclusiva.
    // ----------------------------------------------------------

    if (
      grupo.fecha_inicio !== undefined ||
      grupo.duracion_meses !== undefined
    ) {
      const nuevaFecha = this.crearFecha(nuevaFechaInicio);

      if (!nuevaFecha) {
        throw new BadRequestException('La fecha de inicio no es válida.');
      }

      nuevaFecha.setMonth(nuevaFecha.getMonth() + nuevaDuracion);

      nuevaFecha.setDate(nuevaFecha.getDate() - 1);

      const nuevaFechaFin = this.formatearFecha(nuevaFecha);

      campos.push('fecha_fin = @fecha_fin');

      request.input('fecha_fin', nuevaFechaFin);
    }

    // ----------------------------------------------------------
    // No hay nada que actualizar
    // ----------------------------------------------------------

    if (campos.length === 0) {
      return {
        mensaje: 'No se proporcionaron datos para actualizar.',
      };
    }

    // ----------------------------------------------------------
    // Ejecutar actualización
    // ----------------------------------------------------------

    await request.query(`
      UPDATE grupo
      SET ${campos.join(', ')}
      WHERE id_grupo = @id;
    `);

    // ----------------------------------------------------------
    // Obtener actualizado
    // ----------------------------------------------------------

    const actualizado = await pool.request().input('id', id).query(`
        SELECT *
        FROM grupo
        WHERE id_grupo = @id;
      `);

    if (actualizado.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    return actualizado.recordset[0];
  }

  // ============================================================
  // CANCELAR GRUPO
  // ============================================================

  async deleteGrupo(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
        SELECT *
        FROM grupo
        WHERE id_grupo = @id;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    const grupo = result.recordset[0];

    if (grupo.estado !== 'ACTIVO') {
      throw new BadRequestException('El grupo ya no se encuentra activo.');
    }

    // ----------------------------------------------------------
    // Cancelar grupo
    // ----------------------------------------------------------

    await pool.request().input('id', id).query(`
        UPDATE grupo
        SET estado = 'CANCELADO'
        WHERE id_grupo = @id;
      `);

    // ----------------------------------------------------------
    // Actualizar estado del curso
    // ----------------------------------------------------------

    await this.actualizarEstadoCurso(grupo.id_curso);

    return {
      mensaje: 'Grupo cancelado correctamente.',
    };
  }

  // ============================================================
  // FINALIZAR GRUPO
  // ============================================================

  async finalizarGrupo(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
        SELECT *
        FROM grupo
        WHERE id_grupo = @id;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    const grupo = result.recordset[0];

    if (grupo.estado !== 'ACTIVO') {
      throw new BadRequestException('El grupo ya no se encuentra activo.');
    }

    // ----------------------------------------------------------
    // Finalizar grupo
    // ----------------------------------------------------------

    await pool.request().input('id', id).query(`
        UPDATE grupo
        SET estado = 'FINALIZADO'
        WHERE id_grupo = @id;
      `);

    // ----------------------------------------------------------
    // Finalizar inscripciones activas
    // ----------------------------------------------------------

    await pool.request().input('id_grupo', id).query(`
        UPDATE inscripcion
        SET estado_inscripcion = 'FINALIZADA'
        WHERE id_grupo = @id_grupo
          AND estado_inscripcion = 'ACTIVA';
      `);

    // ----------------------------------------------------------
    // Cancelar sesiones programadas
    // ----------------------------------------------------------

    await pool.request().input('id_grupo', id).query(`
        UPDATE sesion_clase
        SET estado_sesion = 'CANCELADA'
        WHERE id_grupo = @id_grupo
          AND estado_sesion = 'PROGRAMADA';
      `);

    // ----------------------------------------------------------
    // Actualizar estado del curso
    // ----------------------------------------------------------

    await this.actualizarEstadoCurso(grupo.id_curso);

    return {
      mensaje: 'Grupo finalizado correctamente.',
    };
  }

  // ============================================================
  // ACTUALIZAR ESTADO DEL CURSO
  // ============================================================

  private async actualizarEstadoCurso(idCurso: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id_curso', idCurso).query(`
        SELECT estado
        FROM grupo
        WHERE id_curso = @id_curso;
      `);

    const grupos = result.recordset;

    // ----------------------------------------------------------
    // Si todavía hay grupos activos,
    // el curso permanece activo.
    // ----------------------------------------------------------

    const hayActivos = grupos.some((grupo) => grupo.estado === 'ACTIVO');

    if (hayActivos) {
      return;
    }

    // ----------------------------------------------------------
    // Si todos los grupos terminaron/cancelaron,
    // determinar estado del curso.
    // ----------------------------------------------------------

    const hayFinalizados = grupos.some(
      (grupo) => grupo.estado === 'FINALIZADO',
    );

    const nuevoEstado = hayFinalizados ? 'FINALIZADO' : 'CANCELADO';

    await pool.request().input('id_curso', idCurso).input('estado', nuevoEstado)
      .query(`
        UPDATE curso
        SET estado = @estado
        WHERE id_curso = @id_curso;
      `);
  }

  // ============================================================
  // HELPER: CREAR FECHA SIN PROBLEMAS DE ZONA HORARIA
  // ============================================================

  private crearFecha(fecha: string): Date | null {
    if (!fecha) {
      return null;
    }

    const partes = fecha.substring(0, 10).split('-').map(Number);

    if (partes.length !== 3) {
      return null;
    }

    const [year, month, day] = partes;

    if (
      !year ||
      !month ||
      !day ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const resultado = new Date(year, month - 1, day);

    // Evitar fechas como 2026-02-31
    if (
      resultado.getFullYear() !== year ||
      resultado.getMonth() !== month - 1 ||
      resultado.getDate() !== day
    ) {
      return null;
    }

    return resultado;
  }

  // ============================================================
  // HELPER: FORMATEAR FECHA
  // ============================================================

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();

    const month = String(fecha.getMonth() + 1).padStart(2, '0');

    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // HELPER: OBTENER YYYY-MM-DD
  // ============================================================

  private formatearFechaDesdeValor(valor: string | Date): string {
    if (typeof valor === 'string') {
      return valor.substring(0, 10);
    }

    return this.formatearFecha(valor);
  }
}
