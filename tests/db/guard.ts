/**
 * Safety Guard for Database Integration Tests.
 * Ensures tests NEVER connect to or modify a remote Neon production database.
 */

export function assertSafeTestDatabase(url: string | undefined): void {
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL_NOT_SET: DB integration tests require a local PostgreSQL instance."
    );
  }

  if (url.includes("neon.tech")) {
    throw new Error(
      "CRITICAL_SAFETY_VIOLATION: TEST_DATABASE_URL points to a neon.tech host! Automated tests are strictly prohibited from touching cloud/production databases. Use local Docker Postgres."
    );
  }
}
