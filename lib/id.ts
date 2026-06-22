// Globally-unique IDs for persisted records (SPEC.md §2 — UUIDs, not array indices,
// so a future sync layer can merge without collisions). RFC-4122 v4 shape generated
// with Math.random — not cryptographically strong, but collision-safe at this app's
// single-user, low-hundreds-of-records scale, and dependency-free.

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
