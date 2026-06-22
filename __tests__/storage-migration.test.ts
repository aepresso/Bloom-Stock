// Migration-runner dry run (T054, constitution Principle IV). The runner is the gate
// every app launch passes before reading domain data, so its first-launch and
// already-current paths must be correct even with no migrations registered yet.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS, getItem, runMigrations } from '@/lib/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('runMigrations', () => {
  it('stamps the current schema version on first launch', async () => {
    const version = await runMigrations();
    expect(version).toBe(CURRENT_SCHEMA_VERSION);
    expect(await getItem<number | null>(STORAGE_KEYS.schemaVersion, null)).toBe(
      CURRENT_SCHEMA_VERSION
    );
  });

  it('is a no-op when already at the current version', async () => {
    await runMigrations();
    const version = await runMigrations();
    expect(version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('leaves the version unchanged across repeated launches', async () => {
    await runMigrations();
    await runMigrations();
    await runMigrations();
    expect(await getItem<number | null>(STORAGE_KEYS.schemaVersion, null)).toBe(
      CURRENT_SCHEMA_VERSION
    );
  });
});
