import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private pool: sql.ConnectionPool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.pool = await sql.connect({
      server: this.configService.get<string>('DB_SERVER'),
      database: this.configService.get<string>('DB_DATABASE'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      port: Number(this.configService.get<string>('DB_PORT')),
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });

    console.log('Conectado');
  }  

  getPool(): sql.ConnectionPool {
    return this.pool;
  }
}