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

  async getGrupos() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
            SELECT *
            FROM grupo
            WHERE estado = 'ACTIVO'
        `);

    return result.recordset;
  }

  async getGrupo(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
                SELECT *
                FROM grupo
                WHERE id_grupo = @id
            `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    return result.recordset[0];
  }

  async createGrupo(grupo: CreateGrupoDto) {
    const pool = this.databaseService.getPool();

    const curso = await pool.request().input('id_curso', grupo.id_curso).query(`
                SELECT estado
                FROM curso
                WHERE id_curso = @id_curso
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

    const result = await pool
      .request()
      .input('id_curso', grupo.id_curso)
      .input('nombre_grupo', grupo.nombre_grupo)
      .input('fecha_inicio', grupo.fecha_inicio).query(`
                INSERT INTO grupo (
                    id_curso,
                    nombre_grupo,
                    fecha_inicio
                )
                VALUES (
                    @id_curso,
                    @nombre_grupo,
                    @fecha_inicio
                );

                SELECT *
                FROM grupo
                WHERE id_grupo = SCOPE_IDENTITY();
            `);

    return result.recordset[0];
  }

  async updateGrupo(id: number, grupo: UpdateGrupoDto) {
    const pool = this.databaseService.getPool();

    const existente = await pool.request().input('id', id).query(`
                SELECT estado
                FROM grupo
                WHERE id_grupo = @id
            `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    if (existente.recordset[0].estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se puede modificar un grupo que no está activo.',
      );
    }

    await pool
      .request()
      .input('id', id)
      .input('nombre_grupo', grupo.nombre_grupo).query(`
                UPDATE grupo
                SET nombre_grupo = @nombre_grupo
                WHERE id_grupo = @id
            `);

    const result = await pool.request().input('id', id).query(`
                SELECT *
                FROM grupo
                WHERE id_grupo = @id
            `);

    return result.recordset[0];
  }

  async deleteGrupo(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
                SELECT *
                FROM grupo
                WHERE id_grupo = @id
            `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    const grupo = result.recordset[0];

    if (grupo.estado !== 'ACTIVO') {
      throw new BadRequestException('El grupo ya no se encuentra activo.');
    }

    await pool.request().input('id', id).query(`
                UPDATE grupo
                SET estado = 'CANCELADO'
                WHERE id_grupo = @id
            `);

    await this.actualizarEstadoCurso(grupo.id_curso);

    return {
      mensaje: 'Grupo cancelado correctamente.',
    };
  }

  async finalizarGrupo(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id', id).query(`
      SELECT *
      FROM grupo
      WHERE id_grupo = @id
    `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(`El grupo con id ${id} no fue encontrado.`);
    }

    const grupo = result.recordset[0];

    if (grupo.estado !== 'ACTIVO') {
      throw new BadRequestException('El grupo ya no se encuentra activo.');
    }

    // ============================================================
    // FINALIZAR GRUPO
    // ============================================================

    await pool.request().input('id', id).query(`
      UPDATE grupo
      SET estado = 'FINALIZADO'
      WHERE id_grupo = @id
    `);

    // ============================================================
    // FINALIZAR INSCRIPCIONES ACTIVAS
    // ============================================================

    await pool.request().input('id_grupo', id).query(`
      UPDATE inscripcion
      SET estado_inscripcion = 'FINALIZADA'
      WHERE id_grupo = @id_grupo
      AND estado_inscripcion = 'ACTIVA'
    `);

    // ============================================================
    // CANCELAR SESIONES PROGRAMADAS
    // ============================================================

    await pool.request().input('id_grupo', id).query(`
      UPDATE sesion_clase
      SET estado_sesion = 'CANCELADA'
      WHERE id_grupo = @id_grupo
      AND estado_sesion = 'PROGRAMADA'
    `);

    // ============================================================
    // ACTUALIZAR ESTADO DEL CURSO
    // ============================================================

    await this.actualizarEstadoCurso(grupo.id_curso);

    return {
      mensaje: 'Grupo finalizado correctamente.',
    };
  }

  private async actualizarEstadoCurso(idCurso: number) {
    const pool = this.databaseService.getPool();

    const result = await pool.request().input('id_curso', idCurso).query(`
                SELECT estado
                FROM grupo
                WHERE id_curso = @id_curso
            `);

    const grupos = result.recordset;

    const hayActivos = grupos.some((grupo) => grupo.estado === 'ACTIVO');

    if (hayActivos) {
      return;
    }

    const hayFinalizados = grupos.some(
      (grupo) => grupo.estado === 'FINALIZADO',
    );

    const nuevoEstado = hayFinalizados ? 'FINALIZADO' : 'CANCELADO';

    await pool.request().input('id_curso', idCurso).input('estado', nuevoEstado)
      .query(`
                UPDATE curso
                SET estado = @estado
                WHERE id_curso = @id_curso
            `);
  }
}
