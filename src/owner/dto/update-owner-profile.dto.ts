// src/owner/dto/update-owner-profile.dto.ts

// NOTE: No class-validator here, to avoid extra dependency.
// This is just a plain TypeScript DTO shape for now.

export class UpdateOwnerProfileDto {
  venueName?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
}
