import { IsInt, IsOptional } from 'class-validator';

export class UpdateScreenSlotDTO {
  @IsOptional()
  @IsInt()
  renderOrder?: number;

  @IsOptional()
  @IsInt()
  x?: number;

  @IsOptional()
  @IsInt()
  y?: number;

  @IsOptional()
  @IsInt()
  w?: number;

  @IsOptional()
  @IsInt()
  h?: number;

  @IsOptional()
  @IsInt()
  zIndex?: number;
}
