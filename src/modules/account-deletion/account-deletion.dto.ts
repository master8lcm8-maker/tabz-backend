export class AccountDeletionRequestDto {
  reason?: string;
}

export class AccountDeletionConfirmDto {
  token!: string;
}
