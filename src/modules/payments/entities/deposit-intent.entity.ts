import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export type DepositIntentStatus =
  | "created"
  | "processing"
  | "succeeded"
  | "failed";

@Entity("deposit_intents")
export class DepositIntent {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  amountCents: number;

  @Column()
  currency: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string | null;

  @Column({
    type: "varchar",
    default: "created",
  })
  status: DepositIntentStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
