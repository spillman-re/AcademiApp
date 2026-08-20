import { PartialType } from '@nestjs/mapped-types';

import { CreateSesionClaseDto } from './create-sesion-clase.dto';

export class UpdateSesionClaseDto extends PartialType(
  CreateSesionClaseDto,
) {}