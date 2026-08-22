import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CursoModule } from './curso/curso.module';
import { GrupoModule } from './grupo/grupo.module';
import { HorarioClaseModule } from './horario-clase/horario-clase.module';
import { EstudianteModule } from './estudiante/estudiante.module';
import { ProfesorModule } from './profesor/profesor.module';
import { AsignacionProfesorModule } from './asignacion-profesor/asignacion-profesor.module';
import { InscripcionModule } from './inscripcion/inscripcion.module';
import { SesionClaseModule } from './sesion-clase/sesion-clase.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { EvaluacionModule } from './evaluacion/evaluacion.module';
import { ResultadoEvaluacionModule } from './resultado-evaluacion/resultado-evaluacion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,    
    CursoModule, GrupoModule, HorarioClaseModule, EstudianteModule, ProfesorModule, AsignacionProfesorModule, InscripcionModule, SesionClaseModule, AsistenciaModule, EvaluacionModule, ResultadoEvaluacionModule,
  ]  
})
export class AppModule {}
