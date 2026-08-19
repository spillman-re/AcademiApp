import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateAsignacionProfesorDto } from './dto/create-asignacion-profesor.dto';

@Injectable()
export class AsignacionProfesorService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAsignaciones() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
            SELECT *
            FROM asignacion_profesor
        `);

    return result.recordset;
  }

  async getAsignacion(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
                SELECT *
                FROM asignacion_profesor
                WHERE id_asignacion = @id
            `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `La asignación con id ${id} no fue encontrada.`,
      );
    }

    return result.recordset[0];
  }

  async createAsignacion(asignacion: CreateAsignacionProfesorDto) {
    const pool = this.databaseService.getPool();

    // Verificar profesor
    const profesor = await pool
      .request()
      .input('id_profesor', asignacion.id_profesor).query(`
                SELECT id_profesor, estado
                FROM profesor
                WHERE id_profesor = @id_profesor
            `);

    if (profesor.recordset.length === 0) {
      throw new NotFoundException(
        `El profesor con id ${asignacion.id_profesor} no fue encontrado.`,
      );
    }

    if (profesor.recordset[0].estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede asignar un profesor que no está activo.',
      );
    }

    // Verificar grupo
    const grupo = await pool.request().input('id_grupo', asignacion.id_grupo)
      .query(`
                SELECT id_grupo, estado
                FROM grupo
                WHERE id_grupo = @id_grupo
            `);

    if (grupo.recordset.length === 0) {
      throw new NotFoundException(
        `El grupo con id ${asignacion.id_grupo} no fue encontrado.`,
      );
    }

    if (grupo.recordset[0].estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede asignar un profesor a un grupo que no está activo.',
      );
    }

    // Verificar que no exista la asignación
    const existente = await pool
      .request()
      .input('id_profesor', asignacion.id_profesor)
      .input('id_grupo', asignacion.id_grupo).query(`
                SELECT id_asignacion
                FROM asignacion_profesor
                WHERE id_profesor = @id_profesor
                AND id_grupo = @id_grupo
            `);

    if (existente.recordset.length > 0) {
      throw new BadRequestException(
        'El profesor ya está asignado a este grupo.',
      );
    }

    // Crear asignación
    const result = await pool
      .request()
      .input('id_profesor', asignacion.id_profesor)
      .input('id_grupo', asignacion.id_grupo).query(`
                INSERT INTO asignacion_profesor (
                    id_profesor,
                    id_grupo
                )
                OUTPUT INSERTED.*
                VALUES (
                    @id_profesor,
                    @id_grupo
                );
            `);

    return result.recordset[0];
  }

  async deleteAsignacion(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
            DELETE FROM asignacion_profesor
            WHERE id_asignacion = @id
        `);

    if (result.rowsAffected[0] === 0) {
      throw new NotFoundException(
        `La asignación con id ${id} no fue encontrada.`,
      );
    }

    return {
      message: 'Asignación eliminada correctamente.',
    };
  }
}
