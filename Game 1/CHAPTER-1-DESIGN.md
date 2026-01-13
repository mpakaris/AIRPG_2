# CHAPTER 1: ELM STREET INVESTIGATION
## Complete Design Document

**Location**: Elm Street, Bloodhaven
**Estimated Playtime**: 90-120 minutes
**Goal**: Find 3 of 4 evidence pieces proving the abduction was staged

---

## 📱 CHAPTER OPENING

### Sarah Chen's Message

```
*BUZZ* New message.

> USE phone > Check WhatsApp

Sarah Chen:
"Burt, I tried pulling CCTV from the bus station that night.
Cameras were offline. All of them.

I did find something though - a gray van shows up on Elm Street
traffic cams. Repeatedly. For weeks before April 15th.
Might be worth checking out.

Be careful."
```

---

## 🔍 INVESTIGATION CONTEXT

**The Setup:**
- Lili claims Burt abducted her from bus station on April 15, 6:15 PM
- Bus station CCTV was mysteriously offline that night (all cameras)
- Sarah found gray van appearing repeatedly on Elm Street traffic cams (weeks before April 15)
- Van vanished after April 15 (suggests planning/staging)

**Player's Mission:**
- Investigate Elm Street (van's apparent base of operations)
- Find the gray van and identify who operates it
- Gather evidence proving the abduction was staged (not random)
- Discover who Lili was working with

---

## 🎯 THE 4 EVIDENCE PIECES

| # | Evidence | Type | Location | Difficulty | What It Proves |
|---|----------|------|----------|------------|----------------|
| **1** | CCTV Screenshot | Photo | CCTV Building | EASY | Gray van (plate LKJ-9472) was operating on Elm Street → Provides PIN 9472 for Garage #3 |
| **2** | Van Registration Card | Physical Item | Hidden Garage #3 | HARD | Van owned by "Jeremy Miller, 447 Willow Lane" (identifies suspect, provides address) |
| **3** | Recorded Witness Statement | Audio File | Florist Shop (NPC) | MEDIUM | Lili had relationship with obsessed young man (proves staging/collaboration) |
| **4** | Hardware Store Receipt | Physical Item | Electrician's Truck | MEDIUM | "J. Miller" bought abduction supplies April 10 (proves premeditation) |

**Win Condition**: Collect any 3 evidence → USE phone → Send to Sarah → Chapter Complete

**Connected Puzzle**: License plate LKJ-9472 from Evidence 1 provides PIN (9472) to unlock Garage #3 for Evidence 2

---

## 🗺️ ZONE LAYOUT

```
                    ELM STREET (HUB)
                         |
        +----------------+----------------+
        |                |                |
    BUS STOP          KIOSK           FLORIST
   (Type 1)         (Type 1)         (Type 1)
        |                                  |
    PAY PHONE                           (Flavor)
   (Evidence 2)

        |                |                |
   ELECTRICIAN       BUTCHER           ALLEY -----> GARAGES
   (Type 2)         (Type 1)         (Type 1)      (Type 3)
    [Tools]          [Bolt Cutters]     |       [Evidence 3: PIN 9472]
                                   SECRET DOOR
                                        |
                                   DUMPSTER
                                   [Homeless Man]
                                   [Evidence 4]

        |                |
  CONSTRUCTION      CCTV BUILDING
   (Type 2)         (Type 2)
   [Drill Parts]    [Evidence 1: Screenshot]
```

**Total Zones**: 10 locations (9 main + Hidden Garages)

---

## 📍 DETAILED ZONE BREAKDOWN

---

### **ZONE 0: ELM STREET (Hub)**

**Access**: Type 1 (Always unlocked)

**Description**:
"A quiet residential street in the evening. Streetlights cast long shadows. To the north, you see a bus stop. Shops line the sidewalk: a florist, a butcher, a kiosk. An electrician's truck is parked on the curb. A narrow alley opens to the east. Construction scaffolding towers to the south."

**Objects**:
- **Streetlight** (examinable) - "Flickering. The bulb needs replacing."
- **Sidewalk** (examinable) - "Cracked concrete. Gum stains and old graffiti."
- **Street Sign** (readable) - "ELM STREET - EST. 1987"

**Items**:
- **Newspaper** (takeable, readable)
  - Article: "SERIAL KILLER 'THE FLORIST' STRIKES AGAIN - Lili Morgenstern Still Missing"
  - Flavor text, no evidence

**NPCs**: None

**Connections**:
- North → Bus Stop
- East → Alley
- South → Construction Site
- West → Electrician Truck
- Shops: Florist, Butcher, Kiosk (all accessible from hub)

**Tutorial**: Player starts here, reads Sarah's message, learns USE phone mechanics

---

### **ZONE 1: BUS STOP**

**Access**: Type 1 (Unlocked)
**Estimated Time**: 5 minutes (flavor zone, no evidence)

**Description**:
"A weathered bus shelter with cracked plexiglass walls. A wooden bench sits inside. A trash bin overflows nearby. A payphone booth stands at the corner—an oddity in the smartphone era."

**Objects**:
- **Bench** (examinable, sittable) - "Graffiti carved into wood: 'TC + MR 1998'"
- **Trash Bin** (container, openable)
  - Contains: Empty coffee cups, candy wrappers, crumpled receipts (all flavor, no evidence)
- **Bus Schedule** (readable) - "Last bus departs 10:45 PM"
- **Payphone Booth** (examinable)
  - Description: "An old payphone. The handset dangles from a metal cord. Covered in fingerprints and grime from years of use."

**Items**: None (flavor zone only)

**NPCs**: None

**Puzzle**: None (just atmosphere and world-building)

---

### **ZONE 2: ELECTRICIAN TRUCK**

**Access**: Type 2 (Locked - need to distract Electrician)
**Estimated Time**: 15 minutes (distraction puzzle + looting)

**Description**:
"A white work van with 'KOWALSKI ELECTRIC' painted on the side. The back doors are secured with a padlock. Mike Kowalski sits in the driver's seat, scrolling his phone, taking occasional sips from a thermos."

**Objects**:
- **Van Exterior** (examinable) - "Dented bumper. Mud on the tires. License plate: KWL-4429."
- **Van Back Doors** (container, locked initially)
  - **Unlocks when**: Electrician is distracted
  - Contains: Toolbox (nested container)
- **Toolbox** (inside van, container, openable)
  - Contains: Crowbar, Wire Cutters, Lock Pick Set, Electrical Tape, Drill Body (Part 1/3)

**Items** (Inside Toolbox):
- **Crowbar** (tool) - Use at Florist filing cabinet
- **Wire Cutters** (tool) - Use at Alley secret door
- **Lock Pick Set** ⭐ (permanent tool) - Use on mechanical locks throughout game
- **Electrical Tape** (useless flavor item)
- **Drill Body (Part 1/3)** - Combine with Battery + Bit for full drill
- **Hardware Store Receipt** ⭐ **EVIDENCE 4** (folded paper in toolbox)
  - Date: April 10, 2026
  - Items: "Zip ties (heavy duty), Duct tape (industrial), Drop cloth"
  - Credit card: "J. Miller"
  - **Key Detail**: Abduction supplies bought 5 days before incident, same name as van owner!

**NPCs**:
- **Mike Kowalski (Electrician)** - Type 1 → Type 2
  - **Initial State**: "I can't leave my van. Too many tools get stolen around here."
  - **Distraction Puzzle**: AI-judged creativity

**DISTRACTION PUZZLE** (AI-Judged):

Player can try ANY creative distraction. Examples that work:
- "Tell him there's a power outage at the construction site"
- "Offer him coffee from the kiosk"
- "Tell him his brake lights are on"
- "Ask for help with an electrical problem elsewhere"
- "Mention you saw someone messing with power lines"

Examples that DON'T work:
- "Distract him" (too vague)
- "Tell him there's a fire" (too extreme, he'd call 911)
- Generic greetings

**Mechanic**:
```
> TALK TO Mike > "There's a power outage at the construction site"

[AI Agent judges creativity: GOOD]

Mike: "What? Damn it. Those idiots probably tripped
a breaker again. Hold on, I'll check it out."

[Mike leaves van for 5 minutes - player can access toolbox]

> GO TO van back doors
> OPEN doors [Success - unlocked while Mike is away]
> EXAMINE toolbox
> TAKE crowbar, wire cutters, lock pick set, drill body
```

**After Distraction**:
Mike returns, converts to Type 2 (flavor):
- Complains about construction workers
- Mentions union dues
- Talks about rising copper prices

**Reusable**: Player can try multiple distraction attempts if first fails

---

### **ZONE 3: KIOSK**

**Access**: Type 1 (Unlocked)
**Estimated Time**: 5 minutes (item pickup)

**Description**:
"A small convenience kiosk painted bright blue. Magazines and snacks fill the window display. The owner, Ravi, stands behind the counter arranging lottery tickets."

**Objects**:
- **Magazine Rack** (examinable) - Tabloids, newspapers with Lili's story
- **Counter** (examinable) - Lottery tickets, receipt spike, tip jar
- **Snack Display** (container, can take items)
  - Contains: Coffee (free), Candy bars, Energy drinks
- **Back Shelf** (examinable) - Supplies, including fingerprint powder kit

**Items**:
- **Coffee** (takeable) - Use for Electrician distraction (alternative method)
- **Fingerprint Powder Kit** ⭐ (takeable) - Required for Evidence 2 at payphone
- **Energy Drink** (takeable) - Useless flavor item
- **Tabloid Newspaper** (readable) - "MACKLIN ARRESTED - Family Legacy in Ruins" (angers player)

**NPCs**:
- **Ravi Patel (Kiosk Owner)** - Type 2 (Flavor only)
  - Friendly, gossips about neighborhood
  - Mentions seeing gray van parked by alley recently
  - Gives items freely: "Take what you need. You look stressed, friend."

**Dialogue**:
```
Ravi: "Coffee? Help yourself. I saw you looking at that
payphone. Weird someone still uses those, right? I keep
fingerprint powder for my detective novel hobby—you can
have it if you want."
```

**No Puzzle**: Just friendly NPC, free items

---

### **ZONE 4: FLORIST SHOP "PETAL & STEM"**

**Access**: Type 1 (Unlocked)
**Estimated Time**: 15 minutes (tool/item pickup)

**Description**:
"A small flower shop with cheerful window displays. The scent of roses and lilies fills the air. Fresh bouquets crowd the counters. The owner, a middle-aged woman, arranges flowers behind the register."

**Objects**:
- **Display Counter** (examinable) - Cash register, order slips, business cards
- **Flower Cooler** (container, openable)
  - Contains: Fresh bouquets, flower food packets, ribbon spools
- **Back Storage Room** (accessible)
  - Contains: Flower boxes, gardening tools, ladder

**Items**:
- **Bouquet of Lilies** (takeable) - Flavor item (Lili's flower connection)
- **Gardening Gloves** (takeable) - Can be used for handling rough objects
- **Business Card** (takeable) - "Petal & Stem - Fresh Flowers Daily"

**NPCs**:
- **Margaret Chen (Florist)** - Type 1 → Type 2 (EVIDENCE LOCATION)
  - Friendly, observant
  - Recognizes Lili's photo when shown
  - Provides crucial witness statement about Lili's relationship

**WITNESS STATEMENT PUZZLE** (EVIDENCE 3) ⭐:

```
> SHOW Lili's photo TO Margaret

[Note: Player must have Lili's photo - sent by Sarah or found in evidence]

Margaret: "Oh my. Yes, I've seen her. She comes in sometimes.
Not alone, though. Always with a young man."

> ASK about the man

Margaret: "Mid-twenties, I'd say. Quiet type. But... intense.
The way he looked at her—completely devoted. Hung on her every
word. She seemed more... reserved. Calculating, almost. Always
looking over her shoulder.

But him? He'd do anything she asked. Anything. I've seen
that look before. It's... obsession."

> ASK Can you give a statement?

Margaret: "Of course. If this helps you, Detective, I'm
happy to go on record."

> USE phone → Record statement

[Audio recording starts]

Margaret: "My name is Margaret Chen, owner of Petal & Stem
Florist on Elm Street. I've seen the woman in this photo—Lili—
multiple times over the past two months. She always came with
a young man who appeared obsessively devoted to her. She seemed
detached, but he would do anything she asked."

[Recording saved: Witness_Statement_Margaret_Chen.mp3]

EVIDENCE 3 ACQUIRED: Recorded witness statement (proves relationship)
```

**After Statement**:
Margaret converts to Type 2:
- Talks about flower meanings
- Mentions business has been slow
- Discusses neighborhood changes

---

### **ZONE 5: BUTCHER SHOP "RICHTER'S MEATS"**

**Access**: Type 1 (Unlocked)
**Estimated Time**: 5 minutes (tool pickup)

**Description**:
"A traditional butcher shop with hanging sausages in the window. The smell of smoked meat and sawdust fills the air. Klaus Richter sharpens a cleaver behind the counter, humming an old tune."

**Objects**:
- **Butcher Block** (examinable) - "Worn wood. Deep knife marks. Bloodstains."
- **Meat Hooks** (examinable) - "Hanging beef, sausages, chicken"
- **Walk-in Freezer** (container, openable)
  - Contains: Frozen meats, ice blocks, nothing useful
- **Tool Rack** (on wall, accessible)
  - Contains: Bolt Cutters, Meat cleaver, Bone saw

**Items**:
- **Bolt Cutters** ⭐ (takeable) - Use at Hidden Garages padlocks
- **Smoked Sausage** (takeable) - Trade to Homeless Man for info/audio
- **Meat Cleaver** (examinable, can't take)
  - "You reach for the cleaver. Then stop. You're trying to prove you're NOT violent."

**NPCs**:
- **Klaus Richter (Butcher)** - Type 2 (Flavor only)
  - Friendly, makes dark jokes unknowingly
  - "You look like you've been through the grinder! Haha!"
  - Gives freely: "Bolt cutters? Sure, take 'em. Just bring back when done."
  - Mentions: "Saw a gray van parked by the alley yesterday. Odd."

**No Puzzle**: Friendly NPC, free tools

---

### **ZONE 6: CONSTRUCTION SITE**

**Access**: Type 2 (Locked - need Hard Hat OR Safety Vest to enter)
**Estimated Time**: 20 minutes (multi-part tool puzzle)

**Description**:
"A three-story building wrapped in scaffolding and caution tape. Construction equipment sits idle. A chain-link fence surrounds the perimeter. Tony Greco, the foreman, stands at the gate, arms crossed."

**Objects**:
- **Chain-Link Fence** (barrier, locked gate)
  - **Unlocks with**: Wear hard hat OR safety vest (Foreman allows entry)
- **Tool Shed** (container, locked with combination lock)
  - **Combination**: 1987 (Elm Street establishment year - hint on street sign)
  - Contains: Hard Hat, Safety Vest, Drill Battery (Part 2/3)
- **Portable Generator** (examinable) - "Could power tools if needed"
- **Foreman's Office Trailer** (container, openable after entry)
  - Contains: Construction plans, clipboard, Drill Bit (Part 3/3)

**Items**:
- **Hard Hat** (takeable, wearable) - Required for entry (alternative: find in Alley dumpster)
- **Safety Vest** (takeable, wearable) - Required for entry
- **Drill Battery (Part 2/3)** - In tool shed
- **Drill Bit (Part 3/3)** - In office trailer
- **Construction Plans** (readable) - Flavor, mentions old Bloom building foundations

**NPCs**:
- **Tony Greco (Foreman)** - Type 1 → Type 2
  - **Initial State**: "Hard hat and vest. No exceptions. Insurance."
  - **Unlocks with**: Player wears hard hat + vest (OR shows both items)
  - **After entry**: "Don't touch anything. We've had enough delays."
  - **Converts to Type 2**: Complains about permits, delays, city bureaucracy

**PUZZLE - Tool Shed Combination Lock**:

```
> EXAMINE tool shed
"Locked with a 4-digit combination lock. You need the code."

[Hint: Elm Street sign says "EST. 1987"]

> USE combination lock
Enter 4-digit code: ____

> ENTER 1987

*CLICK* - The lock opens!

> OPEN tool shed
> TAKE hard hat, safety vest, drill battery
```

**Multi-Part Tool Assembly**:
```
[After collecting all 3 parts:]
- Drill Body (Electrician Truck)
- Drill Battery (Construction Tool Shed)
- Drill Bit (Construction Office)

> EXAMINE inventory
> COMBINE drill body + drill battery + drill bit

"You assemble the cordless drill. It hums to life.
This could drill through locks, metal, or wood."

[Drill can be used at Hidden Garages for alternative unlock]
```

---

### **ZONE 6.5: CCTV CONTROL BUILDING**

**Access**: Type 2 (Locked - need 4-digit passcode OR bolt cutters for fence)
**Estimated Time**: 20 minutes (EASY EVIDENCE location)

**Description**:
"A small concrete building with a chain-link fence. A rusted keypad is mounted beside the door. Security cameras watch the perimeter. Through the fence, you can see blinking server racks inside."

**Objects**:
- **Chain-Link Fence** (barrier - can cut with bolt cutters OR use door)
- **Keypad** (inputtable - 4-digit passcode)
  - **Correct code**: 1440 (found on Kiosk receipt)
- **Server Rack** (examinable - "Blinking lights indicate system is recording")
- **Monitor Station** ⭐ (interactive)
  - Contains: Live feed monitors, recording system, archived footage
- **Filing Cabinet** (container, unlocked)
  - Contains: Maintenance logs, incident reports, USB drives

**Items**:
- **CCTV Screenshot** ⭐ **EVIDENCE 1** (from monitor station)
  - Description: "Printed screenshot from April 15, 6:15 PM. Shows gray van (plate: LKJ-9472) on Elm Street. This contradicts the police report - it's NOT your vehicle."
  - Photo clearly shows license plate: **LKJ-9472**
  - **Key Detail**: Numeric portion "9472" is the PIN for Garage #3!
- **Maintenance Log** (readable - mentions "Camera 4 went offline at 6:00 PM")
- **Security Badge** (can use to access Construction site as alternative to hard hat)

**NPCs**:
- **Marcus Hayes (Security Guard)** - Type 1 → Type 2
  - **Initial State**: "This is a restricted area. You got a warrant?"
  - **Can give**: Hints that footage exists, mentions he saw a van that day
  - **Unlocks with**: Passcode (enter when he's not there) OR convince him with other evidence
  - **After**: Type 2 - complains about low pay, coffee quality

**PUZZLE - Keypad Access**:

```
> EXAMINE keypad
"4-digit combination lock. You need the code."

[Hint: Kiosk has receipt spike with old receipts]

[After finding receipt at Kiosk with "CCTV keypad - 1440" written on it]

> USE keypad
Enter 4-digit code: ____

> ENTER 1440

*BEEP* - The door unlocks!

> GO TO monitor station
> EXAMINE monitors
"Multiple camera feeds. You can access archived footage."

> SEARCH footage for April 15, 6:15 PM
"You find the timestamp. Gray van on Elm Street. License plate: LKJ-9472."

> PRINT screenshot
[Printer whirs]

> TAKE screenshot

EVIDENCE 1 ACQUIRED: CCTV Screenshot (plate LKJ-9472)

[Player should note the license plate number - it's the key to Garage #3!]
```

**Alternative Access**:
- Use bolt cutters on fence (skip keypad)
- Show other evidence to Marcus (he lets you in)

---

### **ZONE 7: ALLEY**

**Access**: Type 1 (Unlocked), but Secret Door to Garages is Type 3 (Hidden)
**Estimated Time**: 25 minutes (secret door puzzle + homeless interaction)

**Description**:
"A narrow brick alley between buildings. Graffiti covers the walls—tags, phone numbers, crude drawings. A dumpster sits against the left wall, overflowing. A man in a tattered coat rests on flattened cardboard near the dumpster. The alley ends at a brick wall... or does it?"

**Objects**:
- **Dumpster** (container, locked with lever puzzle)
  - **Unlocks with**: Lever sequence UP-DOWN-UP (Homeless Man gives hint)
  - Contains: Trash bags (nested), Hard Hat (alternative to Construction), Empty bottles
- **Trash Bags** (inside dumpster, can tear open)
  - Contains: Spoiled food, old clothes, nothing useful
- **Graffiti Wall** (readable, examinable)
  - Graffiti: "THE EYE SEES ALL", phone numbers, gang tags
  - **Hidden Cipher**: "RED EYES x BLUE STARS ÷ YELLOW BOLTS = ?"
  - Answer: Count symbols in graffiti (4 red eyes, 8 blue stars, 2 yellow bolts) = 4 × 8 ÷ 2 = 16
- **Brick Wall** ⭐ (SECRET DOOR)
  - **Unlocks with**: Electrical panel puzzle + wire cutters
  - Description: "The alley ends at a brick wall. Wait... there's an old electrical panel mounted on it."

**SECRET DOOR PUZZLE**:

```
> EXAMINE brick wall
"A solid brick wall. But something's odd—there are fresh
scrape marks on the ground, like this wall moves."

> EXAMINE electrical panel
"An old breaker box. The cover is rusted shut."

> USE wire cutters ON panel
"You pry open the panel. Inside: three colored wires—
RED, BLUE, YELLOW—connected to terminals labeled 1-9."

[Hint from graffiti cipher: Answer is 16]

> EXAMINE graffiti
"Red eyes, blue stars, yellow lightning bolts...
RED EYES x BLUE STARS ÷ YELLOW BOLTS = ?"

> COUNT red eyes
"Four red eyes spray-painted on the wall."

> COUNT blue stars
"Eight blue stars."

> COUNT yellow bolts
"Two yellow lightning bolts."

[4 × 8 ÷ 2 = 16]

> SET electrical panel TO 16

[Alternative: rewire terminals manually if player figures it out]
> CONNECT red TO terminal 1
> CONNECT blue TO terminal 6
> CONNECT yellow TO terminal 0

*CLUNK* - The brick wall slides open, revealing a hidden passage!

[Secret door to Garages unlocked]
```

**Items**:
- **Hard Hat** (alternative location, in dumpster)
- **Empty Bottle** (takeable) - Can use for fingerprint dusting (alternative to powder kit)

**NPCs**:
- **Eddie "Homeless Man"** - Type 1 → Type 2
  - **Initial State**: Sitting by dumpster, looks tired
  - **Needs**: Food (Smoked Sausage from Butcher)
  - **Gives**: Dumpster lever hint + story information

**HOMELESS MAN INTERACTION**:

```
> TALK TO Eddie
Eddie: "Got anything to eat? Haven't had a meal in days..."

[After giving Smoked Sausage from Butcher]

> GIVE smoked sausage TO Eddie

Eddie: "Oh man, thank you. You're a good person, Detective.
I know you didn't do what they're saying.

I've been here for weeks. Seen a gray van come and go.
Young guy, always nervous. And that girl from the news?
She was here too. With him. They didn't look like victim
and kidnapper to me."

> ASK about the van

Eddie: "Gray cargo van. Saw it parked by those garages
behind the wall. They thought nobody was watching, but
I see everything from my spot here."

> ASK about dumpster

Eddie: "That old dumpster? Lever system. UP-DOWN-UP.
That's how you open those old models."
```

**After Trading**:
Eddie converts to Type 2:
- Tells stories about street life
- Mentions police searched alley but missed the wall door
- Talks about seeing neighborhood changes

---

### **ZONE 8: HIDDEN GARAGES**

**Access**: Type 3 (Hidden - revealed via Alley secret door)
**Estimated Time**: 20 minutes (HARD EVIDENCE location)

**Description**:
"A hidden courtyard behind the brick wall. Three garage doors stand in a row, numbered 1, 2, and 3. Oil stains mark the concrete. Weeds push through cracks. This place was overlooked during the police search."

**Objects**:
- **Garage Door #1** (container, locked - Mechanical Padlock)
  - **Unlocks with**: Lock Pick Set OR Bolt Cutters
  - Contains: Old furniture, paint cans, garden tools (nothing useful)
- **Garage Door #2** (container, locked - Combination Lock)
  - **Unlocks with**: Combination (random puzzle, flavor)
  - Contains: Workbench, toolboxes, old car parts (nothing useful)
- **Garage Door #3** ⭐ (container, locked - Digital Keypad)
  - **Unlocks with**: 4-digit PIN: **9472** (from license plate LKJ-9472!)
  - Contains: Gray van, toolbox, **EVIDENCE 2**

**Items**:
- **Van Registration Card** ⭐ **EVIDENCE 2** (in Garage #3 glove box)
  - Description: "Registration for gray van, plate LKJ-9472. Owner: Jeremy Miller - Address: 447 Willow Lane, Bloodhaven."
  - **Key Detail**: Name matches receipt (J. Miller), address leads to Chapter 3 investigation (Bloom Estate)
- **Gray Van** (examinable) - "Matches description from police report. Plate: LKJ-9472"
- **Toolbox** (in Garage #1, contains duplicate tools - flavor)

**PUZZLE - Garage Door #1 (Mechanical Padlock)**:

```
> EXAMINE garage door 1
"Heavy padlock. Standard mechanical lock."

> USE lock pick set
[Lock pick minigame]

> SET pins [correct sequence]
*CLUNK* - Lock opens!

[Alternative]
> USE bolt cutters
"You cut through the lock shackle. *SNAP*"

> OPEN garage door 1
"Old furniture and paint cans. Nothing useful here."
```

**PUZZLE - Garage Door #2 (Combination Lock)**:

```
> EXAMINE garage door 2
"4-digit combination lock."

[Flavor puzzle - optional exploration]

> ENTER [various combinations]
*CLUNK* - Eventually opens (or skip entirely)

> OPEN garage door 2
"Workbench and old car parts. Nothing interesting."
```

**PUZZLE - Garage Door #3 (Digital Keypad - EVIDENCE LOCATION)** ⭐:

```
> EXAMINE garage door 3
"A modern digital keypad. 4-digit PIN required."

[CRITICAL MOMENT: Player must remember license plate from Evidence 1!]

[License plate from CCTV screenshot: LKJ-9472]
[Numeric portion: 9472]

> USE keypad
Enter 4-digit PIN: ____

> ENTER 9472

*BEEP* *BEEP* *CLUNK* - The garage door slides open!

"You see a gray cargo van inside. This is it—the van
from the CCTV footage."

> EXAMINE gray van
"License plate LKJ-9472. Matches the screenshot perfectly."

> OPEN van glove compartment
> TAKE registration card

"Registration shows: Owner - Jeremy Miller
Address: 447 Willow Lane, Bloodhaven"

EVIDENCE 2 ACQUIRED: Van registration (owner: Jeremy Miller)

> USE phone > Take Photo
[Photo saved: Van_Registration.jpg]

[Player now has suspect name and address - leads to Chapter 3!]
[Name matches hardware receipt "J. Miller" from Electrician truck!]
```

---

## 🎮 PUZZLE SUMMARY

### Puzzle Type Distribution

| Puzzle Type | Location | Difficulty | Time |
|-------------|----------|------------|------|
| **Lock Pick Minigame** | Florist Back Office | Easy | 5 min |
| **NPC Distraction (AI-Judged)** | Electrician Truck | Medium | 10 min |
| **Combination Lock (Riddle)** | Construction Tool Shed | Easy | 3 min |
| **Multi-Part Assembly** | Drill (3 parts across zones) | Medium | 15 min |
| **Lever Sequence** | Alley Dumpster | Easy | 2 min |
| **Cipher Puzzle** | Alley Graffiti → Electrical Panel | Hard | 15 min |
| **Digital Keypad (Simon Says)** | Garage #1 | Medium | 5 min |
| **Heavy Lock (Tool Required)** | Garage #3 | Medium | 5 min |
| **NPC Trade** | Homeless Man (Food for Audio) | Easy | 5 min |
| **Forensics** | Payphone Fingerprints | Easy | 5 min |

**Total Puzzle Variety**: 10 different types, no repetition

---

## 🛠️ TOOLS & ITEMS

### Permanent Tools (Can't Drop)
- **Phone** (camera, audio player, PDF reader, communication)
- **Lock Pick Set** (opens mechanical locks via minigame)

### Collectible Tools
| Tool | Location | Use |
|------|----------|-----|
| **Crowbar** | Electrician Truck | Florist filing cabinet (alternative to lock pick) |
| **Wire Cutters** | Electrician Truck | Alley electrical panel (secret door) |
| **Bolt Cutters** | Butcher Shop | Garage chains/padlocks |
| **Hard Hat** | Construction Shed OR Alley Dumpster | Construction site entry |
| **Safety Vest** | Construction Shed | Construction site entry |

### Multi-Part Tool
| Part | Location | Final Use |
|------|----------|-----------|
| **Drill Body** | Electrician Truck | Combine all 3 → |
| **Drill Battery** | Construction Shed | Opens Garage #3 |
| **Drill Bit** | Construction Office | (alternative to bolt cutters) |

### Trade Items
| Item | Source | Trade To | Get |
|------|--------|----------|-----|
| **Smoked Sausage** | Butcher | Homeless Eddie | Van sighting information + dumpster hint |
| **Coffee** | Kiosk | Electrician Mike | Access to van (alternative distraction) |

---

## 🕹️ EMBEDDED MINIGAMES

### 1. Lock Pick Minigame (Mechanical Locks)

**Mechanic**: Set 5 pins to correct heights (LOW/MEDIUM/HIGH)

**Feedback**:
- Correct pin: "*click* - Feels right"
- Wrong pin: "*scrape* - Not quite"
- All correct: "*CLUNK* - Lock opens!"

**Hint System**: Player can LISTEN for clicks (audio feedback guides)

**Difficulty**: Randomized pin heights each attempt

**Used At**:
- Florist back office door
- Florist filing cabinet
- Garage #2 padlock

---

### 2. Simon Says (Digital Keypad)

**Mechanic**: Repeat color sequence shown on screen

**Embedded**: JS/Next.js component with button interface

**Difficulty Scaling**:
- Round 1: 4 colors
- Round 2: 5 colors (if failed)
- Round 3: 6 colors (if failed again)

**Used At**:
- Garage #1 digital lock

---

### 3. Cipher Puzzle (Graffiti Math)

**Mechanic**: Count symbols, solve equation

**Equation**: RED EYES × BLUE STARS ÷ YELLOW BOLTS = ?

**Solution**: 4 × 8 ÷ 2 = 16

**Input**: Set electrical panel to 16 OR rewire terminals manually

**Used At**:
- Alley electrical panel (secret door)

---

## 📸 EVIDENCE COLLECTION WORKFLOW

### Evidence 1: CCTV Screenshot (EASY)

**Steps**:
1. Read Sarah's message → Learn about gray van on Elm Street
2. GO TO Kiosk → EXAMINE receipt spike → TAKE receipt with CCTV passcode (1440)
3. GO TO CCTV Building
4. USE keypad → ENTER 1440 → Door unlocks
5. GO TO monitor station
6. SEARCH footage for April (weeks before incident)
7. PRINT screenshot → TAKE screenshot
8. **Notice license plate**: LKJ-9472
9. Evidence 1 acquired ✓

**Key Detail**: Remember "9472" - it's the PIN for Garage #3!

**Time**: 20 minutes

---

### Evidence 2: Van Registration (HARD)

**Steps**:
1. Obtain Evidence 1 (CCTV Screenshot) first → Get license plate LKJ-9472
2. GO TO Alley
3. EXAMINE brick wall → Notice electrical panel
4. GET wire cutters (from Electrician first - requires distraction)
5. EXAMINE graffiti → Solve cipher (4 × 8 ÷ 2 = 16)
6. USE wire cutters ON panel
7. SET panel TO 16 → Secret door opens
8. GO TO Hidden Garages
9. EXAMINE Garage #3 keypad
10. ENTER PIN: 9472 (from license plate!)
11. Garage opens → EXAMINE gray van → OPEN glove compartment
12. TAKE registration card (Owner: Jeremy Miller, 447 Willow Lane)
13. Evidence 2 acquired ✓

**Time**: 45 minutes

---

### Evidence 3: Recorded Witness Statement (MEDIUM)

**Steps**:
1. Obtain Lili's photo (from Sarah's message or evidence)
2. GO TO Florist Shop (Petal & Stem)
3. TALK TO Margaret Chen
4. SHOW Lili's photo TO Margaret
5. ASK about the man
6. ASK "Can you give a statement?"
7. USE phone → Record statement
8. Margaret gives formal witness statement (audio recording created)
9. Evidence 3 acquired ✓

**Time**: 15 minutes

---

### Evidence 4: Hardware Store Receipt (MEDIUM)

**Steps**:
1. GO TO Electrician Truck
2. Distract Mike Kowalski (creative AI-judged solution)
3. OPEN van back doors
4. OPEN toolbox
5. EXAMINE contents → TAKE hardware receipt
6. Receipt shows: "J. Miller" purchased zip ties, duct tape, drop cloth (April 10)
7. Evidence 4 acquired ✓

**Key Detail**: "J. Miller" matches van registration name (Jeremy Miller)!

**Time**: 15 minutes (includes distraction puzzle)

---

## ⏱️ TIME ESTIMATES

### Optimal Path (Collect 3 Evidence - Minimum)

| Phase | Activity | Time |
|-------|----------|------|
| **Setup** | Read Sarah's message | 3 min |
| **Evidence 1** | CCTV Screenshot (easy) | 20 min |
| **Evidence 3** | Witness statement (medium) | 15 min |
| **Evidence 4** | Hardware receipt (medium) | 15 min |
| **Completion** | Send to Sarah, chapter end | 5 min |
| **TOTAL** | **58 minutes** |

### Full Completion (All 4 Evidence)

| Phase | Activity | Time |
|-------|----------|------|
| **Setup** | Read Sarah's message | 3 min |
| **Exploration** | Talk to NPCs, gather tools | 15 min |
| **Evidence 1** | CCTV Screenshot (easy) | 20 min |
| **Evidence 2** | Van registration (hardest) | 45 min |
| **Evidence 3** | Witness statement (medium) | 15 min |
| **Evidence 4** | Hardware receipt (medium) | 15 min |
| **Completion** | Send to Sarah | 5 min |
| **TOTAL** | **118 minutes** |

**Target**: 90-120 minutes (players collect 3/4 evidence or explore fully)

---

## 🏁 CHAPTER COMPLETION

### When Player Has 3 Evidence

```
> USE phone > Send Evidence to Sarah

[Loading...]

Sarah Chen:
"Jeremy Miller, 447 Willow Lane. Got it.

This wasn't random, Burt. This was planned. She knew him.
The witness confirms it—obsessed young man, staged
relationship. And that receipt... abduction supplies
bought 5 days early.

I'll dig into the address. If this connects to the
Bloom family like I think it does, we'll find answers.

Stay safe out there."

════════════════════════════════════════════
          CHAPTER 1 COMPLETE
════════════════════════════════════════════

Evidence Collected: 3/4
Investigation Complete: Staging Proven
Next Target: 447 Willow Lane

[Continue to Chapter 2?]
```

---

## 🎭 NPC SUMMARY

| NPC | Type | Location | Initial State | Unlock Condition | Gives/Allows | Post-Action |
|-----|------|----------|---------------|------------------|--------------|-------------|
| **Mike Kowalski** | Type 1 → 2 | Electrician Truck | Guards van | AI-judged distraction | Tools (crowbar, wire cutters, lock pick, drill body, **Evidence 4 receipt**) | Union complaints |
| **Margaret Chen** | Type 1 → 2 | Florist Shop | Friendly, observant | Show Lili's photo | **Evidence 3 - Recorded witness statement** | Flower talk, sympathetic |
| **Klaus Richter** | Type 2 | Butcher Shop | Friendly | None | Bolt cutters, sausage, gossip | Dark humor |
| **Tony Greco** | Type 1 → 2 | Construction | Blocks gate | Hard hat + vest | Site access, drill parts | Permit rants |
| **Ravi Patel** | Type 2 | Kiosk | Friendly | None | Coffee, CCTV code hint | Neighborhood gossip |
| **Eddie (Homeless)** | Type 1 → 2 | Alley | Hungry | Food (sausage) | Van sighting info, dumpster hint | Street stories |

---

## 🗺️ NAVIGATION MAP

```
ELM STREET (START)
    ├─ NORTH → Bus Stop (Flavor only, no evidence)
    │
    ├─ WEST → Electrician Truck (Type 2 - Distraction needed)
    │         └─ Toolbox: Crowbar, Wire Cutters, Lock Pick, Drill Body
    │         └─ ⭐ EVIDENCE 4: Hardware Receipt (J. Miller)
    │
    ├─ EAST → Alley (Type 1)
    │         ├─ Dumpster (Lever puzzle)
    │         ├─ Homeless Eddie (Van info + hints)
    │         └─ Secret Door (Cipher + Wire Cutters)
    │             └─ HIDDEN GARAGES (Type 3)
    │                 ├─ Garage #1 (Mechanical lock)
    │                 ├─ Garage #2 (Combination lock)
    │                 └─ Garage #3 (PIN 9472) → ⭐ EVIDENCE 2: Van Registration
    │
    ├─ SOUTH → Construction Site (Type 2 - Hard Hat + Vest)
    │          ├─ Tool Shed (Combination 1987) → Drill Battery
    │          └─ Office → Drill Bit
    │
    ├─ CCTV Building (Type 2 - Keypad 1440)
    │  └─ Monitor Station → ⭐ EVIDENCE 1: CCTV Screenshot (plate LKJ-9472)
    │
    ├─ Florist Shop (Type 1)
    │  └─ Margaret Chen → ⭐ EVIDENCE 3: Recorded Witness Statement
    │
    ├─ Butcher Shop (Type 1)
    │  └─ Bolt Cutters, Sausage (free)
    │
    └─ Kiosk (Type 1)
       └─ Coffee, CCTV code (1440) on receipt
```

---

## 📋 DESIGN NOTES

### What Makes This Chapter Work

✅ **Puzzle Variety**: 10 different puzzle types, no repetition
✅ **Multiple Solutions**: Lock pick OR crowbar, Bolt cutters OR drill
✅ **Player Agency**: Can collect evidence in any order
✅ **Creative Freedom**: AI-judged distraction allows experimentation
✅ **Clear Evidence**: No timestamp comparison, no tiny details
✅ **Embedded Games**: Simon Says, Lock Pick minigame add interactivity
✅ **Narrative Integration**: Puzzles tied to story (Bloom family, graffiti cipher)
✅ **Tool Placement**: 1-2 zones away (crowbar, wire cutters, drill parts)
✅ **Difficulty Curve**: Easy evidence first, crucial evidence requires deepest exploration

### Avoid Frustration

❌ **No pixel hunting**: Everything discoverable via EXAMINE
❌ **No time pressure**: Players explore at own pace
❌ **No tedious reading**: Police report is 1 page, clear claims
❌ **No timestamp math**: Evidence is physical objects, photos, audio
❌ **No unclear goals**: Sarah's message hints at task, evidence speaks for itself

### Creative Highlights

🎨 **Graffiti Cipher**: Count symbols (4 red × 8 blue ÷ 2 yellow = 16)
🎨 **AI Distraction**: Player invents own solutions
🎨 **Multi-Part Drill**: Scavenger hunt across 3 zones
🎨 **Homeless Trade**: Ethical choice (give food, get crucial evidence)
🎨 **Lock Pick Minigame**: Audio feedback, replayable
🎨 **Secret Door**: Electrical panel + cipher (not cliché brick)

---

## 🚀 READY FOR IMPLEMENTATION

**Next Steps**:
1. Review this design - approve or request changes
2. Implement in TypeScript (chapter-1.ts cartridge)
3. Create minigame components (Lock Pick, Simon Says)
4. Generate AI media (Sarah's messages, police report PDF, audio file)
5. Playtest and balance difficulty
6. Iterate based on feedback

**Design Status**: ✅ Complete - Awaiting Approval

---

---

## 📝 CHANGELOG

**2026-01-10 - Major Story Redesign**:
- **REMOVED**: "Bloom's Florist" concept (user never confirmed this)
- **REMOVED**: Birth certificate/Lili identity reveal from Chapter 1 (saved for Chapter 5 twist)
- **REMOVED**: Helena Bloom NPC connection (was incorrect assumption)
- **CHANGED**: Florist shop → Regular "Petal & Stem" flower shop (flavor zone, no evidence)
- **CHANGED**: Evidence 1 → Simple alibi evidence (TBD exact type)
- **STORY FIX**: Chapters 1-5 focus on Bloom family (musicians, not criminals)
- **STORY FIX**: Lili's true identity (Carmichael, mastermind) revealed END OF CHAPTER 5 only
- **Game 2 Setup**: Carmichael mafia family, Lili escapes, deeper conspiracy

---

**End of Chapter 1 Design Document**
