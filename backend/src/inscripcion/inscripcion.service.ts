import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from './dto/update-inscripcion.dto';

@Injectable()
export class InscripcionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getInscripciones() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT *
      FROM inscripcion
    `);

    return result.recordset;
  }

  async getInscripcion(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT *
        FROM inscripcion
        WHERE id_inscripcion = @id
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `La inscripción con id ${id} no fue encontrada.`,
      );
    }

    return result.recordset[0];
  }

  async createInscripcion(inscripcion: CreateInscripcionDto) {
    const pool = this.databaseService.getPool();

    // Verificar estudiante
    const estudiante = await pool
      .request()
      .input('id_estudiante', inscripcion.id_estudiante)
      .query(`
        SELECT id_estudiante, estado
        FROM estudiante
        WHERE id_estudiante = @id_estudiante
      `);

    if (estudiante.recordset.length === 0) {
      throw new NotFoundException(
        `El estudiante con id ${inscripcion.id_estudiante} no fue encontrado.`,
      );
    }

    if (estudiante.recordset[0].estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede inscribir un estudiante que no está activo.',
      );
    }

    // Verificar grupo
    const grupo = await pool
      .request()
      .input('id_grupo', inscripcion.id_grupo)
      .query(`
        SELECT id_grupo, estado
        FROM grupo
        WHERE id_grupo = @id_grupo
      `);

    if (grupo.recordset.length === 0) {
      throw new NotFoundException(
        `El grupo con id ${inscripcion.id_grupo} no fue encontrado.`,
      );
    }

    if (grupo.recordset[0].estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede inscribir un estudiante en un grupo que no está activo.',
      );
    }

    // Verificar inscripción activa duplicada
    const existente = await pool
      .request()
      .input('id_estudiante', inscripcion.id_estudiante)
      .input('id_grupo', inscripcion.id_grupo)
      .query(`
        SELECT id_inscripcion
        FROM inscripcion
        WHERE id_estudiante = @id_estudiante
        AND id_grupo = @id_grupo
        AND estado_inscripcion = 'ACTIVA'
      `);

    if (existente.recordset.length > 0) {
      throw new BadRequestException(
        'El estudiante ya está inscrito en este grupo.',
      );
    }

    // Crear inscripción
    const result = await pool
      .request()
      .input('id_estudiante', inscripcion.id_estudiante)
      .input('id_grupo', inscripcion.id_grupo)
      .input('observacion', inscripcion.observacion ?? null)
      .query(`
        INSERT INTO inscripcion (
          id_estudiante,
          id_grupo,
          observacion
        )
        OUTPUT INSERTED.*
        VALUES (
          @id_estudiante,
          @id_grupo,
          @observacion
        );
      `);

    return result.recordset[0];
  }

  async updateInscripcion(
    id: number,
    inscripcion: UpdateInscripcionDto,
  ) {
    const pool = this.databaseService.getPool();

    // Verificar que la inscripción existe
    const existente = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT *
        FROM inscripcion
        WHERE id_inscripcion = @id
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `La inscripción con id ${id} no fue encontrada.`,
      );
    }

    // Solo se pueden modificar inscripciones activas
    if (existente.recordset[0].estado_inscripcion !== 'ACTIVA') {
      throw new BadRequestException(
        'No se puede modificar una inscripción que ya fue finalizada o cancelada.',
      );
    }

    // Actualizar inscripción
    await pool
      .request()
      .input('id', id)
      .input('observacion', inscripcion.observacion ?? null)
      .query(`
        UPDATE inscripcion
        SET observacion = @observacion
        WHERE id_inscripcion = @id
      `);

    // Obtener inscripción actualizada
    const actualizado = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT *
        FROM inscripcion
        WHERE id_inscripcion = @id
      `);

    return actualizado.recordset[0];
  }

  async deleteInscripcion(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id', id)
      .query(`
        UPDATE inscripcion
        SET estado_inscripcion = 'CANCELADA'
        OUTPUT INSERTED.*
        WHERE id_inscripcion = @id
        AND estado_inscripcion = 'ACTIVA'
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `La inscripción con id ${id} no fue encontrada o ya no está activa.`,
      );
    }

    return result.recordset[0];
  }
}