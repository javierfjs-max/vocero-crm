CREATE TABLE "webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"fuente" text NOT NULL,
	"payload" jsonb NOT NULL,
	"huella" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"not_before" timestamp DEFAULT now() NOT NULL,
	"leased_until" timestamp,
	"last_error" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_event" ADD CONSTRAINT "webhook_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_huella_uq" ON "webhook_event" USING btree ("huella");--> statement-breakpoint
CREATE INDEX "webhook_event_barrido_idx" ON "webhook_event" USING btree ("status","not_before") WHERE "webhook_event"."status" in ('pendiente', 'en_proceso');--> statement-breakpoint
CREATE INDEX "webhook_event_org_status_idx" ON "webhook_event" USING btree ("organization_id","status");