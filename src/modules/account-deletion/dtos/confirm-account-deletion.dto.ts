import { IsOptional, IsString, MaxLength } from "class-validator";

export class ConfirmAccountDeletionDto {
  // Require password confirmation for irreversible action (prevents accidental deletion)
  @IsString()
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}