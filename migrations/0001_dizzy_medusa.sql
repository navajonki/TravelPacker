CREATE TABLE "collaboration_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"packing_list_id" integer NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"permission_level" varchar(20) DEFAULT 'editor' NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collaboration_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "packing_list_collaborators" (
	"packing_list_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"permission_level" varchar(20) DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "packing_list_collaborators_packing_list_id_user_id_pk" PRIMARY KEY("packing_list_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "packing_lists" ALTER COLUMN "theme" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "last_modified_by" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "last_modified" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "packing_lists" ADD COLUMN "last_modified" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_packing_list_id_packing_lists_id_fk" FOREIGN KEY ("packing_list_id") REFERENCES "public"."packing_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_collaborators" ADD CONSTRAINT "packing_list_collaborators_packing_list_id_packing_lists_id_fk" FOREIGN KEY ("packing_list_id") REFERENCES "public"."packing_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_collaborators" ADD CONSTRAINT "packing_list_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;