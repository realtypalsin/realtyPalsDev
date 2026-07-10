-- Add AI performance metrics to chat_analytics
ALTER TABLE chat_analytics ADD COLUMN latency_ms INTEGER;
ALTER TABLE chat_analytics ADD COLUMN llm_tokens INTEGER;
ALTER TABLE chat_analytics ADD COLUMN ai_confidence INTEGER;

-- Add search quality metrics to query_metrics
ALTER TABLE query_metrics ADD COLUMN results_count INTEGER;
ALTER TABLE query_metrics ADD COLUMN had_results BOOLEAN;
ALTER TABLE query_metrics ADD COLUMN builder TEXT;
ALTER TABLE query_metrics ADD COLUMN purpose TEXT;
ALTER TABLE query_metrics ADD COLUMN possession TEXT;
ALTER TABLE query_metrics ADD COLUMN clarification_count INTEGER DEFAULT 0;

-- Create property_events table for fine-grained interaction tracking
CREATE TABLE property_events (
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

CREATE INDEX idx_property_events_session_id ON property_events(session_id);
CREATE INDEX idx_property_events_project_id ON property_events(project_id);
CREATE INDEX idx_property_events_user_id ON property_events(user_id);
CREATE INDEX idx_property_events_action ON property_events(action);
CREATE INDEX idx_property_events_created_at ON property_events(created_at);
