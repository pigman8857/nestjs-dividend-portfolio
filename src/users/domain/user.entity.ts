export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public cashBalanceCents: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  canAfford(amountCents: number): boolean {
    return this.cashBalanceCents >= amountCents;
  }
}
