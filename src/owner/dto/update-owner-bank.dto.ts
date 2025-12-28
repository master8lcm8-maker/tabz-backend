// src/owner/dto/update-owner-bank.dto.ts

// Simple DTO, no class-validator to avoid extra deps
export class UpdateOwnerBankDto {
  bankName?: string;
  last4?: string;
}
