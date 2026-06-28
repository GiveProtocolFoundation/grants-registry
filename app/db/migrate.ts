// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Run with: npm run db:migrate
// Applied during deployment and local setup.
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./client";

const db = createDb();
migrate(db, { migrationsFolder: "./app/db/migrations" });
console.log("Migrations applied.");
