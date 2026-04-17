import { IsEmail, IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'Username só pode conter letras, números, _ e .' })
  username: string;

  @IsOptional()
  @IsString()
  name?: string;
}
