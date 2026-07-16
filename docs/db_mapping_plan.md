# Project Data Mapping & Database Architecture Plan

This document outlines the detailed mapping of every field from your UI/Form sections to the underlying PostgreSQL database schema defined in `dbStructure.sql`. It also highlights any fields that require structural adjustments.

---

## 1. Core Info
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Project Name | `string` | `projects.name` | Required |
| Slug | `string` | `projects.slug` | Required |
| Builder | `string` | `projects.builder_id` | Foreign Key to `builders` |
| Status | `enum` | `projects.status` | Ready to Move, Under Construction, etc. |
| Sector | `string` | `projects.sector` | Required |
| City | `string` | `projects.city` | Default: Noida |

## 2. Location & RERA
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Full Address | `string` | `projects.address` | |
| Tagline | `string` | `projects.tagline` | |
| Latitude | `float` | `projects.lat` | |
| Longitude | `float` | `projects.lng` | |
| RERA Number | `string` | `projects.rera_number` | |
| RERA URL | `string` | `projects.rera_url` | |

## 3. Project Details
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Total Towers | `integer` | `projects.total_towers` | |
| Total Units | `integer` | `projects.total_units` | |
| Land Area (Acres) | `float` | `projects.land_area_acres` | |
| Launch Date | `date` | `projects.launch_date` | |
| Possession Label | `string` | `projects.possession_label` | e.g. "Delivered (June 2024)" |
| Possession Date | `date` | `projects.possession_date` | |
| Design Theme | `string` | `projects.design_theme` | |
| Architect | `string` | `projects.architect` | |
| Interior Designer | `string` | `projects.interior_designer` | |
| Floors | `string` | `projects.floors` | e.g. "G+26" |
| Open Space (%) | `integer` | `projects.open_space_pct` | |
| Green Rating | `string` | `projects.green_rating` | |

## 4. Descriptions
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Short Description | `string` | `projects.description` | |
| Long Description | `string` | `projects.long_description` | |

## 5. AI & Marketing
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Marketing Claims | `string[]` | `projects.marketing_claims` | Array of features/claims |
| AI Search Keywords | `string[]` | `projects.ai_search_keywords` | Array of search terms |

## 6. Unit Types
Managed in the **`unit_types`** table (one-to-many from projects).
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| BHK | `integer` | `unit_types.bhk` | |
| Name | `string` | `unit_types.name` | e.g. "3 BHK + Utility" |
| Super Area (sqft) | `integer` | `unit_types.super_area_sqft` | |
| Carpet Area (sqft) | `integer` | `unit_types.carpet_area_sqft` | |
| Balcony Area (sqft)| `integer` | `unit_types.balcony_area_sqft` | |
| Bathrooms | `integer` | `unit_types.bathrooms` | |
| Price Min (Cr) | `float` | `unit_types.price_min_cr` | |
| Price Max (Cr) | `float` | `unit_types.price_max_cr` | |
| Price Label | `string` | `unit_types.price_label` | Optional |
| Unit Views (Images)| `array` | `project_images` table | Link to `project_id` and `bhk` |

## 7. Amenities
Managed in the **`amenities`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Name | `string` | `amenities.name` | |
| Category | `string` | `amenities.category` | Lifestyle, Sports, Kids, etc. |

## 8. Connectivity
Managed in the **`connectivity`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Type | `string` | `connectivity.type` | Metro, Road, Mall, etc. |
| Name | `string` | `connectivity.name` | |
| Distance | `float` | `connectivity.distance_km` | In km |

## 9. Payment Plan
Managed in the **`payment_plans`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Plan Name | `string` | `payment_plans.plan_name` | |
| Milestones | `jsonb` | `payment_plans.milestones` | Array: `[{ name, percentage, amount, date }]` |

## 10. Cost Sheet Breakdown
Managed in the **`cost_sheets`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| GST % | `float` | `cost_sheets.gst_rate_pct` | |
| Stamp Duty % | `float` | `cost_sheets.stamp_duty_pct` | |
| Registration % | `float` | `cost_sheets.registration_pct` | |
| Parking Cost (₹) | `float` | `cost_sheets.parking_cost` | |
| Club Membership | `float` | `cost_sheets.club_membership` | |
| IFMS (₹) | `float` | `cost_sheets.ifms` | |
| PLC Charges | `jsonb` | `cost_sheets.plc_charges` | Array: `[{ name, amount }]` |
| Other Charges | `jsonb` | `cost_sheets.other_charges` | Array: `[{ description, amount }]` |

## 11. Investment Insights *(⚠️ Needs DB Updates)*
Currently, `projects` and intelligence tables don't explicitly have columns for these metrics. They can be added to `decision_profiles.intelligence_data` as a JSON block, or as explicit columns in the `projects` table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Price Appreciation | `string` | `decision_profiles.intelligence_data` | e.g. "12-15%" |
| Rental Yield | `string` | `decision_profiles.intelligence_data` | e.g. "4-5%" |
| Market Trend | `string` | `decision_profiles.intelligence_data` | e.g. "Bullish" |
| Liquidity Score | `string` | `decision_profiles.intelligence_data` | e.g. "High" |
| Investment Report | `jsonb` | `decision_profiles.intelligence_data` | Maps to "Advanced Investment Report" |

## 12. Nearby Establishments
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Schools | `integer` | `projects.schools_nearby_count` | |
| Hospitals | `integer` | `projects.hospitals_nearby_count` | |
| Shopping Malls | `integer` | `projects.shopping_nearby_count` | |
| IT Parks | `integer` | `projects.it_parks_nearby_count` | |
| Banks / ATMs | `integer` | `projects.banks_nearby_count` | |
| Restaurants | `integer` | `projects.restaurants_nearby_count` | |
| Location Data JSON | `jsonb` | *New Column needed* (or save to `intelligence_data`) | Advanced Location JSON |

## 13. Project DNA
Managed in the **`project_dna`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Builder Track Record| `integer` | `project_dna.builder_track_record_score`| |
| Price Position | `integer` | `project_dna.price_position_score` | |
| Locality | `integer` | `project_dna.locality_score` | |
| RERA Compliance | `integer` | `project_dna.rera_compliance_score`| |
| Amenity Depth | `integer` | `project_dna.amenity_depth_score` | |
| Possession Certainty| `integer` | `project_dna.possession_certainty_score`| |
| Verified By | `string` | `project_dna.verified_by` | |
| Last Verified | `date` | `project_dna.last_verified_at` | |

## 14. Decision Profile
Managed in the **`decision_profiles`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Status | `enum` | `decision_profiles.status` | |
| Decision Thesis | `string` | `decision_profiles.decision_thesis`| |
| Why Buy | `string[]` | `decision_profiles.why_buy` | |
| Why Avoid | `string[]` | `decision_profiles.why_avoid` | |
| Best For | `string` | `decision_profiles.best_for` | |
| Not Ideal For | `string` | `decision_profiles.not_ideal_for` | |
| Confidence Sources | `string[]` | `decision_profiles.confidence_sources`| |
| Recommendation Notes| `string` | `decision_profiles.recommendation_notes`| |
| Advisor Notes | `string` | `decision_profiles.advisor_notes` | |

## 15. Persona Profile
Managed in the **`persona_profiles`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Primary Persona | `string` | `persona_profiles.primary_persona` | |
| Secondary Personas | `string[]` | `persona_profiles.secondary_personas` | |
| Income Range | `string` | `persona_profiles.income_range` | |
| Risk Appetite | `string` | `persona_profiles.risk_appetite` | |
| Family Stage | `string` | `persona_profiles.family_stage` | |
| Work Location | `string` | `persona_profiles.work_location` | |
| Timeline Horizon | `string` | `persona_profiles.timeline_horizon` | |
| Motivation Note | `string` | `persona_profiles.motivation_note` | |
| Detailed Personas | `jsonb` | `persona_profiles.persona_descriptions` | Maps to the JSON block of personas |

## 16. Recommendation
Managed in the **`recommendation_profiles`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Tier (STRONG BUY) | `string` | `recommendation_profiles.tier` | |
| Primary Thesis | `string` | `recommendation_profiles.primary_thesis` | |
| End-Use Thesis | `string` | `recommendation_profiles.end_use_thesis` | |
| Investment Thesis | `string` | `recommendation_profiles.investment_thesis`| |
| Family Lens | `string` | `recommendation_profiles.family_thesis` | |
| Investor Lens | `string` | `recommendation_profiles.investor_thesis` | |
| Luxury Lens | `string` | `recommendation_profiles.luxury_thesis` | |
| Risk Lens | `string` | `recommendation_profiles.risk_thesis` | |
| Walk Away Conditions| `string[]` | `recommendation_profiles.walk_away_conditions`| |
| Negotiation Leverage| `string[]` | `recommendation_profiles.negotiation_leverage`| |
| Timeline Advice | `string` | `recommendation_profiles.timeline_advice` | |
| Internal Confidence | `string` | `recommendation_profiles.internal_confidence` | |
| Admin Notes | `string` | `recommendation_profiles.admin_notes` | |

## 17. Competitor Intelligence
Managed in the **`project_competitors`** table.
| UI Field | Type | Database Table.Column | Notes |
|----------|------|-----------------------|-------|
| Competitor Name | `string` | `project_competitors.competitor_name` | |
| Competitor Slug | `string` | `project_competitors.competitor_slug` | |
| Our Advantage | `string` | `project_competitors.this_project_advantage` | |
| Their Advantage | `string` | `project_competitors.competitor_advantage` | |
| Verdict | `string` | `project_competitors.verdict` | |
| Price Delta Note | `string` | `project_competitors.price_delta_note` | |

---

## Complete JSON Payload Schema

This represents a hypothetical single unified JSON you would send from the frontend to the backend to create or update all of this data at once.

```json
{
  "project": {
    "name": "string",
    "slug": "string",
    "builder_id": "string",
    "status": "string",
    "sector": "string",
    "city": "string",
    "address": "string",
    "tagline": "string",
    "lat": "number",
    "lng": "number",
    "rera_number": "string",
    "rera_url": "string",
    "total_towers": "number",
    "total_units": "number",
    "land_area_acres": "number",
    "launch_date": "string (ISO 8601 Date)",
    "possession_label": "string",
    "possession_date": "string (ISO 8601 Date)",
    "design_theme": "string",
    "architect": "string",
    "interior_designer": "string",
    "floors": "string",
    "open_space_pct": "number",
    "green_rating": "string",
    "description": "string",
    "long_description": "string",
    "marketing_claims": ["string"],
    "ai_search_keywords": ["string"],
    "schools_nearby_count": "number",
    "hospitals_nearby_count": "number",
    "shopping_nearby_count": "number",
    "it_parks_nearby_count": "number",
    "banks_nearby_count": "number",
    "restaurants_nearby_count": "number",
    "location_intelligence_json": {}
  },
  "unit_types": [
    {
      "bhk": "number",
      "name": "string",
      "super_area_sqft": "number",
      "carpet_area_sqft": "number",
      "balcony_area_sqft": "number",
      "bathrooms": "number",
      "price_min_cr": "number",
      "price_max_cr": "number",
      "price_label": "string",
      "views": [
        { "url": "string", "caption": "string", "type": "string" }
      ]
    }
  ],
  "amenities": [
    { "name": "string", "category": "string" }
  ],
  "connectivity": [
    { "type": "string", "name": "string", "distance_km": "number" }
  ],
  "payment_plan": {
    "plan_name": "string",
    "milestones": [
      {
        "name": "string",
        "percentage": "number",
        "amount": "number",
        "date": "string (ISO 8601 Date)"
      }
    ]
  },
  "cost_sheet": {
    "gst_rate_pct": "number",
    "stamp_duty_pct": "number",
    "registration_pct": "number",
    "parking_cost": "number",
    "club_membership": "number",
    "ifms": "number",
    "plc_charges": [
      { "name": "string", "amount": "number" }
    ],
    "other_charges": [
      { "description": "string", "amount": "number" }
    ]
  },
  "investment_insights": {
    "price_appreciation": "string",
    "rental_yield": "string",
    "market_trend": "string",
    "liquidity_score": "string",
    "investment_report_json": {}
  },
  "project_dna": {
    "builder_track_record_score": "number",
    "price_position_score": "number",
    "locality_score": "number",
    "rera_compliance_score": "number",
    "amenity_depth_score": "number",
    "possession_certainty_score": "number",
    "verified_by": "string",
    "last_verified_at": "string (ISO 8601 Date)"
  },
  "decision_profile": {
    "status": "string",
    "decision_thesis": "string",
    "why_buy": ["string"],
    "why_avoid": ["string"],
    "best_for": "string",
    "not_ideal_for": "string",
    "confidence_sources": ["string"],
    "recommendation_notes": "string",
    "advisor_notes": "string"
  },
  "persona_profile": {
    "primary_persona": "string",
    "secondary_personas": ["string"],
    "income_range": "string",
    "risk_appetite": "string",
    "family_stage": "string",
    "work_location": "string",
    "timeline_horizon": "string",
    "motivation_note": "string",
    "persona_descriptions": [
      {
        "fit": "string",
        "type": "string",
        "stars": "number",
        "reasons": ["string"],
        "fitColor": "string",
        "iconName": "string"
      }
    ]
  },
  "recommendation": {
    "tier": "string",
    "primary_thesis": "string",
    "end_use_thesis": "string",
    "investment_thesis": "string",
    "family_thesis": "string",
    "investor_thesis": "string",
    "luxury_thesis": "string",
    "risk_thesis": "string",
    "walk_away_conditions": ["string"],
    "negotiation_leverage": ["string"],
    "timeline_advice": "string",
    "internal_confidence": "string",
    "admin_notes": "string"
  },
  "competitors": [
    {
      "competitor_name": "string",
      "competitor_slug": "string",
      "this_project_advantage": "string",
      "competitor_advantage": "string",
      "verdict": "string",
      "price_delta_note": "string"
    }
  ]
}
```
