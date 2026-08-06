-- Indexes on CallbackRequest.status and SiteVisitRequest.status
CREATE INDEX IF NOT EXISTS "callback_requests_status_idx" ON "callback_requests"("status");

-- Add missing columns to unit_types
ALTER TABLE "unit_types"
  ADD COLUMN IF NOT EXISTS "layout_variant_name" TEXT DEFAULT 'Type A',
  ADD COLUMN IF NOT EXISTS "tower_association" TEXT[] DEFAULT ARRAY['Tower A'],
  ADD COLUMN IF NOT EXISTS "built_up_area_sqft" INTEGER,
  ADD COLUMN IF NOT EXISTS "utility_area_sqft" INTEGER,
  ADD COLUMN IF NOT EXISTS "common_area_shaft_sqft" INTEGER,
  ADD COLUMN IF NOT EXISTS "efficiency_rating" TEXT DEFAULT 'Excellent';

-- Add missing columns to projects
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "price_includes_plc" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "price_includes_club" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "price_includes_taxes" BOOLEAN DEFAULT FALSE;

-- Create unit_inventory table
CREATE TABLE IF NOT EXISTS "unit_inventory" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "unit_type_id" TEXT NOT NULL,
  "tower_name" TEXT NOT NULL,
  "floor_number" INTEGER NOT NULL,
  "unit_number" TEXT NOT NULL,
  "facing" TEXT,
  "view" TEXT,
  "status" TEXT DEFAULT 'available',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_inventory_pkey" PRIMARY KEY ("id"),
  UNIQUE(project_id, tower_name, floor_number, unit_number),
  CONSTRAINT "unit_inventory_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "unit_inventory_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "unit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for unit_inventory
CREATE INDEX IF NOT EXISTS "unit_inventory_project_id_idx" ON "unit_inventory"("project_id");
CREATE INDEX IF NOT EXISTS "unit_inventory_unit_type_id_idx" ON "unit_inventory"("unit_type_id");
CREATE INDEX IF NOT EXISTS "unit_inventory_status_idx" ON "unit_inventory"("status");

-- Create project_channel_partners junction table
CREATE TABLE IF NOT EXISTS "project_channel_partners" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "channel_partner_id" TEXT NOT NULL,
  "is_featured" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_channel_partners_pkey" PRIMARY KEY ("id"),
  UNIQUE(project_id, channel_partner_id),
  CONSTRAINT "project_channel_partners_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_channel_partners_channel_partner_id_fkey" FOREIGN KEY ("channel_partner_id") REFERENCES "channel_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for project_channel_partners
CREATE INDEX IF NOT EXISTS "project_channel_partners_project_id_idx" ON "project_channel_partners"("project_id");
CREATE INDEX IF NOT EXISTS "project_channel_partners_channel_partner_id_idx" ON "project_channel_partners"("channel_partner_id");
CREATE INDEX IF NOT EXISTS "project_channel_partners_is_featured_idx" ON "project_channel_partners"("is_featured");
