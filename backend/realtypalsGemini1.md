For Fyndre, I would actually go one step further than Gemini.

Gemini is a **general-purpose assistant**. You're building a **vertical AI** (real estate), which means you control the data. That gives you a huge advantage.

Your goal should be:

> **Never let the AI invent facts. Let it reason only on verified data.**

Think of the architecture as three independent systems.

```
                User
                  │
                  ▼
        Intent & Planner
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
  Structured Data      AI Reasoning
        │                   │
        └─────────┬─────────┘
                  ▼
          Component Renderer
```

Notice something important.

The AI never directly talks to the database.

It asks the planner.

---

# Layer 1 — Intent Engine

Every prompt is classified first.

Example

```
Show me 3 BHK in Sector 150 under 1.5Cr
```

Planner extracts

```
intent:
Property Search

filters:
sector = 150
bhk = 3
budget = 1.5Cr
```

No LLM required yet.

---

Example

```
Should I invest in ATS Pristine?
```

Planner

```
Intent

Investment Advice

Needs

Builder

Price Trend

Rental Yield

Nearby Projects

Reviews

Market Data

AI Summary
```

---

# Layer 2 — Data Layer (Single Source of Truth)

This is where hallucinations disappear.

Never allow the model to answer using its own knowledge.

Instead

```
AI

↓

Request Facts

↓

Property Engine

↓

Verified Data

↓

AI
```

For example

Instead of

```
LLM

"ATS Pristine has 7 towers..."
```

Do

```
Database

{

builder:
"ATS"

launchYear:
2018

towers:
7

possession:
Ready

price:
2.1Cr

}

↓

LLM

Summarize this.
```

The AI never invents numbers because it never creates them.

It only rewrites them.

---

# Layer 3 — Planner

This is the most important part.

The planner decides

```
What information is needed?
```

Example

User

```
Compare these two projects.
```

Planner

```
Need

Project A

Project B

Price History

Builder Rating

Amenities

Location Score

Schools

Hospitals

Metro

Crime

Rental Yield
```

The planner fetches everything first.

Only then

AI explains.

---

# Layer 4 — Tool Calling

Instead of asking AI

```
How much EMI?
```

Give AI a calculator.

```
EMI Tool

↓

₹87,452

↓

AI explains
```

Same for

Price appreciation

Rental yield

Distance

Commute

Loan eligibility

ROI

Everything should come from tools.

Never from AI memory.

---

# Layer 5 — Grounded Prompt

Every AI prompt should look like

```
SYSTEM

You are Fyndre AI.

Never make up facts.

Only answer using supplied data.

If data is unavailable,
say

"I don't have enough verified information."

Never estimate.

Never guess.
```

Then

```
DATA

Project

ATS

Price

2.1Cr

Builder Rating

4.4

Rental Yield

3.7%

...

Question

Should I invest?
```

Now hallucination becomes very difficult.

---

# Layer 6 — Structured Output

Don't let AI write markdown.

Return JSON.

Example

```json
{
  "summary": "...",

  "confidence": 0.96,

  "sources": [

    "property_db",

    "builder_db",

    "price_history"

  ],

  "components": [

    {
      "type":"price-chart"
    },

    {
      "type":"builder-card"
    }

  ]
}
```

Now the frontend decides

```
Builder Card

↓

Price Chart

↓

Map

↓

Schools

↓

Investment Summary
```

Exactly how Gemini works.

---

# Layer 7 — Confidence Score

Every answer should have confidence.

Example

```
Confidence

98%
```

Meaning

Everything came from verified DB.

Another

```
Confidence

42%
```

Meaning

Rental data missing.

Price history incomplete.

Builder reviews limited.

The UI should actually show this.

---

# Layer 8 — Source Attribution

This is something most startups skip.

Every sentence should know where it came from.

Example

```
Nearest Metro

↓

Google Maps
```

```
Price

↓

Internal DB
```

```
Rental Yield

↓

Rental Engine
```

```
Builder Rating

↓

Verified Reviews
```

If someone asks

```
Where did this number come from?
```

The AI already knows.

---

# Layer 9 — Component System

Don't ask AI

```
Generate a chart.
```

Instead

AI returns

```json
{
"type":"price-chart",
"project":"ATS Pristine"
}
```

React

↓

```
<PriceChart />
```

Same for

```
Property Card

Map

Builder Card

Timeline

Comparison Table

Mortgage Calculator

Investment Score

Amenities

Nearby Places

Price Trend

Availability Calendar

Transaction History
```

The AI only chooses which components appear.

The components fetch and render verified data.

---

# Layer 10 — AI Memory (Conversation State)

Maintain a structured conversation state instead of relying on the model to remember everything.

Example after a few turns:

```json
{
  "city": "Noida",
  "sector": "150",
  "budget": 15000000,
  "bhk": 3,
  "purpose": "Investment",
  "preferredBuilders": ["ATS", "Godrej"],
  "mustHave": ["Metro nearby", "Clubhouse"]
}
```

Future queries like "Show me cheaper options" are resolved by updating this state, not by asking the LLM to infer previous context.

---

# Hallucination Prevention Checklist

This is the checklist I would use before shipping:

| Risk                                 | Solution                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| AI invents property details          | Never expose the database directly to the LLM; provide only retrieved records. |
| AI invents prices                    | Prices come only from the pricing service/database.                            |
| AI invents builder facts             | Maintain a curated builder knowledge base.                                     |
| AI invents locations                 | Use Google Maps/OpenStreetMap APIs.                                            |
| AI performs calculations incorrectly | Use deterministic calculation services (EMI, ROI, affordability).              |
| AI misunderstands user intent        | Use a planner with structured intent extraction before reasoning.              |
| AI answers without evidence          | Require citations to internal data objects or external APIs.                   |
| AI mixes projects                    | Use unique property IDs throughout the pipeline instead of names alone.        |
| AI becomes stale                     | Refresh cached market data on a schedule and version your datasets.            |
| AI is uncertain                      | Return "I don't have enough verified information" instead of guessing.         |

---

# The Architecture I Would Build

```
                    USER
                      │
                      ▼
            Intent Classification
                      │
                      ▼
              Query Planner
                      │
      ┌───────────────┼────────────────┐
      │               │                │
      ▼               ▼                ▼
 Property DB     Maps Service     Calculator Engine
      │               │                │
      └───────────────┼────────────────┘
                      ▼
            Verified Context Builder
                      │
                      ▼
              LLM (Reasoning Only)
                      │
         Structured JSON Response
                      │
                      ▼
          React Component Registry
                      │
                      ▼
    Property Cards • Maps • Charts • Tables • Calculators
```

## One additional idea that can differentiate Fyndre

Instead of a single AI response, build a **Reasoning Pipeline**.

```
User
   │
   ▼
Planner
   │
   ▼
Data Collector
   │
   ▼
Validation Layer
   │
   ▼
LLM
   │
   ▼
Fact Checker
   │
   ▼
UI Renderer
```

The **Validation Layer** verifies that all required facts are present before the LLM is called. After the LLM responds, the **Fact Checker** compares every factual claim against the retrieved data. If the model says "5 km" but the retrieved value is "4.2 km", the response is rejected or corrected automatically before it reaches the user.

This extra validation step is what will make Fyndre feel trustworthy. Users can forgive a slightly slower response, but they will quickly lose confidence if the AI confidently states incorrect property details. A vertical AI wins by being **accurate, explainable, and grounded**, not by sounding the smartest.
