// Canonical schema is defined in GIV-47. This file establishes the module
// path Drizzle expects so the scaffold lints/typechecks; real tables land
// in the next ticket.
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schemaPlaceholder = sqliteTable("schema_placeholder", {
  id: text("id").primaryKey(),
});
