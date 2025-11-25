import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getUsers() {
    // Temporary fake data
    return [
      { id: 1, email: 'test@example.com' },
      { id: 2, email: 'second@example.com' },
    ];
  }
}
