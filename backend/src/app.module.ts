import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CursoModule } from './curso/curso.module';
import { GrupoModule } from './grupo/grupo.module';
import { HorarioClaseModule } from './horario-clase/horario-clase.module';
import { EstudianteModule } from './estudiante/estudiante.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,    
    CursoModule, GrupoModule, HorarioClaseModule, EstudianteModule,
  ]  
})
export class AppModule {}
