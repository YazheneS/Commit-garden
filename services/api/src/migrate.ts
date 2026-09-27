import { PostgresGardenRepository } from "./postgres.js";
import { runMigrations } from "./migrations.js";

const repository = new PostgresGardenRepository();
try {
  const applied = await runMigrations(repository.pool);
  console.log(`Applied ${applied.length} migration(s).`);
} finally {
  await repository.close();
}
