Verification Plan: Phase 2 Fabrication Fixes

A. Code Verification (Done)

2.1 IntelligenceTab
grep -n "getDefaultIntel\|defaultIntel\s*=" components/property-detail/IntelligenceTab.tsx
# Expected: 0 matches (function deleted, no longer used)

grep -n "Data not verified yet" components/property-detail/IntelligenceTab.tsx
# Expected: found at empty-state render

2.2 LocationTab
grep -n "DPS\|Ryan\|Gaur Chowk\|Gaur City" components/property-detail/LocationTab.tsx
# Expected: 0 matches (hardcoded markers removed)

grep -n "Sector 10.*Greater Noida West" components/property-detail/LocationTab.tsx
# Expected: 0 matches (hardcoded fallback removed)

B. Runtime Testing

2.1 IntelligenceTab Empty State
# Open a project detail without intelligence_data in decision_profile
# Expected: "Data not verified yet" shown, no scores/badges displayed

2.2 LocationTab Real POI Data
# Check connectivity array has at least one entry
SELECT * FROM connectivity WHERE project_id = 'xyz' LIMIT 5;
# Expected: returns metro, schools, hospitals, etc. with names

# In UI: verify POI list matches connectivity table entries
# Expected: no hardcoded "Gaur City Mall", only real connectivity names

2.3 Guardrail RERA Flag
# Send a chat message with fabricated UPRERAPRJ number
# Expected: logged as violation in server logs (observe mode doesn't block)