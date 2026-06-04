Full App Test Guide — Demo Readiness Audit
  
  Start the app first:
  cd C:\Users\Furqan\Desktop\RealtyPalsxElite\frontend
  npm run dev
  Open http://localhost:3000 in Chrome. 
  
  ---
  🔐 Step 1 — Auth & Login

  - Action: You should land on /auth. Enter credentials and log in.
  - Pass: Redirected to /discover. Sidebar visible on left.
  - Fail: Blank screen or error.

  ---                                                                                                                                                   🏠 Step 2 — Welcome Screen (First State)                                                                                                                                                                                                                                                                  
  Location: Center of screen
  - [ ] Big heading "Find your perfect property" visible
  - [ ] 4 suggestion chips visible in a 2×2 grid (e.g. "Show me 3BHK under 1.5 Cr in Noida")
  - [ ] Input box at the bottom center with placeholder cycling text
  - [ ] Top right of header: dark/light mode toggle visible
  - [ ] Left sidebar: Logo, "New Chat" button, menu items, "Recent" section

  ---
  💬 Step 3 — Basic Chat Flow

  Action: Click any suggestion chip (e.g. "Show me 3BHK under 1.5 Cr in Noida")

  - [ ] Chip click → message appears in chat as blue bubble (right side)
  - [ ] AI avatar (logo) appears on left with animated thinking indicator
  - [ ] "Searching properties..." loader shows briefly
  - [ ] Property cards appear with stagger animation — cards fade in one by one from bottom (0.07s delay each). Should NOT pop in all at once.        
  - [ ] Top of card: status badge (Ready/Under Construction/New Launch)
  - [ ] Top right of card: RERA badge ("RERA ✓") if project is RERA-registered — NEW
  - [ ] Below price: possession badge + RERA trust badge in that same flex row — NEW
  - [ ] Bottom of card: "View Details", phone icon, WhatsApp icon, sparkle AI icon
  - [ ] AI text response appears below cards (2-3 sentences)

  ---
  🏗️ Step 4 — Property Card Interactions

  Pick any property card:

  - [ ] Hover: Card lifts up slightly (translate-y)
  - [ ] Image: Auto-advances carousel every 3.5s if multiple images
  - [ ] Hover image: Left/right arrow controls appear
  - [ ] Bottom left: Bookmark icon — click it → turns red ("Property saved ✓" toast appears bottom of screen)
  - [ ] Sparkle icon (bottom right of actions): Click → chat input fills with "Tell me more about [Project Name]..."
  - [ ] WhatsApp icon: Opens WhatsApp link in new tab

  ---
  🗺️ Step 5 — Map View

  Location: Below property cards, a "View on map" button

  - [ ] Button text: "🗺️ View on map — X properties"
  - [ ] Click it: Map expands below — should load with greyscale dark pins (no blue pins anymore)
  - [ ] No crash/white screen (error boundary working)
  - [ ] Map shows all property pins with popup on click
  - [ ] Click again: "Hide map" — map collapses

  ---
  📋 Step 6 — Property Detail Panel (1E fix)

  Click "View Details" on any property card

  - [ ] Animation: Panel slides in from RIGHT smoothly — NO bounce/spring effect. Should be a clean ease-out slide.
  - [ ] While loading: 4-section skeleton shows (grey animated placeholders for title, 3-col stats, connectivity rows, description) — NOT a spinner   
  - [ ] After load: Content fills in
  - [ ] Top of panel: Hero image with status badge (top left) + RERA badge (top right) + close X button (far right)
  - [ ] Image dots: Multiple dots below hero if multiple images — click to advance

  Test all 6 tabs (pill tab bar below the image):

  ┌───────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  
  │    Tab    │                                                            What to see                                                             │  
  ├───────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
  │ Overview  │ Key stats grid, connectivity list, price trends card (if Sector 150/137/78), AQI widget, commute teaser row, market comparison     │  
  ├───────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
  │ Units     │ BHK cards with area/price, floor plan image or "Not available" placeholder                                                         │  
  ├───────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
  │ Amenities │ Icons in greyscale — Dumbbell (sports), Star (lifestyle), Leaf (wellness), Baby (kids), SealCheck (security), Car (parking). All   │  
  │           │ grey, not colored.                                                                                                                 │  
  ├───────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
  │ Builder   │ Builder name, founded year, delivered units, CREDAI badge, awards, website link, reputation card                                   │  
  ├───────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
  │ Commute   │ NEW enhanced calculator — see Step 7                                                                                               │  
  ├───────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤  
  │ Docs      │ Upload brochure → ask AI questions                                                                                                 │  
  └───────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  

  - [ ] Bottom of panel: "Book Site Visit" blue button + "WhatsApp Us" green button
  - [ ] Book Site Visit: Click → site visit modal opens (bottom sheet on mobile, centered on desktop)
  - [ ] Close panel: X button top right, or click backdrop (dark area left of panel)

  ---
  🚗 Step 7 — Commute Calculator (Enhanced)

  Location: Inside property panel → Commute tab

  - [ ] "Commute Calculator" header with greyscale route icon
  - [ ] Property address shown as grey origin pill
  - [ ] If first time: Input field with MapPin icon, placeholder "Your office / destination..."
  - [ ] Type "Connaught Place, Delhi" → suggestions dropdown appears (Google Places)
  - [ ] Select a suggestion → click "Go" button (dark button, right side)
  - [ ] Results appear:
    - By Car card: grey Car icon, drive time (big number), distance
    - By Metro/Transit card: grey Train icon, transit time
    - Nearby Metro Stations: grey Subway icons, station names
  - [ ] Close panel, reopen any property → go to Commute tab
  - [ ] "Saved office" blue pill appears at top with your previous office — click it → auto-calculates instantly (NO need to retype)

  ---
  ⚖️ Step 8 — Comparison Feature

  From follow-up chips (after getting property results):

  - [ ] Chip row visible below last AI message: "Book Site Visit", "Get Callback", "Calculate EMI", "Compare" (if 2+ properties), + possibly "Builder 
  delivery risk?" or "Why still available?" chips
  - [ ] Click "⚖️ Compare" chip → dropdown appears showing all shortlisted properties
  - [ ] Select 2 properties (checkboxes) → "Compare 2 properties →" button appears
  - [ ] Click it → comparison table renders in chat

  Test comparison table (T7 fix):
  - [ ] Two mini property cards at top with images
  - [ ] Rows below: Starting Price, Status, Possession, RERA, ₹/sqft (NEW row)
  - [ ] Winner side glows green (bg-emerald-50), loser side is grey
  - [ ] Checkmark ✓ appears on winning side
  - [ ] Label (e.g. "PRICE") in center column between values

  ---
  🏙️ Step 9 — Out-of-Scope City Test (1C fix)

  In chat input, type: "Show me 3BHK in DLF Phase 1 Gurgaon"

  - [ ] AI should NOT show "I'm having trouble right now" error
  - [ ] AI should NOT show infinite loading
  - [ ] AI searches web → responds with Gurgaon market overview (price ranges, key areas)
  - [ ] AI then bridges: "My live inventory is in Noida..." + suggests comparable Noida options
  - [ ] Test with: "Show flats in Bandra Mumbai" — same graceful handling

  ---
  📅 Step 10 — Smart Contextual Chips (T9)

  After getting under-construction properties:
  - [ ] "🏗️ Builder delivery risk?" chip appears in follow-up row
  - [ ] Click it → property picker opens → select a property → AI responds with delivery risk analysis

  After getting ready-to-move properties:
  - [ ] "🔑 Why still available?" chip appears
  - [ ] Click it → AI explains why the RTM property may still be on market

  ---
  🔄 Step 11 — Session Switching (1A/1B fix)

  Critical test — was broken before:

  1. Start a chat, send 2-3 messages about Sector 150
  2. Left sidebar → Recent section: Previous sessions listed with titles
  3. Click a DIFFERENT session from the list
  4. Pass: Chat clears instantly, new session's messages load, URL stays /discover
  5. Fail: Nothing happens, old chat stays, or page reloads

  Also test:
  - [ ] Sidebar "New Chat" button → chat clears, welcome screen shows
  - [ ] URL: /discover?new=1 → fresh chat

  ---
  🔔 Step 12 — Follow-up Chip Actions

  After getting property results, test each chip:

  ┌─────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
  │          Chip           │                                 Expected                                 │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ 📅 Book Site Visit      │ Property picker → select → site visit form sheet opens                   │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ 📞 Get Callback         │ Property picker → select → callback form (name + phone) opens            │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ 📊 Calculate EMI        │ Property picker → select → AI calculates EMI breakdown in markdown table │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ 🏗️ Builder track record │ Property picker → select → AI pulls web data on builder                  │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ 📍 Area overview        │ Property picker → select → AI gives area guide                           │
  └─────────────────────────┴──────────────────────────────────────────────────────────────────────────┘

  ---
  💾 Step 13 — Saved Properties

  - [ ] Save a property via bookmark icon on card
  - [ ] Left sidebar → "Saved Property" → click it
  - [ ] Saved properties page shows your bookmarked items
  - [ ] Click any → property page opens

  ---
  🔢 Step 14 — Calculator (EMI/Stamp Duty)

  Left sidebar → "Value Estimator":
  - [ ] Page loads with value estimator tool
  - [ ] Or: in chat, type "Calculate EMI for 1.5 Cr at 8.5% for 20 years" → AI returns EMI table

  + button (reset/new chat button in input bar):
  - [ ] Circular button left of input → click → hover shows rotate animation
  - [ ] Clicking starts new chat

  ---
  📱 Step 15 — Mobile Responsive (resize browser to 375px wide)

  - [ ] Hamburger menu button appears top left (replaces sidebar)
  - [ ] Click hamburger → sidebar slides in from left
  - [ ] Property cards swipe horizontally (snap scroll)
  - [ ] Chat input fixed at bottom, doesn't overlap content
  - [ ] Property detail panel = full screen bottom sheet

  ---
  🌙 Step 16 — Dark Mode

  Top right corner of header → moon/sun icon:
  - [ ] Toggle → UI switches to dark theme
  - [ ] Chat bubbles, cards, panel all switch cleanly
  - [ ] No white flashes or invisible text
  - [ ] Commute result cards dark background

  ---
  🌙 Step 16 — Dark Mode

  Top right corner of header → moon/sun icon:
  - [ ] Toggle → UI switches to dark theme
  - [ ] Chat bubbles, cards, panel all switch cleanly
  - [ ] No white flashes or invisible text
  - [ ] Commute result cards dark background
  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  Go to /admin:
  - [ ] Project list loads
  - [ ] Can view/edit a project
  - [ ] Image upload works

  ---
  ✅ Final Checklist Before Demo
  placeholder "Your office / destination..."
  - [ ] Type "Connaught Place, Delhi" → suggestions  
  dropdown appears (Google Places)
  - [ ] Select a suggestion → click "Go" button (dark
  button, right side)
  - [ ] Results appear:
    - By Car card: grey Car icon, drive time (big    
  number), distance
    - By Metro/Transit card: grey Train icon, transit
  time
    - Nearby Metro Stations: grey Subway icons,      
  station names
  - [ ] Close panel, reopen any property → go to     
  Commute tab
  - [ ] "Saved office" blue pill appears at top with 
  your previous office — click it → auto-calculates  
  instantly (NO need to retype)

  ---
  ⚖️ Step 8 — Comparison Feature

  From follow-up chips (after getting property       
  results):

  - [ ] Chip row visible below last AI message: "Book
  Site Visit", "Get Callback", "Calculate EMI",      
  "Compare" (if 2+ properties), + possibly "Builder  
  delivery risk?" or "Why still available?" chips    
  - [ ] Click "⚖️ Compare" chip → dropdown appears   ─
  showing all shortlisted properties
  - [ ] Select 2 properties (checkboxes) → "Compare 2
  properties →" button appears
  - [ ] Click it → comparison table renders in chat  

  Test comparison table (T7 fix):
  - [ ] Two mini property cards at top with images   
  - [ ] Rows below: Starting Price, Status,
  Possession, RERA, ₹/sqft (NEW row)
  - [ ] Winner side glows green (bg-emerald-50),     
  loser side is grey
  - [ ] Checkmark ✓ appears on winning side
  - [ ] Label (e.g. "PRICE") in center column between
  values

  ---
  🏙️ Step 9 — Out-of-Scope City Test (1C fix)        

  In chat input, type: "Show me 3BHK in DLF Phase 1  
  Gurgaon"

  - [ ] AI should NOT show "I'm having trouble right 
  now" error
  - [ ] AI should NOT show infinite loading
  - [ ] AI searches web → responds with Gurgaon      
  market overview (price ranges, key areas)
  - [ ] AI then bridges: "My live inventory is in    
  Noida..." + suggests comparable Noida options      
  - [ ] Test with: "Show flats in Bandra Mumbai" —   
  same graceful handling

  ---
  📅 Step 10 — Smart Contextual Chips (T9)

  After getting under-construction properties:       
  - [ ] "🏗️ Builder delivery risk?" chip appears in  
  follow-up row
  - [ ] Click it → property picker opens → select a  
  property → AI responds with delivery risk analysis 

  After getting ready-to-move properties:
  - [ ] "🔑 Why still available?" chip appears       
  - [ ] Click it → AI explains why the RTM property  
  may still be on market

  ---
  🔄 Step 11 — Session Switching (1A/1B fix)

  Critical test — was broken before:

  1. Start a chat, send 2-3 messages about Sector 150
  2. Left sidebar → Recent section: Previous sessions
  listed with titles
  3. Click a DIFFERENT session from the list
  4. Pass: Chat clears instantly, new session's      
  messages load, URL stays /discover
  5. Fail: Nothing happens, old chat stays, or page  
  reloads

  Also test:
  - [ ] Sidebar "New Chat" button → chat clears,     
  welcome screen shows
  - [ ] URL: /discover?new=1 → fresh chat

  ---
  🔔 Step 12 — Follow-up Chip Actions

  After getting property results, test each chip:    

  ┌───────────────┬──────────────────────────────┐   
  │     Chip      │           Expected           │   
  ├───────────────┼──────────────────────────────┤   
  │ 📅 Book Site  │ Property picker → select →   │   
  │ Visit         │ site visit form sheet opens  │   
  ├───────────────┼──────────────────────────────┤   
  │ 📞 Get        │ Property picker → select →   │   
  │ Callback      │ callback form (name + phone) │   
  │               │  opens                       │   
  ├───────────────┼──────────────────────────────┤   
  │ 📊 Calculate  │ Property picker → select →   │   
  │ EMI           │ AI calculates EMI breakdown  │   
  │               │ in markdown table            │   
  ├───────────────┼──────────────────────────────┤   
  │ 🏗️ Builder    │ Property picker → select →   │   
  │ track record  │ AI pulls web data on builder │   
  ├───────────────┼──────────────────────────────┤   
  │ 📍 Area       │ Property picker → select →   │   
  │ overview      │ AI gives area guide          │   
  └───────────────┴──────────────────────────────┘   

  ---
  💾 Step 13 — Saved Properties

  - [ ] Save a property via bookmark icon on card    
  - [ ] Left sidebar → "Saved Property" → click it   
  - [ ] Saved properties page shows your bookmarked  
  items
  - [ ] Click any → property page opens

  ---
  🔢 Step 14 — Calculator (EMI/Stamp Duty)

  Left sidebar → "Value Estimator":
  - [ ] Page loads with value estimator tool
  - [ ] Or: in chat, type "Calculate EMI for 1.5 Cr  
  at 8.5% for 20 years" → AI returns EMI table       

  + button (reset/new chat button in input bar):     
  - [ ] Circular button left of input → click → hover
  shows rotate animation
  - [ ] Clicking starts new chat

  ---
  📱 Step 15 — Mobile Responsive (resize browser to  
  375px wide)

  - [ ] Hamburger menu button appears top left       
  (replaces sidebar)
  - [ ] Click hamburger → sidebar slides in from left
  - [ ] Property cards swipe horizontally (snap      
  scroll)
  - [ ] Chat input fixed at bottom, doesn't overlap  
  content
  - [ ] Property detail panel = full screen bottom   
  sheet

  ---
  🌙 Step 16 — Dark Mode

  Top right corner of header → moon/sun icon:        
  - [ ] Toggle → UI switches to dark theme
  - [ ] Chat bubbles, cards, panel all switch cleanly
  - [ ] No white flashes or invisible text
  - [ ] Commute result cards dark background
  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  Go to /admin:
  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  Go to /admin:
  - [ ] Project list loads
  - [ ] Can view/edit a project
  - [ ] Image upload works

  - [ ] Sidebar "New Chat" button → chat clears, welcome screen shows  
  - [ ] URL: /discover?new=1 → fresh chat

  ---
  🔔 Step 12 — Follow-up Chip Actions

  After getting property results, test each chip:

  ┌──────────────────┬─────────────────────────────────────────────┐   
  │       Chip       │                  Expected                   │   
  ├──────────────────┼─────────────────────────────────────────────┤   
  │ 📅 Book Site     │ Property picker → select → site visit form  │   
  │ Visit            │ sheet opens                                 │   
  ├──────────────────┼─────────────────────────────────────────────┤   
  │ 📞 Get Callback  │ Property picker → select → callback form    │   
  │                  │ (name + phone) opens                        │   
  ├──────────────────┼─────────────────────────────────────────────┤   
  │ 📊 Calculate EMI │ Property picker → select → AI calculates    │   
  │                  │ EMI breakdown in markdown table             │   
  ├──────────────────┼─────────────────────────────────────────────┤   
  │ 🏗️ Builder track │ Property picker → select → AI pulls web     │   .
  │  record          │ data on builder                             │   
  ├──────────────────┼─────────────────────────────────────────────┤   
  │ 📍 Area overview │ Property picker → select → AI gives area    │   
  │                  │ guide                                       │   
  └──────────────────┴─────────────────────────────────────────────┘   

  ---
  💾 Step 13 — Saved Properties

  - [ ] Save a property via bookmark icon on card
  - [ ] Left sidebar → "Saved Property" → click it
  - [ ] Saved properties page shows your bookmarked items
  - [ ] Click any → property page opens

  ---
  🔢 Step 14 — Calculator (EMI/Stamp Duty)

  Left sidebar → "Value Estimator":
  - [ ] Page loads with value estimator tool
  - [ ] Or: in chat, type "Calculate EMI for 1.5 Cr at 8.5% for 20     
  years" → AI returns EMI table

  + button (reset/new chat button in input bar):
  - [ ] Circular button left of input → click → hover shows rotate     
  animation
  - [ ] Clicking starts new chat

  ---
  📱 Step 15 — Mobile Responsive (resize browser to 375px wide)        

  - [ ] Hamburger menu button appears top left (replaces sidebar)      
  - [ ] Click hamburger → sidebar slides in from left
  - [ ] Property cards swipe horizontally (snap scroll)
  - [ ] Chat input fixed at bottom, doesn't overlap content
  - [ ] Property detail panel = full screen bottom sheet

  ---
  🌙 Step 16 — Dark Mode

  Top right corner of header → moon/sun icon:
  - [ ] Toggle → UI switches to dark theme
  - [ ] Chat bubbles, cards, panel all switch cleanly
  - [ ] No white flashes or invisible text
  - [ ] Commute result cards dark background
  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  ---
  📊 Step 17 — Admin Panel (if applicable)

  Go to /admin:
  - [ ] Project list loads
  - [ ] Can view/edit a project
  - [ ] "🔑 Why still available?" chip appears
  - [ ] Click it → AI explains why the RTM property may still be on 
  market

  ---
  🔄 Step 11 — Session Switching (1A/1B fix)

  Critical test — was broken before:

  1. Start a chat, send 2-3 messages about Sector 150
  2. Left sidebar → Recent section: Previous sessions listed with   
  titles
  3. Click a DIFFERENT session from the list
  4. Pass: Chat clears instantly, new session's messages load, URL  
  stays /discover
  5. Fail: Nothing happens, old chat stays, or page reloads

  Also test:
  - [ ] Sidebar "New Chat" button → chat clears, welcome screen     
  shows
  - [ ] URL: /discover?new=1 → fresh chat

  ---
  🔔 Step 12 — Follow-up Chip Actions

  After getting property results, test each chip:

  ┌──────────────────┬───────────────────────────────────────────┐  
  │       Chip       │                 Expected                  │  
  ├──────────────────┼───────────────────────────────────────────┤  
  │ 📅 Book Site     │ Property picker → select → site visit     │  
  │ Visit            │ form sheet opens                          │  
  ├──────────────────┼───────────────────────────────────────────┤  
  │ 📞 Get Callback  │ Property picker → select → callback form  │  
  │                  │ (name + phone) opens                      │  
  ├──────────────────┼───────────────────────────────────────────┤  
  │ 📊 Calculate EMI │ Property picker → select → AI calculates  │  
  │                  │ EMI breakdown in markdown table           │  
  ├──────────────────┼───────────────────────────────────────────┤  
  │ 🏗️ Builder track │ Property picker → select → AI pulls web   │  
  │  record          │ data on builder                           │  
  ├──────────────────┼───────────────────────────────────────────┤  
  │ 📍 Area overview │ Property picker → select → AI gives area  │  
  │                  │ guide                                     │  
  └──────────────────┴───────────────────────────────────────────┘  

  ---
  💾 Step 13 — Saved Properties

  - [ ] Save a property via bookmark icon on card
  - [ ] Left sidebar → "Saved Property" → click it
  - [ ] Saved properties page shows your bookmarked items
  - [ ] Click any → property page opens

  ---
  🔢 Step 14 — Calculator (EMI/Stamp Duty)

  Left sidebar → "Value Estimator":
  - [ ] Page loads with value estimator tool
  - [ ] Or: in chat, type "Calculate EMI for 1.5 Cr at 8.5% for 20  
  years" → AI returns EMI table

  + button (reset/new chat button in input bar):
  - [ ] Circular button left of input → click → hover shows rotate  
  animation
  - [ ] Clicking starts new chat

  ---
  📱 Step 15 — Mobile Responsive (resize browser to 375px wide)     

  - [ ] Hamburger menu button appears top left (replaces sidebar)   
  - [ ] Click hamburger → sidebar slides in from left
  - [ ] Property cards swipe horizontally (snap scroll)
  - [ ] Chat input fixed at bottom, doesn't overlap content
  - [ ] Property detail panel = full screen bottom sheet

  ---
  🌙 Step 16 — Dark Mode

  Top right corner of header → moon/sun icon:
  - [ ] Toggle → UI switches to dark theme
  - [ ] Chat bubbles, cards, panel all switch cleanly
  - [ ] No white flashes or invisible text
  - [ ] Commute result cards dark background
  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  - [ ] Commute result cards dark background
  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  Go to /admin:
  - [ ] Project list loads
  - [ ] Can view/edit a project
  - [ ] Image upload works

  - [ ] Or: in chat, type "Calculate EMI for 1.5 Cr at 8.5% for 20 years" → AI returns EMI table

  + button (reset/new chat button in input bar):
  - [ ] Circular button left of input → click → hover shows rotate animation
  - [ ] Clicking starts new chat

  ---
  📱 Step 15 — Mobile Responsive (resize browser to 375px wide)

  - [ ] Hamburger menu button appears top left (replaces sidebar)
  - [ ] Click hamburger → sidebar slides in from left
  - [ ] Property cards swipe horizontally (snap scroll)
  - [ ] Chat input fixed at bottom, doesn't overlap content
  - [ ] Property detail panel = full screen bottom sheet

  ---
  🌙 Step 16 — Dark Mode

  Top right corner of header → moon/sun icon:
  - [ ] Toggle → UI switches to dark theme
  - [ ] Chat bubbles, cards, panel all switch cleanly
  - [ ] No white flashes or invisible text
  - [ ] Commute result cards dark background
  - [ ] Comparison table dark cells

  ---
  📊 Step 17 — Admin Panel (if applicable)

  Go to /admin:
  - [ ] Project list loads
  - [ ] Can view/edit a project
  - [ ] Image upload works

  ---
  ✅ Final Checklist Before Demo

  - [ ] All 6 follow-up chip actions work
  - [ ] Session switching clean (no stale content)
  - [ ] Out-of-scope cities don't error
  - [ ] Map loads without crash
  - [ ] Detail panel slides smooth (no bounce)
  - [ ] Skeleton shows while panel loads
  - [ ] Commute saves office across sessions
  - [ ] Comparison shows green/grey diff
  - [ ] RERA badge visible on property cards
  - [ ] All icons greyscale and unique

  ---
  Run through all of these, note any failures (what you clicked, what happened, what you expected). Send the audit back and I'll  
  fix each one.