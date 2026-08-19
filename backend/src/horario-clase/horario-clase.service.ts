import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';

import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import * as sql from 'mssql'

@Injectable()
export class HorarioClaseService {
    constructor( private readonly databaseService: DatabaseService) {}

    async getHorariosPorGrupo(idGrupo: number) {
        const pool = this.databaseService.getPool();

        const result = await pool.request()
            .input('id_grupo', idGrupo)
            .query(`
                SELECT *
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
    async getHorario(id: number) {
        const pool = this.databaseService.getPool();

        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT *
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

    async createHorario(idGrupo: number, horario: CreateHorarioDto) {
        const pool = this.databaseService.getPool();

        // Comprobamos primero el estado para q no se asigne un horario
        // a un grupo que no está activo.
        const grupo = await pool.request()
            .input('id_grupo', idGrupo)
            .query(`
                SELECT estado
                FROM grupo
                WHERE id_grupo = @id_grupo
            `);

        if (grupo.recordset.length === 0) {
            throw new NotFoundException(
                `El grupo con id ${idGrupo} no fue encontrado.`,
            );
        }

        if (grupo.recordset[0].estado !== 'ACTIVO') {
            throw new BadRequestException(
                'No se puede crear un horario para un grupo que no está activo.',
            );
        }

        //Comprobamos que el horario no choque o se solape con el resto de horarios del grupo
        //Supongamos LUNES 08:00 - 11:00 y queremos LUNES 10:00 - 12:00, Hay un conflicto.
        //Pero si LUNES 11:00 - 13:00 si permite porq no hay solapamiento.

        //      08:00 ───── 11:00
        //                   11:00 ───── 13:00

        const conflicto = await pool.request()
            .input('id_grupo', idGrupo)
            .input('dia_semana', horario.dia_semana)
            .input('hora_inicio', horario.hora_inicio)
            .input('hora_fin', horario.hora_fin)
            .query(`
                SELECT id_horario
                FROM horario_clase
                WHERE id_grupo = @id_grupo
                AND dia_semana = @dia_semana
                AND hora_inicio < @hora_fin
                AND hora_fin > @hora_inicio
            `);

        if (conflicto.recordset.length > 0) {
            throw new BadRequestException(
                'El horario se solapa con otro horario del mismo grupo.',
            );
        }

        //Ahora si insertamos
        const result = await pool.request()
            .input('id_grupo', idGrupo)
            .input('dia_semana', horario.dia_semana)
            .input('hora_inicio', horario.hora_inicio)
            .input('hora_fin', horario.hora_fin)
            .query(`
                INSERT INTO horario_clase (
                    id_grupo,
                    dia_semana,
                    hora_inicio,
                    hora_fin
                )
                VALUES (
                    @id_grupo,
                    @dia_semana,
                    @hora_inicio,
                    @hora_fin
                );

                SELECT *
                FROM horario_clase
                WHERE id_horario = SCOPE_IDENTITY();
            `);

        return result.recordset[0];        
    }        


    async updateHorario(id: number, horario: UpdateHorarioDto) {
        const pool = this.databaseService.getPool();

        const existente = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    h.id_horario,
                    h.id_grupo,
                    h.dia_semana,
                    CONVERT(VARCHAR(5), h.hora_inicio, 108) AS hora_inicio,
                    CONVERT(VARCHAR(5), h.hora_fin, 108) AS hora_fin,
                    g.estado AS estado_grupo
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

        if (horarioActual.estado_grupo !== 'ACTIVO') {
            throw new BadRequestException(
                'No se puede modificar un horario cuyo grupo no está activo.',
            );
        }

        const diaSemana =
            horario.dia_semana ?? horarioActual.dia_semana;

        const horaInicio =
            horario.hora_inicio ?? horarioActual.hora_inicio;

        const horaFin =
            horario.hora_fin ?? horarioActual.hora_fin;

        // Buscar solapamientos
        const conflicto = await pool.request()
            .input('id', sql.Int, id)
            .input('id_grupo', sql.Int, horarioActual.id_grupo)
            .input('dia_semana', sql.VarChar(20), diaSemana)
            .input('hora_inicio', sql.VarChar(5), horaInicio)
            .input('hora_fin', sql.VarChar(5), horaFin)
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

        // Actualizar
        await pool.request()
            .input('id', sql.Int, id)
            .input('dia_semana', sql.VarChar(20), diaSemana)
            .input('hora_inicio', sql.VarChar(5), horaInicio)
            .input('hora_fin', sql.VarChar(5), horaFin)
            .query(`
                UPDATE horario_clase
                SET
                    dia_semana = @dia_semana,
                    hora_inicio = CAST(@hora_inicio AS TIME),
                    hora_fin = CAST(@hora_fin AS TIME)
                WHERE id_horario = @id
            `);

        // Obtener resultado actualizado
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT *
                FROM horario_clase
                WHERE id_horario = @id
            `);

        return result.recordset[0];
    }

    //Se hace un delete fisico porq horario clase no representa un historial academico por si mismo.
    //El historial importante esta en sesion_clase
    async deleteHorario(id: number) {
        const pool = this.databaseService.getPool();

        const existente = await pool.request()
            .input('id', id)
            .query(`
                SELECT
                    h.id_horario,
                    g.estado AS estado_grupo
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

        if (existente.recordset[0].estado_grupo !== 'ACTIVO') {
            throw new BadRequestException(
                'No se puede eliminar un horario cuyo grupo no está activo.',
            );
        }

        //verificamos que el horario no tenga referencias en sesiones
        const sesiones = await pool.request()
            .input('id_horario', id)
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

        await pool.request()
            .input('id', id)
            .query(`
                DELETE FROM horario_clase
                WHERE id_horario = @id
            `);

        return {
            mensaje: 'Horario eliminado correctamente.',
        };
    }

    //Para manejar time
    private formatearHora(hora: any): string {
        if (hora instanceof Date) {
            return hora.toTimeString().slice(0, 5);
        }

        return String(hora).slice(0, 5);
    }
}        
