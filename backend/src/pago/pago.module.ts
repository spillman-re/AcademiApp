import { Module } from '@nestjs/common';
import { PagoController } from './pago.controller';
import { PagoService } from './pago.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PagoController],
  providers: [PagoService],
  exports: [PagoService],
})
export class PagoModule {}
