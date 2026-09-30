import * as migration_20260930_175607_initial from './20260930_175607_initial';
import * as migration_20261001_000001_lead_seq_and_search from './20261001_000001_lead_seq_and_search';

export const migrations = [
  {
    up: migration_20260930_175607_initial.up,
    down: migration_20260930_175607_initial.down,
    name: '20260930_175607_initial',
  },
  {
    up: migration_20261001_000001_lead_seq_and_search.up,
    down: migration_20261001_000001_lead_seq_and_search.down,
    name: '20261001_000001_lead_seq_and_search'
  },
];
