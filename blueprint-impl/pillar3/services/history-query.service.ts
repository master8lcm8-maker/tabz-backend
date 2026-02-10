/**
 * Slice A — History query service (skeleton).
 * No DB access. Returns deterministic placeholders.
 */

import { P3HistoryPage, P3HistoryQuery } from "../queries/history.query";

export class HistoryQueryService {
  query(_q: P3HistoryQuery): P3HistoryPage {
    return {
      items: [],
      nextCursor: undefined,
    };
  }
}
