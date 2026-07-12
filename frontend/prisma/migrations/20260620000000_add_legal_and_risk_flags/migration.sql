-- Add legal_flag to builders table
-- IF NOT EXISTS: columns were pre-applied via db push before migration tracking was initialized.
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "legal_flag" TEXT;

-- Add project_risk_flag to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "project_risk_flag" TEXT;
