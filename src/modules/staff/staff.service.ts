// src/modules/staff/staff.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Staff } from './staff.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  /**
   * Create a staff member with a plain password (hashed before save).
   */
  async createStaff(
    venueId: number,
    name: string,
    email: string,
    password: string,
  ): Promise<Staff> {
    const passwordHash = await bcrypt.hash(password, 10);

    const staff = this.staffRepository.create({
      venueId,
      name,
      email,
      passwordHash,
    });

    return this.staffRepository.save(staff);
  }

  async getStaffForVenue(venueId: number): Promise<Staff[]> {
    return this.staffRepository.find({
      where: { venueId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByEmail(email: string): Promise<Staff | null> {
    return this.staffRepository.findOne({
      where: { email },
    });
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<Staff | null> {
    const staff = await this.findByEmail(email);
    if (!staff || !staff.passwordHash) {
      return null;
    }

    const ok = await bcrypt.compare(password, staff.passwordHash);
    if (!ok) {
      return null;
    }

    return staff;
  }
}
