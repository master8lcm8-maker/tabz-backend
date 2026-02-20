import 'reflect-metadata';
import { DataSource } from 'typeorm';

const root = __dirname.replace(/\\/g, '/');

export default new DataSource({
  type: 'sqlite',
  database: 'tabz-dev.sqlite',
  entities: [
    root + '/**/*.entity.ts',
    root + '/**/*.entity.js',
  ],
  migrations: [
    root + '/migrations/*.ts',
    root + '/migrations/*.js',
  ],
  synchronize: false,
});
