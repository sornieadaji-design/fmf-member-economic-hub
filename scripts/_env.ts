import { config } from "dotenv";
import * as path from "node:path";

/**
 * Load environment for the standalone tsx scripts (migrate, seed). Next.js loads
 * .env.local automatically for the app, but these scripts run under tsx and do not,
 * so import this FIRST (before anything that reads process.env).
 *
 * Precedence: .env.local (developer-local, gitignored) then .env (fallback). dotenv
 * does not override variables already present in the real environment.
 */
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });
