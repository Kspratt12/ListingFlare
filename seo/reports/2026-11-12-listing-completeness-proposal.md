# Listing completeness: proposal (nothing implemented)

## What exists today (verified in code and in the mocked create flow)
- **No property-type concept.** There is no property-type field anywhere. The form is residential-shaped: bedrooms, bathrooms, square feet, year built, lot size. Land, commercial or other property types have no way to say what they are, but they are not blocked either.
- **Unknown and zero are the same value.** `beds`, `baths` and `sqft` are stored `NOT NULL DEFAULT 0`; a blank input becomes 0 (`parseInt(...) || 0`). `year_built` is the only field that can be null (unknown) and `lot_size` is empty text.
- **Display is inconsistent.** The hero always prints "{beds} Beds / {baths} Baths" and the details panel prints "Bedrooms 0", so a listing with blank fields shows "0 Beds 0 Baths"; JSON-LD emits `numberOfRooms: 0`. The agent page, flyer, price-per-sqft bar and other-listings cards already hide zeros.
- **Publishing needs only** street, city and price. Address, city, state, zip and price are enough to publish with no photos and no beds or baths (the empty-photo public page used to return HTTP 500; fixed in #48).
- **Drafts:** "Save as Draft" stores a draft listing in the database (status draft). Separately, an unsaved form autosaves its text fields (not photos) to the browser for 24 hours.

## Smallest proposal (two pieces; neither blocks publishing)
1. **Treat 0 as "not provided" at display time**, consistently: hide zero beds, baths and sqft in the hero and details panel, and omit `numberOfRooms` / `numberOfBathroomsTotal` from JSON-LD when 0. No schema change, no required fields, works for land and commercial listings. Trade-off: a literal zero-bedroom home (a studio) shows nothing instead of "0 Beds"; an agent can describe it in the title or description. Effort: small. Public-page change, so it needs your approval.
2. **A non-blocking "review before you publish" notice** when Publish is pressed with gaps: no photos, or no beds, baths and sqft all blank. It lists what a buyer will not see and offers "Publish anyway" and "Go back". Copy for non-residential listings: "Leave bedrooms and bathrooms blank if they don't apply; blank fields are not shown." The notice never blocks, never discards the draft, and requires no residential field.
Not proposed: required photos/beds/baths, a property-type selector (a data-model and editor change, separate proposal), or any redesign.
