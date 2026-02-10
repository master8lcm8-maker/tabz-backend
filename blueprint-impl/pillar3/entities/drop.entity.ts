/**
 * Planned DB entity (Slice A)
 * No TypeORM decorators to avoid wiring pressure.
 */
export type DropEntity = {
  id: string;
  venueId: string;
  createdByUserId: string;
  title: string;
  qtyTotal: number;
  qtyRemaining: number;
  createdAt: string;
  expiresAt: string | null;
  cooldownSeconds: number;
};
