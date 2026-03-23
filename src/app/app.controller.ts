import { BadRequestException, Controller, ForbiddenException, Get, Headers } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // Friendly root route so the domain doesn't look "broken"
  @Get('/')
  root() {
    return {
      ok: true,
      service: 'tabz-backend',
      message: 'TABZ API is running. Try /health',
    };
  }

  // Keep your existing health behavior exactly
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
  // LOCKED DEBUG (prod-only + key required)
  @Get('__debug/dbs')
  async __debugDbs(@Headers('x-debug-key') key?: string) {
    if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      throw new ForbiddenException('debug disabled');
    }
    const expected = String(process.env.DEBUG_KEY || '');
    if (!expected || key !== expected) {
      throw new ForbiddenException('forbidden');
    }

    const r = await this.dataSource.query(
      "select datname from pg_database where datistemplate=false order by datname"
    );
    return { db: (await this.dataSource.query('select current_database() as db'))[0].db, databases: r };
  }
  // LOCKED DEBUG (prod-only + key required)
  @Get('__debug/relations')
  async __debugRelations(@Headers('x-debug-key') key?: string) {
    if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      throw new ForbiddenException('debug disabled');
    }
    const expected = String(process.env.DEBUG_KEY || '');
    if (!expected || key !== expected) {
      throw new ForbiddenException('forbidden');
    }

    const who = await this.dataSource.query(
      "select current_database() as db, current_user as user, current_schema() as schema"
    );

    const r = await this.dataSource.query(
      "select n.nspname as schema, c.relkind, count(*)::int as count " +
      "from pg_class c join pg_namespace n on n.oid = c.relnamespace " +
      "where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' " +
      "group by n.nspname, c.relkind " +
      "order by n.nspname, c.relkind"
    );

    return { dbinfo: who[0], groups: r };
  }

  // LOCKED DEBUG (prod-only + key required)
  @Get('__debug/tables')
  async __debugTables(@Headers('x-debug-key') key?: string) {
    if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      throw new ForbiddenException('debug disabled');
    }
    const expected = String(process.env.DEBUG_KEY || '');
    if (!expected || key !== expected) {
      throw new ForbiddenException('forbidden');
    }

    const r = await this.dataSource.query(
      "select table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and table_schema not in ('pg_catalog','information_schema') order by table_schema, table_name"
    );

        const who = await this.dataSource.query(
      "select current_database() as db, current_user as user, current_schema() as schema"
    );
    return { dbinfo: who[0], count: r.length, tables: r };
  }

  // --------------------------------------------------
  // DEV ONLY — M31.2 proof: transport status must sync to payload.status
  // Expected: HTTP 403 with JSON { status: 403, ... }
  // --------------------------------------------------
  @Get('dev/m31-2-status-sync')
  devM312StatusSync() {
    throw new BadRequestException({
      message: 'm31_2_probe',
      detail: 'This is intentional.',
      status: 403,
    });
  }
}









