import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateCertificadoDto } from './dto/create-certificado.dto';
import { UpdateCertificadoDto } from './dto/update-certificado.dto';

@Injectable()
export class CertificadoService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  // ============================================================
  // OBTENER TODOS
  // ============================================================

  async getCertificados() {
    const pool = this.databaseService.getPool();

    const result = await pool.request().query(`
      SELECT
        c.*,
        i.id_estudiante,
        est.codigo_estudiante,
        est.nombres,
        est.apellidos,
        i.id_grupo,
        g.nombre_grupo,
        cu.id_curso,
        cu.nombre_curso
      FROM certificado c
      INNER JOIN inscripcion i
        ON c.id_inscripcion = i.id_inscripcion
      INNER JOIN estudiante est
        ON i.id_estudiante = est.id_estudiante
      INNER JOIN grupo g
        ON i.id_grupo = g.id_grupo
      INNER JOIN curso cu
        ON g.id_curso = cu.id_curso
      ORDER BY
        c.fecha_emision DESC,
        est.apellidos,
        est.nombres;
    `);

    return result.recordset;
  }

  // ============================================================
  // OBTENER UNO
  // ============================================================

  async getCertificado(id: number) {
    const pool = this.databaseService.getPool();

    const result = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT
          c.*,
          i.id_estudiante,
          est.codigo_estudiante,
          est.nombres,
          est.apellidos,
          i.id_grupo,
          g.nombre_grupo,
          cu.id_curso,
          cu.nombre_curso
        FROM certificado c
        INNER JOIN inscripcion i
          ON c.id_inscripcion = i.id_inscripcion
        INNER JOIN estudiante est
          ON i.id_estudiante = est.id_estudiante
        INNER JOIN grupo g
          ON i.id_grupo = g.id_grupo
        INNER JOIN curso cu
          ON g.id_curso = cu.id_curso
        WHERE c.id_certificado = @id;
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundException(
        `El certificado con id ${id} no fue encontrado.`,
      );
    }

    return result.recordset[0];
  }

  // ============================================================
  // EMITIR CERTIFICADO
  // ============================================================

  async createCertificado(data: CreateCertificadoDto) {
    const pool = this.databaseService.getPool();

    // ==========================================================
    // 1. VERIFICAR INSCRIPCIÓN
    // ==========================================================

    const inscripcion = await pool
      .request()
      .input('id_inscripcion', data.id_inscripcion)
      .query(`
        SELECT
          id_inscripcion,
          id_estudiante,
          id_grupo,
          estado_inscripcion
        FROM inscripcion
        WHERE id_inscripcion = @id_inscripcion;
      `);

    if (inscripcion.recordset.length === 0) {
      throw new NotFoundException(
        `La inscripción ${data.id_inscripcion} no fue encontrada.`,
      );
    }

    const actual = inscripcion.recordset[0];

    // ==========================================================
    // 2. VALIDAR ESTADO DE LA INSCRIPCIÓN
    // ==========================================================

    if (actual.estado_inscripcion === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede emitir un certificado para una inscripción cancelada.',
      );
    }

    // ==========================================================
    // 3. VERIFICAR SI YA EXISTE CERTIFICADO
    // ==========================================================

    const certificadoExistente = await pool
      .request()
      .input('id_inscripcion', data.id_inscripcion)
      .query(`
        SELECT
          id_certificado,
          estado
        FROM certificado
        WHERE id_inscripcion = @id_inscripcion;
      `);

    if (certificadoExistente.recordset.length > 0) {
      throw new BadRequestException(
        `La inscripción ${data.id_inscripcion} ya tiene un certificado.`,
      );
    }

    // ==========================================================
    // 4. VERIFICAR CÓDIGO DE CERTIFICADO
    // ==========================================================

    const codigoExistente = await pool
      .request()
      .input('codigo_certificado', data.codigo_certificado)
      .query(`
        SELECT id_certificado
        FROM certificado
        WHERE codigo_certificado = @codigo_certificado;
      `);

    if (codigoExistente.recordset.length > 0) {
      throw new BadRequestException(
        `El código de certificado ${data.codigo_certificado} ya existe.`,
      );
    }

    // ==========================================================
    // 5. CREAR CERTIFICADO
    // ==========================================================

    const result = await pool
      .request()
      .input('id_inscripcion', data.id_inscripcion)
      .input('fecha_emision', data.fecha_emision)
      .input('codigo_certificado', data.codigo_certificado)
      .input('estado', 'EMITIDO')
      .query(`
        INSERT INTO certificado (
          id_inscripcion,
          fecha_emision,
          codigo_certificado,
          estado
        )
        OUTPUT INSERTED.*
        VALUES (
          @id_inscripcion,
          @fecha_emision,
          @codigo_certificado,
          @estado
        );
      `);

    return result.recordset[0];
  }

  // ============================================================
  // ACTUALIZAR ESTADO
  // ============================================================

  async updateCertificado(
    id: number,
    data: UpdateCertificadoDto,
  ) {
    const pool = this.databaseService.getPool();

    // ==========================================================
    // 1. VERIFICAR CERTIFICADO
    // ==========================================================

    const existente = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT
          id_certificado,
          estado
        FROM certificado
        WHERE id_certificado = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El certificado con id ${id} no fue encontrado.`,
      );
    }

    // ==========================================================
    // 2. ACTUALIZAR
    // ==========================================================

    await pool
      .request()
      .input('id', id)
      .input('estado', data.estado)
      .query(`
        UPDATE certificado
        SET estado = @estado
        WHERE id_certificado = @id;
      `);

    // ==========================================================
    // 3. OBTENER CERTIFICADO ACTUALIZADO
    // ==========================================================

    const actualizado = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT
          c.*,
          i.id_estudiante,
          est.codigo_estudiante,
          est.nombres,
          est.apellidos,
          i.id_grupo,
          g.nombre_grupo,
          cu.id_curso,
          cu.nombre_curso
        FROM certificado c
        INNER JOIN inscripcion i
          ON c.id_inscripcion = i.id_inscripcion
        INNER JOIN estudiante est
          ON i.id_estudiante = est.id_estudiante
        INNER JOIN grupo g
          ON i.id_grupo = g.id_grupo
        INNER JOIN curso cu
          ON g.id_curso = cu.id_curso
        WHERE c.id_certificado = @id;
      `);

    return actualizado.recordset[0];
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async deleteCertificado(id: number) {
    const pool = this.databaseService.getPool();

    // ==========================================================
    // 1. VERIFICAR CERTIFICADO
    // ==========================================================

    const existente = await pool
      .request()
      .input('id', id)
      .query(`
        SELECT
          id_certificado,
          codigo_certificado
        FROM certificado
        WHERE id_certificado = @id;
      `);

    if (existente.recordset.length === 0) {
      throw new NotFoundException(
        `El certificado con id ${id} no fue encontrado.`,
      );
    }

    // ==========================================================
    // 2. ELIMINAR
    // ==========================================================

    await pool
      .request()
      .input('id', id)
      .query(`
        DELETE FROM certificado
        WHERE id_certificado = @id;
      `);

    return {
      mensaje: 'Certificado eliminado correctamente.',
      id_certificado: id,
    };
  }
}