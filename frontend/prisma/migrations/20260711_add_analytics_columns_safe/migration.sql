-- Safe migration: Add analytics columns (idempotent, skips if already present)
-- Note: latency_ms already exists in chat_analytics from previous partial application

-- Add missing columns to chat_analytics if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_analytics' AND column_name = 'llm_tokens') THEN
    ALTER TABLE chat_analytics ADD COLUMN llm_tokens INTEGER;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_analytics' AND column_name = 'ai_confidence') THEN
    ALTER TABLE chat_analytics ADD COLUMN ai_confidence INTEGER;
  END IF;
END $$;

-- Add search quality metrics to query_metrics (if table exists)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'query_metrics') THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_metrics' AND column_name = 'results_count') THEN
      ALTER TABLE query_metrics ADD COLUMN results_count INTEGER;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_metrics' AND column_name = 'had_results') THEN
      ALTER TABLE query_metrics ADD COLUMN had_results BOOLEAN;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_metrics' AND column_name = 'builder') THEN
      ALTER TABLE query_metrics ADD COLUMN builder TEXT;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_metrics' AND column_name = 'purpose') THEN
      ALTER TABLE query_metrics ADD COLUMN purpose TEXT;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_metrics' AND column_name = 'possession') THEN
      ALTER TABLE query_metrics ADD COLUMN possession TEXT;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_metrics' AND column_name = 'clarification_count') THEN
      ALTER TABLE query_metrics ADD COLUMN clarification_count INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Create property_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_events (
  id TEXT NOT NULL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  guest_token TEXT,
  project_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT property_events_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Create indexes (idempotent with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_property_events_session_id ON property_events(session_id);
CREATE INDEX IF NOT EXISTS idx_property_events_project_id ON property_events(project_id);
CREATE INDEX IF NOT EXISTS idx_property_events_user_id ON property_events(user_id);
CREATE INDEX IF NOT EXISTS idx_property_events_action ON property_events(action);
CREATE INDEX IF NOT EXISTS idx_property_events_created_at ON property_events(created_at);
