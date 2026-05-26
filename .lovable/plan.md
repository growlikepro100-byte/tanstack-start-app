
# গরু কিনবো — Build Plan

একটি premium, mobile-first cattle marketplace — Dark Green + Gold + White থিমে, Google login, farm/individual seller dashboard, এবং buyer browsing experience।

## 1. Backend (Lovable Cloud)

Lovable Cloud enable করব — database, auth, storage একসাথে পাব।

**Auth:** Google OAuth (Lovable broker দিয়ে) — login করলেই "Verified" badge।

**Database tables:**
- `profiles` — id (auth.users FK), full_name, avatar_url, phone, whatsapp, user_type ('farm' | 'individual'), created_at
- `farms` — id, owner_id, name, description, location, cover_image, created_at
- `listings` — id, seller_id, farm_id (nullable), title, description, price, age_months, weight_kg, location, lat/lng (optional), phone, whatsapp, status, featured, created_at
- `listing_media` — id, listing_id, url, type ('image' | 'video'), sort_order
- `favorites` — user_id, listing_id (composite PK)

**RLS:** সবাই active listings পড়তে পারবে; শুধু owner নিজের data create/update/delete করতে পারবে। `profiles` auto-create হবে trigger দিয়ে।

**Storage buckets:** `listing-media` (public), `farm-covers` (public), `avatars` (public)।

## 2. Routes (TanStack Start, file-based)

```
src/routes/
  __root.tsx              → shell + nav + auth listener
  index.tsx               → landing: hero, featured, nearby, categories
  browse.tsx              → all listings + filters (price/location/age/weight)
  listings.$id.tsx        → cow detail page (gallery, info, call/WhatsApp/booking)
  farms.$id.tsx           → farm profile + listings
  sellers.$id.tsx         → individual seller profile
  login.tsx               → Google sign-in
  _authenticated.tsx      → guard layout
  _authenticated/
    dashboard.tsx         → my listings + stats
    listings.new.tsx      → create cow listing (multi-step form)
    listings.$id.edit.tsx → edit
    farm.setup.tsx        → create/edit farm profile
    favorites.tsx         → saved listings
    profile.tsx           → edit profile, phone, WhatsApp
```

## 3. Key Components

- `ListingCard` — image carousel, price, age/weight badges, location, verified badge
- `FilterSheet` — mobile-first bottom sheet (price slider, location, age, weight)
- `StickySearchBar` — top sticky search + filter trigger
- `FloatingActionButton` — "+ Add Listing" (logged-in only)
- `MediaUploader` — drag/drop images + video, preview, reorder
- `ContactActions` — Call button, WhatsApp deep link (`wa.me/...`), booking modal
- `VerifiedBadge` — gold checkmark
- `Gallery` — swipeable full-screen image/video viewer

## 4. Design System

**Tokens (`src/styles.css`):**
- `--primary`: deep dark green (oklch ~0.32 0.08 155)
- `--accent` / `--gold`: warm gold (oklch ~0.78 0.14 85)
- `--background`: soft white (oklch ~0.99 0.005 90)
- subtle glassmorphism cards, soft shadows, gold gradient on featured/CTAs
- Eid-inspired subtle ornament accents (corner motifs, crescent dividers — minimal)

**Typography:** Bangla-friendly pair — Hind Siliguri (body) + Noto Serif Bengali বা একটি display font (heading)।

**Motion:** Framer Motion দিয়ে subtle card hover lift, image carousel transition, FAB pop-in।

## 5. Buyer Flow
Landing → Browse/Filter → Listing Detail → Call/WhatsApp/Booking Request → (optional) Favorite

## 6. Seller Flow
Login → Choose Farm/Individual → (Farm setup if farm) → Add Listing (images, video, price, age, weight, location, contact) → Dashboard manage

## 7. Booking Request
Simple table `booking_requests` (listing_id, buyer_id, buyer_phone, message, created_at) — seller dashboard-এ দেখাবে। No payment।

## 8. Phased Delivery

**Phase 1 (এই turn):**
- Lovable Cloud enable + schema + RLS + storage buckets
- Design tokens + Bangla fonts
- Auth (Google) + `__root` nav + auth listener
- Landing page (hero, featured grid placeholder)
- Browse page + ListingCard + basic filters
- Listing detail page
- Dashboard + Add Listing form + MediaUploader
- Farm profile setup

**Phase 2 (পরে যদি চান):**
- Favorites, nearby (geolocation), dark mode toggle, ratings, advanced map view

## Technical notes

- TanStack Start + file-based routes; loaders use `ensureQueryData` + `useSuspenseQuery`
- Protected pages `_authenticated/` layout-এ; Supabase session hydrate করব child `beforeLoad`-এ
- Image upload directly to Supabase Storage from client (signed via publishable key + RLS)
- WhatsApp: `https://wa.me/<phone>?text=...` deep link
- Call: `tel:<phone>`
- Mobile-first: Tailwind default → md/lg breakpoints
- SEO: প্রতিটি route-এ আলাদা `head()` (title, description, og:image — listing detail-এ cover image)

বিল্ড মোডে গেলে Phase 1 শুরু করব।
