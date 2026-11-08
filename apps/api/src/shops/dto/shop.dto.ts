import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MemberRole } from '@orderwise/prisma';

export class CreateShopDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;
}

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}
