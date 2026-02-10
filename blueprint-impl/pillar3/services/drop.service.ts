import { P3Drop } from "../contracts/pillar3.contracts";

export function createDrop(input: Omit<P3Drop,"dropId"|"createdAt"|"qtyRemaining">): P3Drop {
  const dropId = "drop_" + Math.random().toString(36).slice(2);
  const createdAt = new Date().toISOString();
  return { ...input, dropId, createdAt, qtyRemaining: input.qtyTotal };
}
