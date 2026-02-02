CREATE TABLE `aliases` (
	`alias_id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`alias` text NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_aliases_node` ON `aliases` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_aliases_alias` ON `aliases` (`alias`);--> statement-breakpoint
CREATE TABLE `chunks` (
	`chunk_id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`text` text NOT NULL,
	`offset_start` integer NOT NULL,
	`offset_end` integer NOT NULL,
	`version_id` text NOT NULL,
	`token_count` integer,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chunks_node` ON `chunks` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_chunks_version` ON `chunks` (`version_id`);--> statement-breakpoint
CREATE TABLE `edges` (
	`edge_id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`edge_type` text NOT NULL,
	`strength` real,
	`provenance` text NOT NULL,
	`created_at` text NOT NULL,
	`version_start` text,
	`version_end` text,
	`attributes` text,
	FOREIGN KEY (`source_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_edges_source` ON `edges` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_edges_target` ON `edges` (`target_id`);--> statement-breakpoint
CREATE INDEX `idx_edges_type` ON `edges` (`edge_type`);--> statement-breakpoint
CREATE INDEX `idx_edges_source_target` ON `edges` (`source_id`,`target_id`);--> statement-breakpoint
CREATE TABLE `graph_metrics` (
	`node_id` text PRIMARY KEY NOT NULL,
	`centrality_pagerank` real,
	`cluster_id` text,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mention_candidates` (
	`candidate_id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`surface_text` text NOT NULL,
	`span_start` integer,
	`span_end` integer,
	`confidence` real NOT NULL,
	`reasons` text,
	`status` text DEFAULT 'new',
	FOREIGN KEY (`source_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mentions_source` ON `mention_candidates` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_mentions_target` ON `mention_candidates` (`target_id`);--> statement-breakpoint
CREATE INDEX `idx_mentions_status` ON `mention_candidates` (`status`);--> statement-breakpoint
CREATE TABLE `nodes` (
	`node_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`path` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`content_hash` text,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nodes_path_unique` ON `nodes` (`path`);--> statement-breakpoint
CREATE INDEX `idx_nodes_title` ON `nodes` (`title`);--> statement-breakpoint
CREATE INDEX `idx_nodes_type` ON `nodes` (`type`);--> statement-breakpoint
CREATE INDEX `idx_nodes_path` ON `nodes` (`path`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`proposal_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`node_id` text NOT NULL,
	`description` text NOT NULL,
	`diff` text NOT NULL,
	`status` text DEFAULT 'pending',
	`created_at` text NOT NULL,
	`applied_at` text,
	`metadata` text,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_proposals_node` ON `proposals` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_proposals_status` ON `proposals` (`status`);--> statement-breakpoint
CREATE TABLE `unresolved_links` (
	`link_id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_text` text NOT NULL,
	`span_start` integer,
	`span_end` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_unresolved_source` ON `unresolved_links` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_unresolved_target` ON `unresolved_links` (`target_text`);--> statement-breakpoint
CREATE TABLE `versions` (
	`version_id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`parent_version_id` text,
	`created_at` text NOT NULL,
	`summary` text,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`node_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_versions_node` ON `versions` (`node_id`);--> statement-breakpoint
CREATE INDEX `idx_versions_parent` ON `versions` (`parent_version_id`);