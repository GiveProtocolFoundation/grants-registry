CREATE TABLE `grant` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`grantee_id` text NOT NULL,
	`amount_usd_cents` integer NOT NULL,
	`currency_native` text,
	`amount_native` text,
	`awarded_at` text,
	`source_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `round`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grantee_id`) REFERENCES `grantee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grant_round_grantee_unique` ON `grant` (`round_id`,`grantee_id`);--> statement-breakpoint
CREATE INDEX `grant_round_idx` ON `grant` (`round_id`);--> statement-breakpoint
CREATE INDEX `grant_grantee_idx` ON `grant` (`grantee_id`);--> statement-breakpoint
CREATE TABLE `grantee` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`github_org` text,
	`website` text,
	`social` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grantee_slug_unique` ON `grantee` (`slug`);--> statement-breakpoint
CREATE TABLE `program` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`license` text,
	`source_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `program_slug_unique` ON `program` (`slug`);--> statement-breakpoint
CREATE TABLE `round` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`opened_at` text,
	`closed_at` text,
	`total_pool_usd_cents` integer,
	`source_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `round_program_slug_unique` ON `round` (`program_id`,`slug`);--> statement-breakpoint
CREATE INDEX `round_program_idx` ON `round` (`program_id`);--> statement-breakpoint
CREATE TABLE `source_record` (
	`id` text PRIMARY KEY NOT NULL,
	`adapter` text NOT NULL,
	`entity_kind` text NOT NULL,
	`entity_id` text,
	`source_key` text NOT NULL,
	`source_url` text,
	`payload_hash` text NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_adapter_key_unique` ON `source_record` (`adapter`,`source_key`);--> statement-breakpoint
CREATE INDEX `source_entity_idx` ON `source_record` (`entity_kind`,`entity_id`);