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
   * Base create method – can accept a plain password and will hash it.
   *
   * IMPORTANT:
   *  - Your DB requires staff.venueId NOT NULL
   *  - Many projects use a relation field `venue` instead of a raw `venueId`
   *  - So here we attach `venue: { id: venueId }` so TypeORM fills the FK.
   */
  async create(
    data: Partial<Staff> & { password?: string; venueId?: number },
  ): Promise<Staff> {
    const venueId = data.venueId ?? 1; // default to venue 1 (e.g. Club TABZ)

    // Build a base object for the entity
    const base: any = {
      ...data,
    };

    // Ensure relation is set so "venueId" column is NOT null
    if (!base.venue) {
      base.venue = { id: venueId };
    }

    const staff = this.staffRepository.create(base);

    // Handle password hashing if a plain password was provided
    if (data.password) {
      const hash = await bcrypt.hash(data.password, 10);
      (staff as any).passwordHash = hash;
      // avoid accidentally persisting plain password if the entity has that field
      if ('password' in (staff as any)) {
        delete (staff as any).password;
      }
    }

    return this.staffRepository.save(staff);
  }

  /**
   * Alias used by StaffAdminController.
   * Controller calls: this.staffService.createStaff(...)
   */
  async createStaff(
    data: Partial<Staff> & { password?: string; venueId?: number },
  ): Promise<Staff> {
    return this.create(data);
  }

  // Get all staff (admin/debug)
  async findAll(): Promise<Staff[]> {
    return this.staffRepository.find();
  }

  // Find a single staff member by id
  async findById(id: number): Promise<Staff | null> {
    return this.staffRepository.findOne({ where: { id } });
  }

  // Find by email (helper)
  async findByEmail(email: string): Promise<Staff | null> {
    return this.staffRepository.findOne({ where: { email } });
  }

  /**
   * Used by StaffAuthService for login.
   * Returns the staff user on success, or null on failure.
   */
  async validLogin(
    email: string,
    password: string,
  ): Promise<Staff | null> {
    const staff = await this.findByEmail(email);
    if (!staff) {
      return null;
    }

    const anyStaff = staff as any;

    // Try passwordHash first, then password (depending on your entity fields)
    const hashed =
      anyStaff.passwordHash ??
      anyStaff.password ??
      null;

    if (!hashed) {
      return null;
    }

    const ok = await bcrypt.compare(password, hashed);
    if (!ok) {
      return null;
    }

    return staff;
  }
}
