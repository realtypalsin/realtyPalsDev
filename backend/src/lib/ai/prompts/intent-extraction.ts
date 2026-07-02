// backend/src/lib/ai/prompts/intent-extraction.ts

export const INTENT_EXTRACTION_PROMPT = `Extract real estate search intent from user messages (Hindi, Hinglish, or English).
Return ONLY valid JSON. No markdown, no explanation.

OUTPUT SCHEMA (all fields optional):
{
  "bhk": number[],              // e.g. [2] or [3,4]
  "budgetMin": number,          // crore, e.g. 1.5
  "budgetMax": number,          // crore, e.g. 2.5
  "possession": "immediate"|"1year"|"2year"|"3year+",
  "sector": string,             // SPECIFIC sector only, e.g. "Sector 150"
  "areaMin": number,            // carpet sqft
  "areaMax": number,            // carpet sqft
  "purpose": "endUse"|"investment",
  "builderName": string,
  "lifestyleKeywords": string[], // amenity signals
  "projectNames": string[],      // ANY query about a specific named project: RERA lookups, possession dates, reviews, comparisons, detail questions — extract ALL project names mentioned
  "riskProfile": "nri"|"retiree"|"risk_averse"|"first_time_buyer",  // buyer risk profile
  "is_comparison_query": boolean // true ONLY when user explicitly asks to COMPARE multiple named projects ("X vs Y", "compare X and Y", "which is better X or Y"). NEVER true for single-project detail/RERA/possession queries. NEVER true for general searches.
}

PROJECTNAMES RULE: Populate projectNames ONLY when the user mentions a real branded project name (e.g. "Godrej Meridien", "ATS Pristine", "ACE Starlit"). Real project names are proper nouns — brand names given to a specific development. DO NOT put generic adjectives or descriptions into projectNames: "best project", "good flat", "affordable property", "top apartments", "cheap house" are NOT project names.
- RERA / registration number queries ("What is the RERA number of X")
- Possession / delivery queries ("When will X be delivered")
- Review / opinion queries ("Is X good", "X kaisa hai")
- Direct detail queries ("Tell me about X", "X ke baare mein batao")
- Comparison queries ("X vs Y", "compare X and Y")

RISKPROFILE RULE: Set riskProfile when buyer identity signals are present.
  "nri" → "NRI", "non-resident", "abroad", "US mein hoon", "Dubai se hoon", "overseas"
  "retiree" → "retired", "retire", "60+", "senior", "65 saal", "pension"
  "risk_averse" → "no legal issues", "safe only", "risk nahi chahiye", "only RERA", "no disputes", "cautious"
  "first_time_buyer" → "first time", "never bought", "pehli baar", "first home", "first property"
  When riskProfile is "retiree" or "first_time_buyer", also set purpose: "endUse" unless the user explicitly mentions investment, rental income, or appreciation.

PURPOSE INFERENCE RULE: Set purpose:"endUse" when the query implies the buyer will live in the property — family signals, school proximity, retirement, buying for parents/relatives, first home. Set purpose:"investment" only when explicitly signalled: "investment", "rental income", "appreciation", "returns", "yield", "kiraya", "nivesh".

LIFESTYLE MAPPINGS:
kids/family/bachhe/children → ["playground","park","sports","pool"]
green/greenery/open space   → ["park","garden","jogging track"]
metro/metro connectivity    → ["metro"]
near school/school nearby   → ["school"]
near hospital               → ["hospital"]
gym/fitness                 → ["gym","fitness"]
quiet/peaceful/low traffic  → ["gated","low density"]
luxury/premium/hi-end       → ["clubhouse","spa","concierge"]
vastu/vastu compliant       → ["vastu"]
parking/parking space       → ["parking"]

CITY RULE: "Noida", "Greater Noida", "Delhi", "Gurgaon", "Mumbai", "Bangalore" are cities — NEVER set sector for city names.

FEW-SHOT EXAMPLES:

Input: "show me 2BHK in sector 150 under 1.5 crore"
Output: {"bhk":[2],"sector":"Sector 150","budgetMax":1.5}

Input: "teen BHK chahiye noida mein family ke liye"
Output: {"bhk":[3],"lifestyleKeywords":["playground","park","sports","pool"]}

Input: "ready to move 3BHK near metro under 2Cr"
Output: {"bhk":[3],"possession":"immediate","budgetMax":2,"lifestyleKeywords":["metro"]}

Input: "investment ke liye dedh se do crore mein dikhao"
Output: {"budgetMin":1.5,"budgetMax":2,"purpose":"investment"}

Input: "godrej ka koi flat hai kya sector 150 mein"
Output: {"builderName":"Godrej Properties","sector":"Sector 150"}

Input: "3-4 BHK RTM Sector 137 ya 143 mein chahiye"
Output: {"bhk":[3,4],"sector":"Sector 137","possession":"immediate"}

Input: "2BHK under 80 lakhs noida expressway"
Output: {"bhk":[2],"budgetMax":0.8}

Input: "1000 sqft se bada 3BHK sector 76 mein"
Output: {"bhk":[3],"sector":"Sector 76","areaMin":1000}

Input: "compare godrej palm retreat with ATS pious hideaways"
Output: {"projectNames":["Godrej Palm Retreat","ATS Pious Hideaways"],"is_comparison_query":true}

Input: "godrej palm retreat vs ace starlit which is better"
Output: {"projectNames":["Godrej Palm Retreat","ACE Starlit"],"is_comparison_query":true}

Input: "what is the RERA number of Godrej Meridien"
Output: {"projectNames":["Godrej Meridien"]}

Input: "Godrej Palm Retreat ka RERA registration number kya hai"
Output: {"projectNames":["Godrej Palm Retreat"]}

Input: "is ACE Starlit RERA registered"
Output: {"projectNames":["ACE Starlit"]}

Input: "show me RERA details for Mahagun Moderne"
Output: {"projectNames":["Mahagun Moderne"]}

Input: "ATS Pious Hideaways ka registration id chahiye"
Output: {"projectNames":["ATS Pious Hideaways"]}

Input: "tell me about Godrej Meridien"
Output: {"projectNames":["Godrej Meridien"]}

Input: "ACE Starlit kaisa hai, possession kab hai"
Output: {"projectNames":["ACE Starlit"]}

Input: "best project under 3 crore in sector 150"
Output: {"budgetMax":3,"sector":"Sector 150"}

Input: "sabse acha flat sector 137 mein dikhao 2Cr mein"
Output: {"sector":"Sector 137","budgetMax":2}

Input: "top 3BHK flats in noida under 2.5cr"
Output: {"bhk":[3],"budgetMax":2.5}

Input: "affordable 2BHK in greater noida west"
Output: {"bhk":[2]}

Input: "what is stamp duty" OR "just looking" OR "hello"
Output: {}

Input: "I'm an NRI in Dubai, looking to invest 2Cr in Noida"
Output: {"budgetMax":2,"purpose":"investment","riskProfile":"nri"}

Input: "I'm retired, want a peaceful 2BHK ready to move"
Output: {"bhk":[2],"possession":"immediate","riskProfile":"retiree"}

Input: "First time buyer here, never bought property before, budget 1.2Cr"
Output: {"budgetMax":1.2,"riskProfile":"first_time_buyer"}

Input: "Only show me RERA compliant projects with no legal disputes"
Output: {"riskProfile":"risk_averse"}

Input: "2 BHK near school for my kids, budget 1.5 Cr"
Output: {"bhk":[2],"budgetMax":1.5,"lifestyleKeywords":["school","playground","park","sports","pool"],"purpose":"endUse"}

Input: "Buying 3BHK for my parents in Sector 150, budget 2 Cr"
Output: {"bhk":[3],"sector":"Sector 150","budgetMax":2,"purpose":"endUse"}

Input: "Ready to move apartment for retirement, budget 2 Cr"
Output: {"budgetMax":2,"possession":"immediate","riskProfile":"retiree","purpose":"endUse"}

Input: "First home for my family, 3BHK under 2Cr"
Output: {"bhk":[3],"budgetMax":2,"riskProfile":"first_time_buyer","purpose":"endUse"}`
