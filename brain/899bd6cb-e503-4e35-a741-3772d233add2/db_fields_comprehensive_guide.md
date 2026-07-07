# Project Database Fields Guide

This guide maps every section of the RealtyPals frontend UI to its exact database field or JSON structure. To ensure no project has missing or "empty" sections, ensure every field listed below is populated in your database.

---

## 1. Top-Level Project Model (`Project`)

This model populates the core details across the header, hero, and basic stats.

| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Project Name** | `name` (String) | The official project name (e.g., "Elite X") |
| **URL Slug** | `slug` (String) | **REQUIRED**: Unique identifier for the URL (e.g., "elite-x-sector-10") |
| **Location Core** | `city` (String), `sector` (String) | **REQUIRED**: Mapped for the Market Comparison graph |
| **Tagline** | `tagline` (String?) | Short marketing slogan displayed in the Hero banner |
| **Short Description** | `description` (String?) | High-level summary of the property |
| **Long Description** | `long_description` (String?) | Comprehensive breakdown of property features |
| **Hero Image** | `hero_image_url` (String?) | Main cover image for the project |
| **Status** | `status` (ProjectStatus) | e.g., `under_construction`, `ready_to_move` |
| **RERA Number** | `rera_number` (String?) | Displayed in the Quick Info bar |
| **Location Map** | `lat`, `lng` (Float?) | Required for the interactive map in the Location tab |
| **Stats Row** | `total_towers` (Int?) | Shown as "Towers" |
| | `floors` (String?) | Total floors per tower (e.g., "G+30") |
| | `total_units` (Int?) | Total number of apartments |
| | `land_area_acres` (Float?) | Size of the project |
| | `launch_date` (DateTime?) | When the project launched |
| | `possession_date` (DateTime?) | Expected completion date |
| | `possession_label` (String?) | Display label (e.g., "January 2029") |
| **Pricing** | `price_min_cr`, `price_max_cr` (Float?) | Range for the header (e.g., 1.45, 2.63) |
| | `price_range_label` (String?) | Fallback label (e.g., "₹1.45 Cr - ₹2.63 Cr+") |
| **Design Team** | `architect` (String?) | Architect firm name |
| | `interior_designer` (String?) | Interior designer firm |
| **Top Amenities** | `top_amenities` (String[]) | Fallback list of amenity names |
| **Marketing** | `marketing_claims` (String[]) | Bullet points in the "Key Highlights" section |

---

## 2. Builder Detail (`Builder`)

Populates the "Built by [Builder Name]" section in the Overview Tab.

| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Builder Name** | `name` (String) | e.g., "Irish Infrastructure Pvt. Ltd." |
| **Description** | `company_overview` (String?) | A paragraph about the builder's legacy |
| **Experience** | `founded_year` (Int?) | Used to calculate "Years of Experience" |
| **Delivered** | `delivered_units` (Int?) | Total units delivered |
| **RERA Score** | `rera_compliance_score` (Int?) | e.g., 98 (displayed as 98%) |

---

## 3. Project DNA (`ProjectDna`)

Provides core grading dimensions for project benchmarking in the Decision dashboard.

| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Builder Track Record** | `builder_track_record_score` (Int?), `builder_track_record_label` (String?) | Track record score (e.g., 90, "Excellent") |
| **Price Position** | `price_position_score` (Int?), `price_position_label` (String?) | Price position (e.g., 85, "Market Value") |
| **Locality** | `locality_score` (Int?), `locality_label` (String?) | Locality strength (e.g., 88, "Premium Enclave") |
| **RERA Compliance** | `rera_compliance_score` (Int?), `rera_compliance_label` (String?) | RERA standing (e.g., 95, "Fully Compliant") |
| **Amenity Depth** | `amenity_depth_score` (Int?), `amenity_depth_label` (String?) | Count/diversity of amenities (e.g., 90, "Deep Resort") |
| **Possession Certainty** | `possession_certainty_score` (Int?), `possession_certainty_label` (String?) | Timeline reliability (e.g., 89, "On Schedule") |

---

## 4. Decision Profile (`DecisionProfile`)

This model drives the **Analysis Tab** and the **Location Tab** via its `intelligence_data` JSON field.

### Direct Model Fields
| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **AI Verdict (Why Buy/Avoid)** | `decision_thesis` (String?) | One sentence summary |
| | `why_buy` (String[]) | Pros |
| | `why_avoid` (String[]) | Cons/Concerns |
| **Market Target** | `best_for` (String?) | Summary of target buyer (e.g., "Premium Executives") |
| | `not_ideal_for` (String?) | Summary of bad fits (e.g., "Speculative Investors") |

### The `intelligence_data` JSON Field (CRITICAL FOR UI)
Ensure the `intelligence_data` JSON blob contains the exact keys below:
```json
{
  "topLevelMetrics": {
    "overallScore": 88,
    "tier": "STRONG_BUY",
    "investmentGrade": "A",
    "priceAdvantage": "+12%",
    "priceAdvantageSubtext": "Premium",
    "confidenceLevel": "High",
    "confidenceLabel": "Highly Reliable"
  },
  "dimensionScores": {
    "builderTrust": { "score": 92, "status": "Verified" },
    "locationQuality": { "score": 88, "status": "Verified" },
    "lifestyleAmenities": { "score": 90, "status": "Verified" },
    "valueForMoney": { "score": 85, "status": "Verified" },
    "appreciationPotential": { "score": 95, "status": "Verified" },
    "legalSafety": { "score": 95, "status": "Verified" }
  },
  "buyerPersonas": [
    {
      "type": "Families",
      "stars": 5,
      "reasons": ["Reason 1", "Reason 2"]
    }
  ],
  "riskRadar": [
    {
      "type": "Construction Risk",
      "level": "Low",
      "description": "Heavily insulated by technology..."
    }
  ],
  "quick_commutes": [
    { "destination": "Sector 52 Metro", "time": "15 Mins", "icon": "train" }
  ],
  "location_highlights": [
    { "title": "Proposed Metro", "time": "At Doorstep", "description": "...", "icon": "train" }
  ],
  "nearby_essentials": {
    "Schools": [{ "name": "DPS", "dist": "2.5 km" }],
    "Hospitals": [{ "name": "Yatharth", "dist": "4.5 km" }],
    "Shopping": [{ "name": "Gaur Mall", "dist": "6.0 km" }]
  },
  "neighborhood_advantages": [
    { "title": "Metro Expansion", "description": "...", "icon": "train" }
  ]
}
```

---

## 5. Persona Profile (`PersonaProfile`)

Defines the target buyer personas for the AI analysis module.

| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Primary Persona** | `primary_persona` (String?) | Main target buyer type (e.g. "Working Professionals") |
| **Secondary Personas** | `secondary_personas` (String[]) | Additional demographic targets |
| **Demographics** | `income_range` (String?) | Expected salary range (e.g. "₹25L - ₹40L L.A.") |
| | `risk_appetite` (String?) | Investment risk profile (e.g. "Conservative") |
| | `family_stage` (String?) | Family classification (e.g. "Nuclear / Growing") |
| | `work_location` (String?) | Ideal job location (e.g. "Noida Sec 62 / KP-V") |
| | `timeline_horizon` (String?) | Holding timeline (e.g. "5 to 7 Years") |
| **Motivation Note** | `motivation_note` (String?) | Brief summary of buying trigger |

---

## 6. Recommendation Profile (`RecommendationProfile`)

This drives the expert investment verification tab.

| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Expert Status** | `status` (IntelligenceStatus) | e.g. `PUBLISHED` |
| **Verdict Tier** | `tier` (String?) | e.g. "STRONG_BUY", "HOLD", "BUY_WITH_CAUTION" |
| **Theses** | `primary_thesis` (String?) | Core recommendation thesis |
| | `end_use_thesis` (String?) | Perspective from end-user point of view |
| | `investment_thesis` (String?) | Capital appreciation investment perspective |
| **Lenses** | `family_thesis` (String?), `investor_thesis` (String?), `luxury_thesis` (String?), `risk_thesis` (String?) | Custom demographic reviews |
| **Advisories** | `walk_away_conditions` (String[]) | Dealbreakers / walk-away triggers |
| | `negotiation_leverage` (String[]) | Leverage points for negotiations |
| | `timeline_advice` (String?) | Specific advice regarding purchase timing |

---

## 7. Competitor Intelligence (`ProjectCompetitor`)

Allows users to benchmark the property against direct market alternatives.

| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Competitor Name** | `competitor_name` (String) | Name of alternative project |
| **Competitor Slug** | `competitor_slug` (String?) | Project slug if alternative exists in DB |
| **Our Advantage** | `this_project_advantage` (String?) | What makes our project better than competitor |
| **Their Advantage** | `competitor_advantage` (String?) | What makes competitor better than our project |
| **Verdict** | `verdict` (String?) | AI verdict comparison |
| **Price Delta Note** | `price_delta_note` (String?) | Pricing spread analysis (e.g., "₹1,500/sqft cheaper") |

---

## 8. Financial & Pricing Information

Populates the **Pricing Tab**.

### `CostSheet` Model
| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Base Price** | `base_price_per_sqft` (Float) | Price per square foot |
| **PLC Charges** | `plc_charges` (Json) | Array of `{ label, amount_per_sqft }` |
| **Other Costs** | `parking_cost` (Float?), `ifms` (Float?), `club_membership` (Float?) | Fixed standard charges |
| **Govt. Taxes** | `gst_rate_pct` (Float?), `stamp_duty_pct` (Float), `registration_pct` (Float) | Percentage based taxes |

### `PaymentPlan` Model
| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Payment Schedule** | `milestones` (Json) | Array of `{ milestone, pct, amt, due, done }` |

---

## 9. Detailed Attributes

### `UnitType` Model
| UI Element | Prisma Field / Type | Description |
| :--- | :--- | :--- |
| **Config** | `bhk` (Int), `name` (String?) | e.g. 3, "3 BHK Comfort" |
| **Area** | `carpet_area_sqft` (Float?), `super_area_sqft` (Float?), `balcony_area_sqft` (Float?) | Area metrics |
| **Layout Features** | `bathrooms` (Int?) | Total bathroom units |
| **Price** | `price_min_cr` (Float?), `price_max_cr` (Float?) | Price boundaries in Crores |
| | `price_label` (String?) | Custom text price (e.g. "₹1.45 Cr") |

### `ProjectAmenity` Model (Amenity relation)
Populates grouped listing categories.
*   `name` (String), `category` (String) - Mapped to categories like `sports`, `lifestyle`, `wellness`, `kids`, `security`, `parking`.

### `ProjectDocument` Model
Populates downloads section.
*   `name` (String), `storage_url` (String)

### `ProjectImage` Model
Populates image carousels.
*   `url` (String), `type` (ImageType)
