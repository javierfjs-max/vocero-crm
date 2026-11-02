CREATE TABLE "quick_reply" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"atajo" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quick_reply" ADD CONSTRAINT "quick_reply_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quick_reply_org_atajo_uq" ON "quick_reply" USING btree ("organization_id","atajo");