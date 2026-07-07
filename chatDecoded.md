I spent some time studying the screenshot, and after using NotebookLM extensively, I'm fairly confident this is **not a simple "render 3 buttons" implementation.** It's an entire conversation guidance system.

Google's implementation is deceptively simple because almost all of the complexity is hidden in the orchestration layer.

---

# The Overall Architecture

Think of NotebookLM as having **two parallel outputs** instead of one.

```
                 User Prompt
                      │
                      ▼
              Conversation Engine
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
   Chat Response             Suggestion Engine
        │                            │
        ▼                            ▼
   Markdown/Text          Follow-up Chips + Actions
```

The chips are **not generated after the message is displayed.**

They are generated **alongside** the answer.

Meaning every AI response probably looks something like

```ts
{
    response: "...",

    suggestions: [
        {
            title: "Tell me about the mini-golf course",
            intent: "question"
        },
        {
            title: "Construction progress",
            intent: "question"
        },
        {
            title: "Compare Elite X",
            intent: "comparison"
        }
    ]
}
```

The frontend simply renders them.

---

# What determines those buttons?

NotebookLM appears to combine around **6 signals**.

---

## 1. Current Conversation

Most important.

Example

```
User

Tell me about Elite X.
```

Now the conversation topic becomes

```
Current Entity

Elite X
```

Every suggestion afterwards revolves around Elite X.

Never random.

---

## 2. Current Response

The model knows what it just talked about.

Suppose it answered

```
Schools

Amenities

Clubhouse

Commercial corridor
```

The suggestions intentionally avoid repeating these.

Instead it expands into

```
Construction

Comparison

Mini golf

Price
```

This is a classic recommendation strategy:

```
Don't repeat.

Expand.
```

---

## 3. Available Knowledge

NotebookLM indexes every uploaded document.

Internally it knows

```
Document contains

Construction timeline

Amenities

Financials

Price history

Schools

Legal

Builder
```

It then asks

> Which interesting sections haven't been explored yet?

Those become suggestions.

---

## 4. User Intent

If user has been asking

```
Pricing

ROI

Investment

Rental
```

Suggestions shift toward

```
Cashflow

Rental

Comparison

Growth

Resale
```

Different user

```
Schools

Parks

Hospitals
```

Now suggestions become

```
Playgrounds

Commute

Safety

Nearby malls
```

Same project.

Different chips.

---

## 5. Missing Information

Sometimes NotebookLM realizes

```
The user hasn't specified enough.
```

Instead of asking

```
Which report?
```

It provides clickable clarification.

This is more common in Gemini than NotebookLM, but the principle is the same.

---

## 6. Product Goals

Google also injects suggestions they WANT users to discover.

For example

```
Create Audio Overview

Mind Map

Flashcards

Reports
```

These aren't AI generated.

They're product-driven.

---

# Their Suggestion Ranking

I think NotebookLM scores every possible suggestion.

Something like

```
Score

Novelty

+

Relevance

+

Likelihood of click

+

Information gain

+

Product priority
```

Top 3 win.

Everything else disappears.

---

# Lifecycle

This is actually the interesting part.

Suggestions aren't persistent.

They have a lifecycle.

```
User asks

↓

AI responds

↓

Suggestions generated

↓

User clicks

↓

Conversation updates

↓

Previous suggestions removed

↓

New suggestions generated
```

They're disposable.

Never permanent.

---

# UI Placement

This is one of the cleanest parts.

The layout is

```
──────────────────────

Assistant Response

──────────────────────

Feedback Row

Save

Copy

Like

Dislike

──────────────────────

Suggestion Chips

Chip

Chip

Chip

──────────────────────

Input Box

──────────────────────
```

Notice something important.

The chips belong to the **assistant message**, not the input.

This matters.

They disappear naturally as the conversation continues.

---

# Why below the message?

Because psychologically

The user first

```
Reads

↓

Understands

↓

Chooses next step
```

If chips were above

```
Question

↓

Buttons

↓

Answer
```

That would feel backwards.

Google intentionally keeps the answer visually complete before suggesting the next step.

---

# Positioning

NotebookLM uses what looks like

```
display:flex

flex-direction:column
```

The chips sit inside the assistant message container.

Something approximately like

```
Assistant Bubble

    Markdown

    Divider

    Action Row

    Suggestion Chips
```

Not floating.

Not fixed.

Not attached to the input.

They're part of the message.

---

# Chip Styling

These chips are deliberately understated.

Characteristics:

* Filled dark surface (slightly lighter than the page background).
* Large border radius (~14–18px).
* Medium horizontal padding (14–18px).
* Height around 40–44px.
* Left-aligned text.
* No icons by default.
* Single-line with ellipsis if needed.
* Soft hover elevation/lightening rather than dramatic animation.
* Comfortable vertical spacing (~10–12px between chips).

The goal is to feel like **conversation continuations**, not primary buttons.

---

# Width Behavior

Notice they don't stretch.

Each chip is

```
width: fit-content
```

with a reasonable maximum width (roughly 70–80% of the message width).

So

```
Tell me about...

██████████████

Construction progress...

██████████████████████

Compare Elite X...

██████████████████████████
```

Each is only as wide as needed.

---

# Why vertical instead of horizontal?

Horizontal carousels have problems:

* Hidden options.
* Harder to scan.
* Poor keyboard accessibility.
* Difficult wrapping on desktop.

Vertical chips:

```
○ Compare

○ Construction

○ Price

○ Amenities
```

are immediately visible and easier to read.

---

# Interaction

Clicking a chip does **not** insert text into the input.

Instead it behaves like

```
User Message

"Compare Elite X to nearby projects."
```

The chat receives it instantly, preserving a clean conversational flow.

---

# State Management

Each assistant message owns its own suggestions:

```
Message
{
    id,
    content,
    suggestions[]
}
```

When a new assistant message arrives:

```
Old message
    suggestions remain with that message

New message
    gets its own suggestions
```

Only the latest message's suggestions are typically visible, reducing clutter.

---

# Motion

The animation is intentionally subtle:

1. Assistant response finishes streaming.
2. A short delay (~150–250 ms).
3. Chips fade in while translating upward a few pixels.
4. Hover gently brightens the background.
5. Click briefly darkens the chip before sending the next prompt.

This sequencing makes the response feel complete before the guidance appears.

---

# How I'd evolve this for RealtyPals

NotebookLM treats chips mostly as **follow-up questions**.

RealtyPals can make them much more powerful by treating them as a **conversation control system** with four distinct groups:

```
Clarify
• Budget
• BHK
• Sector

Explore
• Price History
• Builder Reputation
• Floor Plans

Analyze
• Investment Score
• Rental Yield
• Compare
• Hidden Costs

Act
• Save
• Schedule Visit
• Share
• Contact Builder
```

Instead of only asking "what next?", the chips would progressively guide the user from **discovery → evaluation → decision → action**. That aligns much better with the real estate buying journey and would make the chat feel less like a Q&A tool and more like an intelligent advisor.
