import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupBuyerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}