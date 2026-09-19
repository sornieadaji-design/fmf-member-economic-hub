import { vi } from "vitest";
import { config } from "dotenv";
import * as path from "node:path";

// revalidatePath/revalidateTag require Next's request store, absent under vitest. The
// actions call them as cache hints; no-op them so server actions can be unit/integration
// tested directly. (Applied to every test file via setupFiles.)
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

// Load env for integration tests (mirrors scripts/_env.ts). Unit tests don't need it;
// DB-backed tests use `describe.runIf(process.env.DATABASE_URL)` so they skip cleanly
// when no database is configured.
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });
