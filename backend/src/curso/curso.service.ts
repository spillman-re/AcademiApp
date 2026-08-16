import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as sql from 'mssql'
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';

@Injectable()
export class CursoService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getCursos() {
        const pool = this.databaseService.getPool();

        const result = await pool.request().query(`
            SELECT * FROM curso    
        `);

        return result.recordset;
    }
    
    async getCurso(id: number) {
        const pool = this.databaseService.getPool();

        const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`SELECT * FROM curso WHERE id_curso = @id`)

        if(result.recordset.length === 0) {
            throw new NotFoundException(`El curso con id ${id} no fue encontrado.`);
        }

        return result.recordset[0];
    }

    async createCurso(curso: CreateCursoDto) {
        const pool = this.databaseService.getPool();

        const result = await pool.request()
        .input("nombre_curso", sql.VarChar(150), curso.nombre_curso)
        .input("descripcion", sql.VarChar(sql.Max), curso.descripcion)
        .input("duracion", sql.VarChar(100), curso.duracion)
        .input("precio", sql.Numeric(10,2), curso.precio)
        .query(`
            INSERT INTO curso (
                nombre_curso,
                descripcion,
                duracion,
                precio
            )
            VALUES(
                @nombre_curso,
                @descripcion,
                @duracion,
                @precio
            )    

            SELECT * FROM curso
            WHERE id_curso = SCOPE_IDENTITY();
        `)

        return result.recordset[0];
    }

    async updateCurso(id: number, body: UpdateCursoDto) {
        const pool = this.databaseService.getPool();

        const campos: string[] = [];
        const result = pool.request();

        result.input('id', id);

        if (body.nombre_curso !== undefined) {
            campos.push('nombre_curso = @nombre_curso');
            result.input('nombre_curso', body.nombre_curso);
        }

        if (body.descripcion !== undefined) {
            campos.push('descripcion = @descripcion');
            result.input('descripcion', body.descripcion);
        }

        if (body.duracion !== undefined) {
            campos.push('duracion = @duracion');
            result.input('duracion', body.duracion);
        }

        if (body.precio !== undefined) {
            campos.push('precio = @precio');
            result.input('precio', body.precio);
        }

        if (campos.length === 0) {
            return {
                mensaje: 'No se proporcionaron datos para actualizar'
            };
        }

        const query = `
            UPDATE curso
            SET ${campos.join(', ')}
            WHERE id_curso = @id
        `;

        const resultQuery = await result.query(query);

        if(resultQuery.rowsAffected[0] === 0) {
            throw new NotFoundException(
                `El curso con id ${id} no fue encontrado.`
            );
        }

        return {
            mensaje: 'Curso Actualizado correctamente'
        };
    }     
    
    async deleteCurso(id: number){
        const pool = this.databaseService.getPool();

        const result = await pool.request()
        .input('id', id)        
        .query(`
            UPDATE curso
            SET estado = 'CANCELADO'
            WHERE id_curso = @id    
        `)

        if (result.rowsAffected[0] === 0) {
            throw new NotFoundException(
                `El curso con id ${id} no fue encontrado.`
        )   ;
        }

        return {
            message: "Curso Eliminado Correctamente."
        }
    }
}
