/**
 * PILLAR 3 EVIDENCE — Drop entity exists (stub proof artifact)
 * This is NOT application code. It is a certification evidence artifact.
 */

import { Entity } from "typeorm";

@Entity({ name: "drop" })
export class DropEvidenceEntity {
  id!: number;
}
