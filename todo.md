## ✅ Checklist for AI Trip Planner Web App Build

- [x] Set up web app structure with home screen (list of trips + "New Trip" button)
- [x] Build trip creation survey (location, dates, budget, preferences)
- [x] Connect backend to GPT API for itinerary generation
- [x] Structure prompt to return JSON with days, activities, costs, locations
- [x] Add calendar view for itinerary
- [x] Add map view with activity pins and routes
- [x] Add budget planning module (track & suggest spending)
- [x] Build editable itinerary components with "Change" button
- [ ] Add ability to save trips and create reusable profiles
- [ ] Add trip sharing options (link, social, email)
- [ ] Store trip history and allow editing of past trips
- [x] Link to booking services (hotels, flights, experiences)
- [x] Design beautiful UI/UX (web-first)

---

## 📱 App Overview & Structure (Web App Version)

### **Main Screens:**
1. **Home Screen**
   - List of saved trips
   - "Create New Trip" button

2. **Trip Survey Flow**
   - Input:
     - Destination
     - Dates
     - Trip purpose (honeymoon, foodie, chill, etc.)
     - Budget
     - Preferences (nature, art, nightlife, etc.)

3. **Generated Results View**
   - Itinerary in calendar view (day-by-day)
   - Map with suggested places + routes
   - Budget summary
   - Booking links for hotels/flights
   - Editable trip parts ("Change" button beside each entry)
   - Option to save trip

4. **Trip Detail View**
   - View saved trip details
   - Edit / update / clone trip
   - Share trip link

5. **Trip Profile Settings**
   - Saved user preferences
   - Travel style (e.g., budget traveler, food-lover)

---

## ⚙️ Features & Logic

### 🧠 AI Integration:
- Use GPT API to generate itinerary
- Include structured prompt:
  - JSON with: `day`, `time_block`, `activity`, `location`, `estimated_cost`
- Add logic to:
  - Adjust based on user feedback ("change this")

### 🌍 Live Data Enrichment:
- Google Places API for real restaurants/attractions
- Booking API (optional) for hotels/flights

### 📅 Calendar View:
- Display each day's plan in a timeline
- Each time block (morning, afternoon, evening) has one or more activities
- Tappable blocks for edit/change options

### 🗺️ Map View:
- Pins for each location
- Route paths between activities
- Color-coded by day

### 💾 Save & Load Trips:
- Save planned trips locally or to backend
- Retrieve, edit, clone, or share

### 🎨 UI/UX Requirements:
- Clean, modern design (web-first)
- Use friendly visuals for time blocks, budgets
- Emphasize ease-of-use with button labels like "Change this activity"

---

## 🔄 Editable Itinerary Logic
- Each activity block has an associated `id`
- Button next to each item triggers re-query to GPT API with:
  - Current itinerary context
  - Request to replace that item ("replace afternoon activity on Day 2")

---

## 🔗 External Integration Options
- Google Places (for POIs and hours)
- Yelp or TripAdvisor (ratings and reviews)
- Skyscanner/Booking (flight + hotel booking)