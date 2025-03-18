CREATE TABLE IF NOT EXISTS "Quest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"criteria" jsonb NOT NULL,
	"network" varchar(64) NOT NULL,
	"tokenAddress" varchar(256) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Quest" ADD CONSTRAINT "Quest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
