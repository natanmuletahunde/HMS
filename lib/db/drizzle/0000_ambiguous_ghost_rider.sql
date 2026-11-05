CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" text DEFAULT 'branch' NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"fayda_id" text,
	"avatar_url" text,
	"department" text,
	"role_id" text NOT NULL,
	"primary_branch_id" text,
	"tenant_id" text,
	"is_on_duty" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_fayda_id_unique" UNIQUE("fayda_id")
);
--> statement-breakpoint
CREATE TABLE "user_branches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_name" text NOT NULL,
	"legal_name" text,
	"hotel_code" text NOT NULL,
	"logo" text,
	"email" text,
	"phone" text,
	"website" text,
	"country" text DEFAULT 'Ethiopia' NOT NULL,
	"region" text,
	"city" text,
	"sub_city" text,
	"address" text,
	"postal_code" text,
	"latitude" text,
	"longitude" text,
	"description" text,
	"timezone" text DEFAULT 'Africa/Addis_Ababa' NOT NULL,
	"currency_code" text DEFAULT 'ETB' NOT NULL,
	"tax_number" text,
	"license_number" text,
	"star_rating" integer DEFAULT 3,
	"check_in_time" text DEFAULT '14:00' NOT NULL,
	"check_out_time" text DEFAULT '12:00' NOT NULL,
	"late_checkout_grace_minutes" integer DEFAULT 30,
	"late_checkout_hourly_fee" numeric DEFAULT '25',
	"late_checkout_tier1_percent" numeric DEFAULT '25',
	"late_checkout_tier2_percent" numeric DEFAULT '50',
	"late_checkout_cutoff_time" text DEFAULT '18:00',
	"status" text DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hotels_hotel_code_unique" UNIQUE("hotel_code")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"branch_name" text NOT NULL,
	"branch_code" text NOT NULL,
	"manager" text,
	"email" text,
	"phone" text,
	"address" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"check_in_time" text,
	"check_out_time" text,
	"star_rating" integer,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_branch_code_unique" UNIQUE("branch_code")
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"building_name" text NOT NULL,
	"building_code" text NOT NULL,
	"number_of_floors" integer DEFAULT 1 NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buildings_building_code_unique" UNIQUE("building_code")
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" text PRIMARY KEY NOT NULL,
	"building_id" text NOT NULL,
	"floor_name" text NOT NULL,
	"floor_number" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "bed_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"capacity" integer DEFAULT 2 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bed_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "room_amenities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"category" text DEFAULT 'other' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_amenities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" text,
	"bed_type_id" text,
	"base_price" numeric(10, 2) NOT NULL,
	"max_occupancy" text DEFAULT '2' NOT NULL,
	"maximum_adults" integer DEFAULT 2 NOT NULL,
	"maximum_children" integer DEFAULT 1 NOT NULL,
	"amenities" text[] DEFAULT '{}' NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"floor" text DEFAULT '1' NOT NULL,
	"notes" text,
	"room_name" text,
	"room_code" text,
	"room_type_id" text NOT NULL,
	"room_category_id" text,
	"bed_type_id" text,
	"building_id" text,
	"floor_id" text,
	"capacity_adults" integer DEFAULT 2 NOT NULL,
	"capacity_children" integer DEFAULT 1 NOT NULL,
	"size" numeric(8, 2),
	"view" text,
	"smoking_allowed" boolean DEFAULT false NOT NULL,
	"description" text,
	"current_price" numeric(10, 2),
	"status" text DEFAULT 'available' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_number_unique" UNIQUE("number"),
	CONSTRAINT "rooms_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "room_pricing" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"pricing_type" text DEFAULT 'base' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0',
	"tax_percent" numeric(5, 2) DEFAULT '0',
	"effective_date" text,
	"expiration_date" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_images" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_amenity_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"amenity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_code" text,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"gender" text,
	"date_of_birth" date,
	"nationality" text,
	"id_type" text,
	"id_number" text,
	"passport_number" text,
	"national_id" text,
	"visa_number" text,
	"phone" text,
	"alternative_phone" text,
	"email" text,
	"country" text,
	"region" text,
	"city" text,
	"address" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"vip_status" boolean DEFAULT false NOT NULL,
	"guest_type" text DEFAULT 'individual' NOT NULL,
	"smoking_preference" text,
	"bed_preference" text,
	"floor_preference" text,
	"food_preference" text,
	"special_requests" text,
	"profile_photo" text,
	"remarks" text,
	"notes" text,
	"password_hash" text,
	"total_stays" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_guest_code_unique" UNIQUE("guest_code")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_number" text NOT NULL,
	"confirmation_number" text NOT NULL,
	"guest_id" text NOT NULL,
	"room_id" text,
	"room_type_id" text,
	"check_in_date" date NOT NULL,
	"check_out_date" date NOT NULL,
	"nights" integer DEFAULT 1 NOT NULL,
	"actual_check_in" timestamp with time zone,
	"actual_check_out" timestamp with time zone,
	"adults" integer DEFAULT 1 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"reservation_type" text DEFAULT 'individual' NOT NULL,
	"booking_source" text,
	"rate_plan" text,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"service_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"deposit_required" numeric(10, 2) DEFAULT '0' NOT NULL,
	"deposit_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"special_requests" text,
	"remarks" text,
	"notes" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_reservation_number_unique" UNIQUE("reservation_number"),
	CONSTRAINT "reservations_confirmation_number_unique" UNIQUE("confirmation_number")
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"checkin_number" text NOT NULL,
	"reservation_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"room_id" text NOT NULL,
	"identity_verified" boolean DEFAULT false NOT NULL,
	"deposit_collected" boolean DEFAULT false NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"key_card_number" text,
	"registration_card_generated" boolean DEFAULT false NOT NULL,
	"digital_signature" text,
	"checked_in_by" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_checkin_number_unique" UNIQUE("checkin_number")
);
--> statement-breakpoint
CREATE TABLE "checkouts" (
	"id" text PRIMARY KEY NOT NULL,
	"checkout_number" text NOT NULL,
	"reservation_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"room_id" text NOT NULL,
	"late_checkout_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_charges" numeric(10, 2) DEFAULT '0' NOT NULL,
	"invoice_generated" boolean DEFAULT false NOT NULL,
	"deposit_refunded" boolean DEFAULT false NOT NULL,
	"feedback_rating" integer,
	"feedback_notes" text,
	"checked_out_by" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkouts_checkout_number_unique" UNIQUE("checkout_number")
);
--> statement-breakpoint
CREATE TABLE "stay_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"action_type" text NOT NULL,
	"from_room_id" text,
	"to_room_id" text,
	"previous_check_out" date,
	"new_check_out" date,
	"reason" text,
	"performed_by" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaning_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area_type" text NOT NULL,
	"floor" text,
	"building" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "cleaning_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"inspected_by" text,
	"result" text DEFAULT 'passed' NOT NULL,
	"score" integer,
	"notes" text,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housekeeping_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_number" text NOT NULL,
	"room_id" text,
	"area_type" text DEFAULT 'guest_room' NOT NULL,
	"staff_id" text,
	"supervisor_id" text,
	"cleaning_type" text DEFAULT 'daily' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"rejection_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "pre_checkout_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"inspection_number" text NOT NULL,
	"reservation_id" text NOT NULL,
	"room_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"minibar_items" text,
	"minibar_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"damage_charges" numeric(10, 2) DEFAULT '0' NOT NULL,
	"damage_notes" text,
	"assets_intact" boolean DEFAULT true NOT NULL,
	"lost_and_found_found" boolean DEFAULT false NOT NULL,
	"lost_and_found_notes" text,
	"inspected_by" text,
	"inspected_by_id" text,
	"inspected_at" timestamp with time zone,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_checkout_inspections_inspection_number_unique" UNIQUE("inspection_number")
);
--> statement-breakpoint
CREATE TABLE "maintenance_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "maintenance_inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"inspected_by" text,
	"result" text DEFAULT 'passed' NOT NULL,
	"notes" text,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"room_id" text,
	"category_id" text,
	"reported_by" text,
	"assigned_to_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"rejection_reason" text,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "daily_meal_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"room_number" text NOT NULL,
	"reservation_id" text,
	"guest_id" text,
	"guest_name" text,
	"claim_date" text NOT NULL,
	"meal_type" text DEFAULT 'breakfast' NOT NULL,
	"covers_claimed" integer DEFAULT 1 NOT NULL,
	"order_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"item_code" text,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"kitchen_section" text DEFAULT 'hot',
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"preparation_time" integer DEFAULT 15,
	"image_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"menu_item_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"is_complimentary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"kitchen_status" text DEFAULT 'pending' NOT NULL,
	"round_number" integer DEFAULT 1 NOT NULL,
	"station" text DEFAULT 'hot'
);
--> statement-breakpoint
CREATE TABLE "restaurant_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text,
	"table_number" integer,
	"table_id" text,
	"order_type" text DEFAULT 'dine_in' NOT NULL,
	"reservation_id" text,
	"guest_id" text,
	"room_id" text,
	"waiter_id" text,
	"guest_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"dining_case" text DEFAULT 'walk_in' NOT NULL,
	"settlement_type" text DEFAULT 'direct_payment',
	"complimentary_discount_amount" numeric(10, 2) DEFAULT '0',
	"subtotal" numeric(10, 2) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"service_charge_amount" numeric(10, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"coordinator_id" text,
	"kitchen_officer_id" text,
	"routed_via" text DEFAULT 'direct_kitchen',
	"coordinator_status" text DEFAULT 'pending',
	"coordinator_notes" text,
	"kitchen_notes" text,
	"notified_party" text,
	"ready_at" timestamp with time zone,
	"plated_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"served_at" timestamp with time zone,
	"billing_status" text DEFAULT 'open_tab',
	"bill_requested_at" timestamp with time zone,
	"receipt_printed_at" timestamp with time zone,
	"cashier_id" text,
	"cashier_notes" text,
	"pacing_preference" text DEFAULT 'drinks_first' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"table_number" integer NOT NULL,
	"name" text,
	"capacity" integer DEFAULT 4 NOT NULL,
	"floor" text DEFAULT '1',
	"section" text,
	"status" text DEFAULT 'available' NOT NULL,
	"current_order_id" text,
	"waiter_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_tables_table_number_unique" UNIQUE("table_number")
);
--> statement-breakpoint
CREATE TABLE "pos_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"menu_item_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"is_complimentary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"kitchen_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"order_type" text DEFAULT 'dine_in' NOT NULL,
	"table_id" text,
	"table_number" integer,
	"reservation_id" text,
	"guest_id" text,
	"guest_name" text,
	"room_number" text,
	"waiter_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"dining_case" text DEFAULT 'walk_in' NOT NULL,
	"settlement_type" text DEFAULT 'direct_payment',
	"complimentary_discount_amount" numeric(10, 2) DEFAULT '0',
	"subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_type" text DEFAULT 'none' NOT NULL,
	"discount_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"service_charge_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"service_charge_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"paid_at" timestamp with time zone,
	"coupon_code" text,
	"promotion_id" text,
	"notes" text,
	"receipt_number" text,
	"split_from" text,
	"merged_to" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_service_items" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"menu_item_id" text,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_service_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"reservation_id" text,
	"guest_id" text,
	"room_id" text,
	"room_number" text,
	"guest_name" text,
	"service_type" text NOT NULL,
	"department" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"description" text,
	"special_instructions" text,
	"assigned_to_id" text,
	"sla_minutes" integer DEFAULT 30,
	"estimated_completion" timestamp with time zone,
	"actual_completion" timestamp with time zone,
	"charge_amount" numeric(10, 2) DEFAULT '0',
	"charge_to_room" boolean DEFAULT false NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"cancel_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "floor_requisition_items" (
	"id" text PRIMARY KEY NOT NULL,
	"requisition_id" text NOT NULL,
	"item_id" text,
	"item_name" text NOT NULL,
	"unit" text NOT NULL,
	"quantity_requested" numeric(10, 2) NOT NULL,
	"quantity_issued" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "floor_requisitions" (
	"id" text PRIMARY KEY NOT NULL,
	"requisition_number" text NOT NULL,
	"department" text NOT NULL,
	"requested_by" text NOT NULL,
	"station_name" text,
	"source_location_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"notes" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "floor_requisitions_requisition_number_unique" UNIQUE("requisition_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"item_code" text,
	"barcode" text,
	"name" text NOT NULL,
	"category_id" text,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"current_stock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"min_stock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_stock" numeric(10, 2),
	"reorder_level" numeric(10, 2) DEFAULT '0',
	"unit_cost" numeric(10, 2),
	"purchase_price" numeric(10, 2),
	"selling_price" numeric(10, 2),
	"storage_location" text,
	"supplier" text,
	"supplier_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"expiry_date" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "inventory_location_stocks" (
	"id" text PRIMARY KEY NOT NULL,
	"location_id" text NOT NULL,
	"item_id" text NOT NULL,
	"current_stock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"min_stock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'adequate' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'mini' NOT NULL,
	"department" text DEFAULT 'general' NOT NULL,
	"managed_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"previous_stock" numeric(10, 2) NOT NULL,
	"new_stock" numeric(10, 2) NOT NULL,
	"unit_cost" numeric(10, 2),
	"reference_type" text,
	"reference_id" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"order_item_id" text,
	"item_id" text,
	"item_name" text NOT NULL,
	"unit" text NOT NULL,
	"quantity_expected" numeric(10, 2),
	"quantity_received" numeric(10, 2) NOT NULL,
	"quantity_accepted" numeric(10, 2) DEFAULT '0',
	"quantity_rejected" numeric(10, 2) DEFAULT '0',
	"unit_cost" numeric(10, 2),
	"inspection_notes" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"order_id" text,
	"supplier_id" text,
	"received_date" date NOT NULL,
	"received_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"quality_score" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"item_id" text,
	"item_name" text NOT NULL,
	"unit" text NOT NULL,
	"quantity_ordered" numeric(10, 2) NOT NULL,
	"quantity_received" numeric(10, 2) DEFAULT '0',
	"unit_price" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"po_number" text NOT NULL,
	"supplier_id" text,
	"request_id" text,
	"order_date" date,
	"expected_delivery" date,
	"actual_delivery" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(10, 2) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) DEFAULT '0',
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"payment_terms" text,
	"delivery_address" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "purchase_request_items" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"item_id" text,
	"item_name" text NOT NULL,
	"unit" text NOT NULL,
	"quantity_requested" numeric(10, 2) NOT NULL,
	"estimated_unit_cost" numeric(10, 2),
	"estimated_total" numeric(10, 2),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"department" text NOT NULL,
	"requested_by" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"required_date" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejected_by" text,
	"rejection_reason" text,
	"notes" text,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_code" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"address" text,
	"city" text,
	"country" text,
	"tin" text,
	"bank_name" text,
	"bank_account" text,
	"payment_terms" text,
	"rating" integer DEFAULT 5,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "cash_registers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"status" text DEFAULT 'closed' NOT NULL,
	"current_balance" numeric(10, 2) DEFAULT '0',
	"currency" text DEFAULT 'USD' NOT NULL,
	"assigned_to" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "cash_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"shift_number" text NOT NULL,
	"cash_register_id" text NOT NULL,
	"cashier_id" text,
	"opening_balance" numeric(10, 2) NOT NULL,
	"closing_balance" numeric(10, 2),
	"expected_balance" numeric(10, 2),
	"cash_in" numeric(10, 2) DEFAULT '0',
	"cash_out" numeric(10, 2) DEFAULT '0',
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"discrepancy" numeric(10, 2),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"note_number" text NOT NULL,
	"type" text DEFAULT 'credit' NOT NULL,
	"invoice_id" text,
	"guest_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"issued_by" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_number" text NOT NULL,
	"transaction_type" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(10, 6) DEFAULT '1',
	"amount_usd" numeric(10, 2),
	"payment_method" text,
	"reference_type" text,
	"reference_id" text,
	"reference_number" text,
	"description" text,
	"cash_register_id" text,
	"cash_shift_id" text,
	"processed_by" text,
	"transaction_date" date NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "conference_booking_services" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"service_type" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "conference_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_number" text NOT NULL,
	"hall_id" text NOT NULL,
	"reservation_id" text,
	"guest_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"company_name" text,
	"event_name" text NOT NULL,
	"event_type" text,
	"layout" text DEFAULT 'theater',
	"attendees" integer NOT NULL,
	"booking_date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"setup_time" text,
	"teardown_time" text,
	"status" text DEFAULT 'inquiry' NOT NULL,
	"hall_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"equipment_charges" numeric(10, 2) DEFAULT '0',
	"catering_charges" numeric(10, 2) DEFAULT '0',
	"other_charges" numeric(10, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"deposit_paid" boolean DEFAULT false NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"catering_required" boolean DEFAULT false NOT NULL,
	"special_requirements" text,
	"notes" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "conference_equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"hall_id" text,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"extra_charge" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conference_halls" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"floor" text,
	"capacity" integer NOT NULL,
	"min_capacity" integer DEFAULT 1,
	"area" numeric(8, 2),
	"layouts" text,
	"hourly_rate" numeric(10, 2),
	"half_day_rate" numeric(10, 2),
	"full_day_rate" numeric(10, 2),
	"status" text DEFAULT 'available' NOT NULL,
	"description" text,
	"amenities" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"driver_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"alternative_phone" text,
	"email" text,
	"license_number" text,
	"license_type" text,
	"license_expiry" date,
	"nationality" text,
	"address" text,
	"photo" text,
	"rating" numeric(3, 2) DEFAULT '5.0',
	"total_trips" integer DEFAULT 0,
	"status" text DEFAULT 'available' NOT NULL,
	"availability" text DEFAULT 'full_time' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_number" text NOT NULL,
	"trip_type" text NOT NULL,
	"vehicle_id" text,
	"driver_id" text,
	"reservation_id" text,
	"room_service_id" text,
	"guest_id" text,
	"guest_name" text,
	"guest_phone" text,
	"passenger_count" integer DEFAULT 1,
	"pickup_location" text NOT NULL,
	"dropoff_location" text NOT NULL,
	"flight_number" text,
	"scheduled_time" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"distance" numeric(8, 2),
	"fare" numeric(10, 2) DEFAULT '0',
	"extra_charges" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) DEFAULT '0',
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"charge_to_room" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"driver_notes" text,
	"notes" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_number" text NOT NULL,
	"vehicle_type" text NOT NULL,
	"make" text,
	"model" text,
	"year" integer,
	"color" text,
	"capacity" integer DEFAULT 4 NOT NULL,
	"fuel_type" text DEFAULT 'petrol',
	"plate_number" text,
	"insurance_expiry" date,
	"service_date" date,
	"status" text DEFAULT 'available' NOT NULL,
	"current_driver_id" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "vehicles_vehicle_number_unique" UNIQUE("vehicle_number")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_code" text,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"alternative_phone" text,
	"gender" text,
	"date_of_birth" date,
	"national_id" text,
	"nationality" text,
	"address" text,
	"city" text,
	"country" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"department" text NOT NULL,
	"department_id" text,
	"position" text NOT NULL,
	"employment_type" text DEFAULT 'full_time' NOT NULL,
	"salary_grade" text,
	"salary" numeric(10, 2),
	"supervisor_id" text,
	"user_id" text,
	"profile_photo" text,
	"hired_at" date NOT NULL,
	"termination_date" date,
	"termination_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"attendance_date" date NOT NULL,
	"clock_in" timestamp with time zone,
	"clock_out" timestamp with time zone,
	"scheduled_in" text,
	"scheduled_out" text,
	"worked_hours" numeric(5, 2) DEFAULT '0',
	"overtime_hours" numeric(5, 2) DEFAULT '0',
	"late_minutes" integer DEFAULT 0,
	"status" text DEFAULT 'present' NOT NULL,
	"shift_id" text,
	"notes" text,
	"approved_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"manager_id" text,
	"parent_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"leave_number" text NOT NULL,
	"employee_id" text NOT NULL,
	"leave_type" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"handover_to" text,
	"attachment_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "performance_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"reviewer_id" text,
	"review_period" text NOT NULL,
	"review_date" date NOT NULL,
	"overall_score" integer,
	"attendance_score" integer,
	"performance_score" integer,
	"teamwork_score" integer,
	"initiative_score" integer,
	"strengths" text,
	"improvements" text,
	"goals" text,
	"kpis" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"employee_comment" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"assigned_date" date NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"break_minutes" integer DEFAULT 30,
	"worked_hours" numeric(4, 2),
	"is_night_shift" boolean DEFAULT false NOT NULL,
	"overtime_rate" numeric(4, 2) DEFAULT '1.5',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "complaint_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_id" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"comment" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_number" text NOT NULL,
	"guest_id" text,
	"guest_name" text NOT NULL,
	"guest_email" text,
	"guest_phone" text,
	"reservation_id" text,
	"room_id" text,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"assigned_to" text,
	"assigned_at" timestamp with time zone,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"escalated_to" text,
	"escalated_at" timestamp with time zone,
	"escalation_reason" text,
	"first_response_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"original_name" text NOT NULL,
	"document_type" text NOT NULL,
	"mime_type" text,
	"size" integer,
	"storage_type" text DEFAULT 'local' NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text,
	"reference_type" text,
	"reference_id" text,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"tags" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"channel" text DEFAULT 'in_app' NOT NULL,
	"type" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"variables" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "notification_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tenant_branding" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#06b6d4',
	"secondary_color" text DEFAULT '#0891b2',
	"accent_color" text DEFAULT '#22d3ee',
	"font_family" text DEFAULT 'Inter',
	"theme" text DEFAULT 'dark',
	"custom_css" text,
	"favicon_url" text,
	"app_name" text DEFAULT 'Nexus HMS',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"country" text,
	"timezone" text DEFAULT 'UTC',
	"currency" text DEFAULT 'USD',
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mfa_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"backup_codes" jsonb DEFAULT '[]'::jsonb,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ip_restrictions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"ip_address" text NOT NULL,
	"type" text DEFAULT 'allowlist' NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"device_name" text,
	"platform" text,
	"push_token" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"name" text NOT NULL,
	"code" text,
	"type" text DEFAULT 'hotel_group',
	"description" text,
	"country" text,
	"city" text,
	"address" text,
	"phone" text,
	"email" text,
	"website" text,
	"currency" text DEFAULT 'USD',
	"timezone" text DEFAULT 'UTC',
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"max_hotels" integer,
	"max_users" integer,
	"max_rooms" integer,
	"storage_limit_gb" integer,
	"api_limit_per_month" integer,
	"monthly_price" numeric(10, 2) DEFAULT '0',
	"annual_price" numeric(10, 2) DEFAULT '0',
	"features" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"trial_days" integer DEFAULT 14,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly',
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"module_code" text NOT NULL,
	"module_name" text NOT NULL,
	"description" text,
	"icon" text,
	"category" text DEFAULT 'operations',
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_installed" boolean DEFAULT true NOT NULL,
	"is_core" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"version" text DEFAULT '1.0.0',
	"dependencies" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"instance_id" text NOT NULL,
	"step_id" text,
	"step_name" text NOT NULL,
	"approver_id" text,
	"approver_name" text,
	"action" text,
	"comments" text,
	"delegated_to" text,
	"acted_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"entity_type" text NOT NULL,
	"trigger_conditions" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"tenant_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_label" text,
	"current_step" integer DEFAULT 0,
	"total_steps" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_by" text,
	"completed_at" timestamp with time zone,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"approver_role" text,
	"approver_user_id" text,
	"action" text DEFAULT 'approve',
	"conditions" jsonb DEFAULT '{}'::jsonb,
	"escalation_hours" integer DEFAULT 48,
	"is_optional" boolean DEFAULT false NOT NULL,
	"notify_on_action" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"plugin_code" text NOT NULL,
	"plugin_name" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"description" text,
	"author" text,
	"homepage" text,
	"status" text DEFAULT 'active' NOT NULL,
	"hooks" jsonb DEFAULT '[]'::jsonb,
	"menus" jsonb DEFAULT '[]'::jsonb,
	"routes" jsonb DEFAULT '[]'::jsonb,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_system" boolean DEFAULT false NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"reservation_id" text,
	"guest_id" text NOT NULL,
	"subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"changes" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_primary_branch_id_branches_id_fk" FOREIGN KEY ("primary_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_category_id_room_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."room_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_bed_type_id_bed_types_id_fk" FOREIGN KEY ("bed_type_id") REFERENCES "public"."bed_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_category_id_room_categories_id_fk" FOREIGN KEY ("room_category_id") REFERENCES "public"."room_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_bed_type_id_bed_types_id_fk" FOREIGN KEY ("bed_type_id") REFERENCES "public"."bed_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_pricing" ADD CONSTRAINT "room_pricing_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_amenity_assignments" ADD CONSTRAINT "room_amenity_assignments_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_amenity_assignments" ADD CONSTRAINT "room_amenity_assignments_amenity_id_room_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."room_amenities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_changes" ADD CONSTRAINT "stay_changes_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_changes" ADD CONSTRAINT "stay_changes_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_changes" ADD CONSTRAINT "stay_changes_from_room_id_rooms_id_fk" FOREIGN KEY ("from_room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_changes" ADD CONSTRAINT "stay_changes_to_room_id_rooms_id_fk" FOREIGN KEY ("to_room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_inspections" ADD CONSTRAINT "cleaning_inspections_task_id_housekeeping_assignments_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."housekeeping_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_inspections" ADD CONSTRAINT "cleaning_inspections_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_assignments" ADD CONSTRAINT "housekeeping_assignments_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_assignments" ADD CONSTRAINT "housekeeping_assignments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_assignments" ADD CONSTRAINT "housekeeping_assignments_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_inspections" ADD CONSTRAINT "maintenance_inspections_request_id_maintenance_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_inspections" ADD CONSTRAINT "maintenance_inspections_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_category_id_maintenance_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."maintenance_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_meal_claims" ADD CONSTRAINT "daily_meal_claims_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_meal_claims" ADD CONSTRAINT "daily_meal_claims_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_meal_claims" ADD CONSTRAINT "daily_meal_claims_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_order_items" ADD CONSTRAINT "restaurant_order_items_order_id_restaurant_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."restaurant_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_order_items" ADD CONSTRAINT "restaurant_order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_waiter_id_users_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_kitchen_officer_id_users_id_fk" FOREIGN KEY ("kitchen_officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_orders" ADD CONSTRAINT "restaurant_orders_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_waiter_id_users_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_order_id_pos_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pos_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_orders" ADD CONSTRAINT "pos_orders_waiter_id_users_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_service_items" ADD CONSTRAINT "room_service_items_request_id_room_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."room_service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_service_items" ADD CONSTRAINT "room_service_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_service_requests" ADD CONSTRAINT "room_service_requests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_service_requests" ADD CONSTRAINT "room_service_requests_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_service_requests" ADD CONSTRAINT "room_service_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_service_requests" ADD CONSTRAINT "room_service_requests_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_requisition_items" ADD CONSTRAINT "floor_requisition_items_requisition_id_floor_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."floor_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_requisition_items" ADD CONSTRAINT "floor_requisition_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_requisitions" ADD CONSTRAINT "floor_requisitions_source_location_id_inventory_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_location_stocks" ADD CONSTRAINT "inventory_location_stocks_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_location_stocks" ADD CONSTRAINT "inventory_location_stocks_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_cash_register_id_cash_registers_id_fk" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_booking_services" ADD CONSTRAINT "conference_booking_services_booking_id_conference_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."conference_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_bookings" ADD CONSTRAINT "conference_bookings_hall_id_conference_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."conference_halls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_equipment" ADD CONSTRAINT "conference_equipment_hall_id_conference_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."conference_halls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_comments" ADD CONSTRAINT "complaint_comments_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_configs" ADD CONSTRAINT "mfa_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_configs" ADD CONSTRAINT "module_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_step_id_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_registry" ADD CONSTRAINT "plugin_registry_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_branches_user_branch_idx" ON "user_branches" USING btree ("user_id","branch_id");