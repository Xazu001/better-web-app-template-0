CREATE TABLE `banned_emails` (
	`banned_email_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`reason` text,
	`banned_by` text,
	`banned_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `banned_emails_email_unique` ON `banned_emails` (`email`);--> statement-breakpoint
CREATE INDEX `idx_banned_emails_email` ON `banned_emails` (`email`);--> statement-breakpoint
CREATE TABLE `logins` (
	`login_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`login_email` text,
	`login_password` text,
	`login_created_on` integer,
	`login_verification_code` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `logins_login_email_unique` ON `logins` (`login_email`);--> statement-breakpoint
CREATE INDEX `idx_logins_user_id` ON `logins` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_logins_verification_code` ON `logins` (`login_verification_code`);--> statement-breakpoint
CREATE TABLE `user_rights` (
	`user_right_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`user_admin` integer DEFAULT false,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_rights_user_id` ON `user_rights` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`user_name` text NOT NULL,
	`user_namespace` text NOT NULL,
	`user_avatar_source` text,
	`user_verified` integer NOT NULL,
	`user_status` text DEFAULT 'active' NOT NULL,
	`user_created_on` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_user_namespace_unique` ON `users` (`user_namespace`);--> statement-breakpoint
CREATE INDEX `idx_users_verified` ON `users` (`user_verified`);--> statement-breakpoint
CREATE INDEX `idx_users_name` ON `users` (`user_name`);--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`user_status`);--> statement-breakpoint
CREATE INDEX `idx_users_created_on` ON `users` (`user_created_on`);