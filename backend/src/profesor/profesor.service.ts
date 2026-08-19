import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateProfesorDto } from './dto/create-profesor.dto';
import { UpdateProfesorDto } from './dto/update-profesor.dto';

@Injectable()
export class ProfesorService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getProfesores() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
            SELECT *
            FROM profesor
            WHERE estado = 'ACTIVO'
        `);

    return result.recordset;
  }

  async getProfesor(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
                SELECT *
                FROM profesor
                WHERE id_profesor = @id
            `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `El profesor con id ${id} no fue encontrado.`,
      );
    }

    return result.recordset[0];
  }

  async createProfesor(profesor: CreateProfesorDto) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('nombres', profesor.nombres)
      .input('apellidos', profesor.apellidos)
      .input('telefono', profesor.telefono ?? null)
      .input('especialidad', profesor.especialidad ?? null).query(`
                INSERT INTO profesor (
                    nombres,
                    apellidos,
                    telefono,
                    especialidad
                )
                OUTPUT INSERTED.*
                VALUES (
                    @nombres,
                    @apellidos,
                    @telefono,
                    @especialidad
                );
            `);

    return result.recordset[0];
  }

  async updateProfesor(id: number, profesor: UpdateProfesorDto) {
    const pool = this.databaseService.getPool();

    const campos: string[] = [];
    const request = pool.request();

    request.input('id', id);

    if (profesor.nombres !== undefined) {
      campos.push('nombres = @nombres');
      request.input('nombres', profesor.nombres);
    }

    if (profesor.apellidos !== undefined) {
      campos.push('apellidos = @apellidos');
      request.input('apellidos', profesor.apellidos);
    }

    if (profesor.telefono !== undefined) {
      campos.push('telefono = @telefono');
      request.input('telefono', profesor.telefono);
    }

    if (profesor.especialidad !== undefined) {
      campos.push('especialidad = @especialidad');
      request.input('especialidad', profesor.especialidad);
    }

    if (campos.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron datos para actualizar.',
      );
    }

    const result = await request.query(`
        UPDATE profesor
        SET ${campos.join(', ')}
        WHERE id_profesor = @id
    `);

    if (result.rowsAffected[0] === 0) {
      throw new NotFoundException(
        `El profesor con id ${id} no fue encontrado.`,
      );
    }

    const actualizado = await pool.request().input('id', id).query(`
            SELECT *
            FROM profesor
            WHERE id_profesor = @id
        `);

    return actualizado.recordset[0];
  }

  async deleteProfesor(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
            UPDATE profesor
            SET estado = 'INACTIVO'
            WHERE id_profesor = @id
        `);

    if (result.rowsAffected[0] === 0) {
      throw new NotFoundException(
        `El profesor con id ${id} no fue encontrado.`,
      );
    }

    const actualizado = await pool.request().input('id', id).query(`
            SELECT *
            FROM profesor
            WHERE id_profesor = @id
        `);

    return actualizado.recordset[0];
  }
}
