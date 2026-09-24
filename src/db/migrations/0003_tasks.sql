CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`move_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`due_date` text,
	`assignee_id` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`source` text NOT NULL,
	`template_id` text,
	`completed_at` integer,
	`completed_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`move_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`template_id`) REFERENCES `task_templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_move_id_due_date_idx` ON `tasks` (`move_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_move_id_status_idx` ON `tasks` (`move_id`,`status`);