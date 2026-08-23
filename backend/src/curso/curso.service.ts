import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import * as sql from 'mssql';

import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';

@Injectable()
export class CursoService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  // ============================================================
  // OBTENER TODOS LOS CURSOS
  // ============================================================

  async getCursos() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT *
      FROM curso
      WHERE estado IN ('ACTIVO', 'FINALIZADO')
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UN CURSO
  // ============================================================

  async getCurso(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT *
        FROM curso
        WHERE id_curso = @id
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `El curso con id ${id} no fue encontrado.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // CREAR CURSO
  // ============================================================

  async createCurso(curso: CreateCursoDto) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input(
        'nombre_curso',
        sql.VarChar(150),
        curso.nombre_curso,
      )
      .input(
        'descripcion',
        sql.VarChar(sql.Max),
        curso.descripcion ?? null,
      )
      .input(
        'precio',
        sql.Numeric(10, 2),
        curso.precio,
      )
      .input(
        'precio_matricula',
        sql.Numeric(10, 2),
        curso.precio_matricula ?? 0,
      )
      .query(`
        INSERT INTO curso (
          nombre_curso,
          descripcion,
          precio,
          precio_matricula
        )
        OUTPUT INSERTED.*
        VALUES (
          @nombre_curso,
          @descripcion,
          @precio,
          @precio_matricula
        );
      `);

    return result.recordset[0];
  }

  // ============================================================
  // ACTUALIZAR CURSO
  // ============================================================

  async updateCurso(id: number, body: UpdateCursoDto) {
    const pool = this.databaseService.getPool();

    // ----------------------------------------------------------
    // Verificar existencia y estado
    // ----------------------------------------------------------

    const existente = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          id_curso,
          estado
        FROM curso
        WHERE id_curso = @id
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El curso con id ${id} no fue encontrado.`,
      );
    }

    const cursoActual = existente.recordset[0];

    if (cursoActual.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede modificar un curso que no está activo.',
      );
    }

    // ----------------------------------------------------------
    // Verificar si existen inscripciones históricas
    // ----------------------------------------------------------
    //
    // IMPORTANTE:
    // No buscamos únicamente inscripciones ACTIVAS.
    //
    // Una vez que existe una inscripción, el precio del curso
    // debe quedar congelado para proteger el historial financiero.
    //
    // Esto evita que:
    //
    // 1. Se inscriba un estudiante.
    // 2. La inscripción termine.
    // 3. Se cambie posteriormente el precio del curso.
    //
    // El precio original debe seguir siendo válido para las
    // obligaciones generadas durante esa inscripción.
    // ----------------------------------------------------------

    const inscripciones = await pool
      .request()
      .input('id_curso', sql.Int, id)
      .query(`
        SELECT TOP 1
          i.id_inscripcion
        FROM inscripcion i
        INNER JOIN grupo g
          ON i.id_grupo = g.id_grupo
        WHERE g.id_curso = @id_curso
      `);

    const tieneInscripciones =
      inscripciones.recordset.length > 0;

    // ----------------------------------------------------------
    // No permitir modificar precios si ya existe una inscripción
    // ----------------------------------------------------------

    if (
      tieneInscripciones &&
      (
        body.precio !== undefined ||
        body.precio_matricula !== undefined
      )
    ) {
      throw new BadRequestException(
        'No se puede modificar el precio del curso ni el precio de matrícula porque ya existen inscripciones asociadas al curso.',
      );
    }

    // ----------------------------------------------------------
    // Construir actualización dinámica
    // ----------------------------------------------------------

    const campos: string[] = [];

    const request = pool.request();

    request.input('id', sql.Int, id);

    // ----------------------------------------------------------
    // Nombre
    // ----------------------------------------------------------

    if (body.nombre_curso !== undefined) {
      campos.push('nombre_curso = @nombre_curso');

      request.input(
        'nombre_curso',
        sql.VarChar(150),
        body.nombre_curso,
      );
    }

    // ----------------------------------------------------------
    // Descripción
    // ----------------------------------------------------------

    if (body.descripcion !== undefined) {
      campos.push('descripcion = @descripcion');

      request.input(
        'descripcion',
        sql.VarChar(sql.Max),
        body.descripcion,
      );
    }

    // ----------------------------------------------------------
    // Precio total del curso
    // ----------------------------------------------------------

    if (body.precio !== undefined) {
      campos.push('precio = @precio');

      request.input(
        'precio',
        sql.Numeric(10, 2),
        body.precio,
      );
    }

    // ----------------------------------------------------------
    // Precio de matrícula
    // ----------------------------------------------------------

    if (body.precio_matricula !== undefined) {
      campos.push(
        'precio_matricula = @precio_matricula',
      );

      request.input(
        'precio_matricula',
        sql.Numeric(10, 2),
        body.precio_matricula,
      );
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
      UPDATE curso
      SET ${campos.join(', ')}
      WHERE id_curso = @id
    `);

    // ----------------------------------------------------------
    // Obtener curso actualizado
    // ----------------------------------------------------------

    const actualizado = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT *
        FROM curso
        WHERE id_curso = @id
      `);

    if (actualizado.recordset.length === 0) {
      throw new NotFoundException(
        `El curso con id ${id} no fue encontrado.`,
      );
    }

    return actualizado.recordset[0];
  }

  // ============================================================
  // CANCELAR CURSO
  // ============================================================

  async deleteCurso(id: number) {
    const pool = this.databaseService.getPool();

    const existente = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          id_curso,
          estado
        FROM curso
        WHERE id_curso = @id
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El curso con id ${id} no fue encontrado.`,
      );
    }

    const curso = existente.recordset[0];

    if (curso.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede cancelar un curso que no está activo.',
      );
    }

    await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE curso
        SET estado = 'CANCELADO'
        WHERE id_curso = @id
      `);

    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT *
        FROM curso
        WHERE id_curso = @id
      `);

    return result.recordset[0];
  }
}