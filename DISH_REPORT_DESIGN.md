# DISH REPORT — Design System & Build Brief
## Read this file before touching any frontend code.

---

## Who This Product Is For

Jake, 34. Standing outside a food hall in San Diego on a Saturday afternoon with his girlfriend. Hungry, slightly indecisive, phone in one hand. Has 60 seconds of patience before someone suggests Yelp. Dish Report gives him a confident answer faster than he could form the question properly.

Also: Maria, 28, planning Friday dinner from her couch on Tuesday. Has time to go deep. Wants to build a list, save the best spots, compare two neighborhoods.

Design for Jake first. Maria benefits automatically. Jake does not benefit from designing for Maria first.

---

## The One Design Principle

**Clarity is the product.**

Every decision — spacing, color, font size, interaction — asks one question: does this make the answer clearer or does it add noise? If it adds noise, remove it. The intelligence is in the algorithm. The UI's job is to get out of the way and deliver that intelligence with confidence.

---

## What This Is Not

- Not a social app. No feeds, no follower counts, no activity streams.
- Not a content site. No articles, no listicles, no editorial voice competing with the results.
- Not a map app. Geography is a filter, not the interface.
- Not a chatbot. No emoji. No "Great question!" energy. No AI-looking output.
- Not Yelp. Never cluttered. Never noisy. Never generic.

---

## Visual Language

### The feeling in three words
**Confident. Clean. Earned.**

Results feel like they came from someone who has been everywhere and remembers everything. The UI reflects that — no hedging, no decoration for its own sake, no trying too hard. Like a great local food critic who texts you back in two sentences and is always right.

### Light mode is default
Most premium food and lifestyle products default to light. It signals cleanliness, appetite, freshness. Dark mode is available as a toggle and is equally considered — not an afterthought.

### Photography is the hero
When photos exist, they dominate. No competing decorative elements. The UI frames the photo and steps back.

---

## Color System

### Light Mode

```
Background (page):     #F7F4F0   warm off-white, never cold gray
Surface (cards):       #FFFFFF   pure white with shadow for elevation
Surface elevated:      #FDFCFB   slightly warmer for nested cards
Border:                #E8E3DC   warm, barely visible
Border strong:         #D4CBC0   for active states and dividers

Text primary:          #1C1917   near-black, warm not cold
Text secondary:        #6B6560   warm mid-gray
Text tertiary:         #A89F99   light labels, metadata
Text disabled:         #C8C2BC

Accent (amber):        #C8860A   brand color, primary actions
Accent hover:          #A86E08   darker on hover
Accent light:          #FDF3E3   amber tint for backgrounds
Accent border:         #F0D5A0   amber border

Score excellent:       #1A7A3C   8.0 and above
Score good:            #2D6A4F   7.0 to 7.9
Score average:         #B45309   6.0 to 6.9
Score below:           #9B1C1C   below 6.0

Success:               #166534
Error:                 #991B1B
Warning:               #92400E
Info:                  #1E40AF
```

### Dark Mode

```
Background (page):     #0F0F0F
Surface (cards):       #1A1A1A
Surface elevated:      #232323
Border:                #2C2C2C
Border strong:         #3A3A3A

Text primary:          #F0EDE8
Text secondary:        #9A9390
Text tertiary:         #6B6866
Text disabled:         #4A4846

Accent (amber):        #FFB800   brighter for dark backgrounds
Accent hover:          #FFC933
Accent light:          #2A2010
Accent border:         #4A3810

Score excellent:       #2ECC71
Score good:            #52D68A
Score average:         #F59E0B
Score below:           #EF4444
```

### What amber means
Amber is the only accent color. It appears on:
- Primary action buttons
- Active states
- Score rings and numbers (when score warrants it)
- Brand name in header
- Links

It does not appear decoratively. Every amber element is interactive or informational.

---

## Typography

### Font Stack

```
Display (restaurant names, hero text):
  Font: "Playfair Display", Georgia, serif
  Use: Restaurant names on cards, page headers, score callouts
  Why: Editorial authority. Signals premium without trying hard.

Interface (buttons, labels, navigation, inputs):
  Font: "Inter", -apple-system, sans-serif
  Weights: 400 (body), 500 (labels), 600 (buttons), 700 (emphasis)
  Why: Invisible when working perfectly. Universally readable.

Data (scores, addresses, hours, tags, metadata):
  Font: "IBM Plex Mono", "Courier New", monospace
  Use: Scores, coordinates, times, short tags
  Why: Numbers read as numbers. Metadata reads as metadata.
  
Body (verdicts, descriptions, reviews):
  Font: "DM Sans", Inter, sans-serif
  Weight: 400
  Line height: 1.65
  Why: Warm and readable at paragraph length.
```

### Type Scale

```
Display XL:   48px / 52px    Restaurant name on deep dive hero
Display L:    36px / 40px    Page section headers
Display M:    28px / 32px    Restaurant name on card
Heading:      22px / 28px    Section labels, panel headers
Body L:       17px / 26px    Verdicts, descriptions
Body:         15px / 22px    Standard body copy
Body S:       13px / 18px    Secondary information
Caption:      12px / 16px    Timestamps, metadata
Label:        11px / 14px    Tags, badges — always uppercase + tracked
Score:        32px / 32px    IBM Plex Mono, bold
```

### Type rules
- Never use more than three type sizes on one screen
- Labels are always uppercase with 0.08em letter spacing
- Score numbers are always IBM Plex Mono
- Restaurant names are always Playfair Display
- Everything else is Inter or DM Sans
- Line lengths max at 68 characters for readability

---

## Spacing System

Base unit: 4px. Everything is a multiple of 4.

```
4px    micro gaps (icon to label)
8px    tight (within a component)
12px   compact (between related elements)
16px   standard (card padding, section gaps)
24px   comfortable (between cards)
32px   section breathing room
48px   major section breaks
64px   page-level breathing room
```

### Margins
- Mobile: 16px horizontal page margin
- Tablet: 24px
- Desktop: Max content width 1024px, centered, 32px margin

---

## Elevation and Shadow

Depth communicates hierarchy. Use shadow to lift cards off the background, not borders.

```
Level 0 — flat:        no shadow (background elements)
Level 1 — resting:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
Level 2 — raised:      0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)
Level 3 — floating:    0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)
Level 4 — overlay:     0 16px 48px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.10)
```

Dark mode: reduce opacity by 40% on all shadows. Add subtle border instead.

---

## Component Patterns

### The Search Bar

The most important element on the page. Always visible. Always accessible.

```
Height:           52px mobile, 56px desktop
Border radius:    12px
Background:       white (light) / #232323 (dark)
Border:           1.5px solid Border color
Border focus:     1.5px solid Accent amber
Shadow focus:     0 0 0 3px Accent light
Placeholder:      "Search a dish, cuisine, or restaurant..."
Font:             Inter 16px, weight 400
Padding:          0 16px
Left icon:        Search icon, 20px, Text tertiary color
Right:            Filter icon when empty, X icon when has value
```

The search bar parses natural language. Users type anything:
- "best carnitas near me"
- "open after 10pm North Park takeout"
- "Juniper & Ivy deep dive"
- "ramen under $20 San Diego"

One input. Never multiple fields for location, dish, and city separately.

### Restaurant Cards (Search Results)

```
Structure (top to bottom):
  Photo strip:          Full width, 160px tall, object-cover
                        1-3 photos shown as horizontal scroll
                        Location photo first, food photos after
  Content area:         16px padding all sides
    Rank badge:         Small pill, top-left — "1" "2" "3"
    Restaurant name:    Playfair Display, 22px
    Neighborhood:       Inter 13px, Text secondary
    Venue type:         Small uppercase label, Text tertiary
    Score:              IBM Plex Mono 32px bold, Score color
                        Score label beneath: "FOOD SCORE" 10px uppercase
    Must-order preview: 1 dish shown with thumbnail photo
                        "+" count if more ("+2 more")
    Quick actions:      Directions | Photos | Save | More
```

Card states:
- Resting: Level 1 shadow
- Hover/focus: Level 2 shadow, border-color shifts to amber
- Expanded: Level 3 shadow, card grows to show full content

Cards never navigate to a new page. They expand in place.

### Score Display

Not a ring. A confident number.

```
Large (deep dive):
  Score number:   48px IBM Plex Mono bold, Score color
  "/10":          20px IBM Plex Mono, Text tertiary
  Label:          12px Inter uppercase tracked, Text tertiary
  "FOOD SCORE"

Medium (card):
  Score number:   32px IBM Plex Mono bold, Score color
  Label omitted at this size

Small (compact list):
  Score number:   16px IBM Plex Mono bold, Score color
```

Score colors communicate instantly:
- 8.0+ green — seek this out
- 7.0-7.9 amber — worth going
- 6.0-6.9 orange — situational
- Below 6.0 red — proceed with information

### Loading State — The Progress Tracker

Replace the spinner. Show a vertical stepper with real progress and honest language.

```
Structure:
  Step indicator:    Small circle, fills as step completes
  Step label:        Short, specific, slightly human
  Step detail:       One line beneath, explains what's happening

Steps and language:
  1. "Reading your search"
     Parsing what you're looking for

  2. "Finding candidates"
     Scanning restaurants in the area

  3. "Pulling reviews"
     Collecting what people actually said

  4. "Filtering the noise"
     Removing parking complaints and wait time rants

  5. "Extracting food signal"
     Finding what matters — flavor, technique, consistency

  6. "Scoring and ranking"
     Ranking by food quality alone

  7. "Building your report"
     Almost there
```

Steps animate in sequence. Completed steps show a checkmark. Current step pulses gently. Time estimates shown if over 10 seconds. The whole component is centered, generous whitespace, large enough to read from arm's length.

Background persistence: search continues even if tab is backgrounded. On return, show "Your results are ready" state rather than failed state.

### Deep Dive Layout

```
Hero:
  Restaurant name:    Playfair Display, large
  Neighborhood:       Inter, secondary color
  Score:              Large score display, right-aligned
  Vibe tags:          Pills, small, no emoji — text only
  Photos:             Horizontal scroll strip, food-first
  Actions:            Directions | Save | Share | Add to list

Sections (vertical scroll):
  Must Orders:        Each with food photo thumbnail
                      Name, why it's the move
                      Dine-in vs takeout note if relevant

  Also Worth Trying:  Compact list
  Skip These:         Compact list, muted treatment
  Insider Tips:       Highlighted differently, blue tint
  The Verdict:        Full paragraph, DM Sans body
  Nearby:             Slide-in panel, not a new search
```

### Navigation

No tabs. No bottom bar. A single persistent header.

```
Header (mobile):
  Left:    Back arrow (when history exists) + Dish Report wordmark
  Center:  Search bar (slightly compressed)
  Right:   Profile avatar or Sign In

Header (desktop):
  Left:    Dish Report wordmark
  Center:  Full search bar
  Right:   Browse | Lists | Profile

Back navigation:
  Physical back arrow in header, always visible when there's history
  Swipe right on mobile to go back (standard gesture)
  Nothing is lost — results stay in memory for the session
```

---

## Photography Rules

**Thumbnail (card header):**
Location exterior or interior shot. Never a logo. Never a menu photo. Aspect ratio 16:9.

**Must-order dish photo:**
Food only. No hands, no context, no table setting if avoidable. Square crop. 80px on cards, 200px on deep dive.

**Deep dive hero strip:**
First photo: best exterior or interior shot to establish place
Second onwards: food photos only, the dishes mentioned in must-orders first

**Lightbox:**
Tap any photo to open fullscreen overlay. Black background. Left/right swipe or arrow keys. Tap outside or X to close. No page navigation.

**When no photo exists:**
Show a clean placeholder — restaurant initial in a warm gray square. No broken image icons. No "photo coming soon" text.

---

## Interaction and Motion

Less is more. Motion should:
- Confirm an action happened
- Guide attention to new content
- Provide continuity between states

Never use motion to:
- Show off
- Fill time
- Add complexity

```
Micro transitions:    150ms ease-out (hover states, toggles)
Card expansion:       250ms ease-out
Panel slide-in:       300ms ease-out  
Page-level:           200ms ease-in-out
Loading pulse:        2s ease-in-out infinite (subtle, not distracting)
```

Card expansion: cards grow from their resting position downward. Other cards push down smoothly. No jarring jumps.

Panel slide-in (compare nearby, filters): slides in from the right on desktop, up from the bottom on mobile. Content behind is dimmed but still visible.

---

## Form and Input Rules

Search bar:
- Spellcheck suggestion appears below bar before firing: "Did you mean: ramen?" — one tap to accept
- Search can be stopped while running — small X in bar, returns to editable state
- Filters appear as a bottom sheet when filter icon is tapped

Filter options:
- Open now
- Dine-in / Takeout / Delivery
- Price range ($, $$, $$$, $$$$)
- Radius (0.5mi, 1mi, 2mi, 5mi, 10mi, 25mi)
- Time of day (Breakfast, Lunch, Dinner, Late Night)
- Cuisine type (multi-select)

Filters are applied as tags below the search bar. Tapping a tag removes it.

---

## Voice and Copy Rules

**No emoji anywhere in the interface.** Not in categories, not in labels, not in loading states, not in placeholders.

**No AI-sounding language.** Avoid: "Great!", "I found...", "Based on my analysis...", "Here are some options..."

**Use direct, confident language:**
- "Must order" not "You might want to try"
- "Skip this" not "Some reviewers felt this could be improved"
- "Open until 2am" not "Hours may vary"
- "7 reviews mention the brisket" not "Many people talked about brisket"

**Score labels:**
- 9.0+ "Exceptional"
- 8.0-8.9 "Excellent"  
- 7.0-7.9 "Very Good"
- 6.0-6.9 "Good"
- 5.0-5.9 "Mixed"
- Below 5.0 "Below Average"

**Button copy:**
- "Deep Dive" not "Learn More" or "See Details"
- "Directions" not "Get Directions" or "Navigate"
- "Compare Nearby" not "See Similar" or "Compare"
- "Save" not "Add to Favorites" or "Bookmark"
- "Sign In" not "Log In" or "Login"

---

## Mobile-Specific Rules

- Minimum tap target: 44x44px for every interactive element
- Search bar always reachable from thumb — never buried
- No horizontal scroll except in photo strips and category browse
- Cards are full width minus 16px margins
- Score numbers large enough to read at arm's length
- No hover-only states — everything discoverable by tap
- Loading states never block interaction with already-loaded content

---

## What Never Appears

- Emoji in any interface element
- Star ratings (we use numeric scores)
- User-generated reviews displayed directly (we extract signal, not quote)
- Ads or sponsored placements
- Recommended for you (until personalization is built properly)
- Social sharing counts or like buttons
- Infinite scroll without clear section breaks
- Auto-playing video
- Cookie banners more intrusive than a single line
- Modals that appear without user action
- More than one primary action button per screen

---

## Dine-In vs Takeout Mode

This is a genuine differentiator. No other food intelligence product does this.

When a search includes takeout intent (keywords: "takeout", "delivery", "to go", "order", "pickup") or when the user selects Takeout in filters:

- Review extraction specifically looks for mentions of food quality after travel
- Packaging, temperature retention, and container quality are signal (not noise)
- If a place is "dine-in only" quality — meaning it's exceptional in-person but mediocre when delivered — this is flagged prominently
- Delivery platform availability is displayed (DoorDash, Uber Eats, Grubhub)
- Score may differ from dine-in score with explicit label: "Takeout Score: 6.4 / Dine-in Score: 8.1"

---

## GPS and Location Intelligence

On first visit with no search:
- Request location permission with clear one-line explanation: "So we can show what's great near you"
- If granted: auto-detect city, show 3 suggested searches based on time of day
  - Before noon: "Best breakfast near [neighborhood]"
  - Noon to 3pm: "Best lunch under $15 near you"
  - After 6pm: "Top dinner spots open now"
  - After 10pm: "Open late near you"
- If denied: show empty search bar with placeholder, city field in filters

---

## Version Display

Version number displayed in footer, small, IBM Plex Mono, Text tertiary color.
Format: v1.2.0
Updated with every merge to master.

Version naming convention:
- v1.x.x = Path 1 features
- v1.1.0 = Login system
- v1.2.0 = This redesign
- v1.3.0 = GPS + unified search
- v1.4.0 = Dine-in/takeout mode
- v2.0.0 = Path 2 (revenue, caching at scale)

---

## Claude Code Instructions

When building any frontend component for Dish Report:

1. Read this entire file first
2. Default to light mode. Dark mode is a toggle.
3. Use the exact color values specified — do not approximate
4. Use the exact font stack specified — load from Google Fonts
5. No emoji anywhere
6. Every interactive element minimum 44x44px touch target
7. Cards expand in place — no page navigation for results
8. The search bar is always visible
9. Loading states use the progress tracker pattern, not spinners
10. Photography is always object-cover, never stretched or distorted
11. Score numbers are always IBM Plex Mono
12. Restaurant names are always Playfair Display
13. Copy follows the voice rules — direct, confident, no AI language
14. Test every component at 375px width (iPhone SE) before considering it done
15. Shadows create elevation — not borders alone
16. Motion is 150-300ms, ease-out, purposeful
17. When in doubt: more space, less decoration

---

*Last updated: May 2026*
*Version: applies from v1.2.0 onwards*
