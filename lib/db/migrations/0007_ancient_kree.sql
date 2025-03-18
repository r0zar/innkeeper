CREATE TABLE IF NOT EXISTS "QuestValidation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questId" uuid NOT NULL,
	"validatedAt" timestamp NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"validationData" jsonb NOT NULL,
	"errorMessage" text,
	"nextValidationAt" timestamp,
	"validAddresses" jsonb DEFAULT '[]',
	"processingTime" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuestValidationResult" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validationId" uuid NOT NULL,
	"userAddress" varchar(256) NOT NULL,
	"isValid" boolean NOT NULL,
	"resultData" jsonb NOT NULL,
	"validatedAt" timestamp NOT NULL,
	"criteriaType" varchar(64) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestValidation" ADD CONSTRAINT "QuestValidation_questId_Quest_id_fk" FOREIGN KEY ("questId") REFERENCES "public"."Quest"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestValidationResult" ADD CONSTRAINT "QuestValidationResult_validationId_QuestValidation_id_fk" FOREIGN KEY ("validationId") REFERENCES "public"."QuestValidation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
