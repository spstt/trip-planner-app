@AGENTS.md

## Project: Trip Planner PWA (saiparnstt)

Stack: Next.js App Router, React, TypeScript, Supabase, Tailwind v4
Deploy: Vercel + Supabase (ap-southeast-1, Singapore)
Repo: https://github.com/spstt/trip-planner-app

---

### App routes (app/)
```
app/
├── layout.tsx                          — root layout, PWA meta, apple-touch-icon, favicon links, SW registration
├── page.tsx                            — redirect to /dashboard or /login
├── login/page.tsx                      — OAuth login (Google, Apple)
├── auth/callback/route.ts              — exchanges OAuth code for session (server)
├── invite/[token]/page.tsx             — join trip via invite link
└── (app)/
    ├── layout.tsx                      — bottom nav (5 tabs), session guard
    ├── dashboard/page.tsx              — trip list + create modal + theme switcher (2×2 grid)
    ├── explore/page.tsx                — explore destinations
    ├── packing/page.tsx                — global packing list
    ├── profile/page.tsx                — user profile, avatar upload, payment info (bank/PromptPay)
    └── trips/[id]/
        ├── layout.tsx                  — trip tabs (Overview/Plan/Expenses/Checklist/Bookings)
        ├── page.tsx                    — trip overview: banner, countdown, weather, members, emergency meetups, sticky memos
        ├── itinerary/page.tsx          — day-by-day itinerary with day-tab selector + map/timeline toggle
        ├── expenses/page.tsx           — group expenses + pie chart + settle up
        ├── checklist/page.tsx          — shared + personal checklist + packing templates
        └── bookings/page.tsx           — flight/hotel bookings + attachment preview
```

### Components (components/)
```
trip/
  CreateTripModal.tsx    — create trip form, geocodes destination, auto-creates itinerary days
  TripCard.tsx           — pastel Korean-minimal card; SVG sketch overlay; torn-ticket scallop divider;
                           soft glassmorphism badges; per-palette pastel hero bg
  CountdownTimer.tsx     — live countdown + airplane animation on dashed progress track
  TripReadiness.tsx      — readiness score + smart prompts
  WeatherWidget.tsx      — 7-day forecast, offline badge when cached
  SmartTravelTips.tsx    — weather-based packing advice (4 temp tiers), links to checklist
  InviteButton.tsx       — generates trip_invitations token, copies share link
  DestinationWidget.tsx  — destination info (Wikipedia photo fallback)
  EmergencyMeetup.tsx    — host pins emergency meetup points (lat/lng); members open in Google Maps
  StickyMemoBoard.tsx    — pastel post-it notes with random rotation; realtime; needs trip_memos table

itinerary/
  AddItemModal.tsx       — Nominatim search with 600ms debounce; addressdetails=1; accept-language=ko,en,th;
                           smart emoji per OSM class/type; structured name+city display; selected place chip
  DayTimeline.tsx        — emoji dot per place type (TH/KR/EN/JP keyword detection); color accent strip;
                           dashed timeline line; travel-time chip (Haversine); collapsible notes; add-next button
  BackupDrawer.tsx       — backup plan items
  ItemComments.tsx       — per-item comments (connected; needs item_comments RLS SQL)

expenses/
  AddExpenseModal.tsx    — insert expense + participants; live FX rate; is_cash toggle; payer default fix
  EditExpenseModal.tsx   — update/delete expense (owner only), locked/live FX
  ExpenseItem.tsx        — displays expense; cash badge; pencil for owner
  ExpensePieChart.tsx    — recharts donut (fixed 160×160px, no ResponsiveContainer); interactive legend + bar breakdown
  SettleUpSheet.tsx      — debt settlement; PromptPay QR modal
  PromptPayQR.tsx        — generates PromptPay QR via promptpay-qr + qrcode; canvas download

bookings/
  AddBookingModal.tsx    — smart dynamic fields per category (flight: flight_no/airports/times;
                           hotel: address/check-in/check-out; generic for train/rental/activity/other);
                           multi-file upload to trip-files bucket; is_private toggle (animated pill);
                           metadata JSONB for category-specific extras
  BookingCard.tsx        — vintage ticket design: serrated edges, color-coded header per category, barcode REF
  AttachmentPreviewModal.tsx — full-screen in-app preview for images (zoom/rotate) and PDF (iframe)

map/
  MapView.tsx            — Leaflet map (dynamic import, SSR-safe); emoji diamond markers per place category
                           (☕ cafe, 🍜 food, 🏨 hotel, ✈️ airport, 🚆 train, ⛩️ temple,
                            🛍️ shopping, 🎡 activity, 🏖️ beach, 🏔️ mountain, 🍻 bar, 💆 spa)

ui/
  Toast.tsx              — toast notification component
```

### Lib / utilities (lib/)
```
lib/
├── supabase/
│   ├── client.ts        — createBrowserClient (for client components)
│   ├── server.ts        — createServerClient (for Server Components / Route Handlers)
│   └── middleware.ts    — updateSession() called by middleware.ts (root)
├── hooks/
│   └── useTheme.ts      — theme switcher: 'dark-slate' | 'warm-pastel' | 'jeju-sunlight' | 'matcha-latte', localStorage
├── stores/
│   └── trip-store.ts    — Zustand store (optimistic updates — mostly bypassed, use callbacks)
└── utils/
    ├── cn.ts            — clsx/tailwind-merge helper
    ├── debt.ts          — calculateDebts() greedy net-balance settle-up algorithm
    ├── destination.ts   — Wikipedia/Nominatim destination info; tries th.wikipedia for Thai cities
    ├── offline.ts       — IndexedDB helpers (booking attachments offline)
    └── weather.ts       — Open-Meteo fetch + localStorage offline cache (network-first)
```

### Root files
```
middleware.ts            — Next.js middleware, calls updateSession (session refresh on every request)
                           matcher excludes: manifest.json, sw.js, icons, static assets
types/index.ts           — all TypeScript interfaces mirroring Supabase schema
public/
  sw.js                  — Service Worker; cache uses Promise.allSettled (not addAll)
  manifest.json          — PWA manifest; icons: icon-192.png + icon-512.png (both any + maskable entries)
  apple-touch-icon.png   — iOS home screen icon (180×180)
  favicon.ico / .svg     — browser favicons
  favicon-96x96.png      — Android/Chrome favicon
  icons/
    icon-192.png         — PWA icon 192×192
    icon-512.png         — PWA icon 512×512
supabase/
  rls_policies.sql       — ALL RLS policies (drop existing before re-running); includes bookings is_private logic
  functions/
    join_trip_by_token.sql — RPC function for invite link join (security definer)
```

---

### Supabase — Database Tables

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | id (= auth.uid), display_name, avatar_url, default_currency, bank_account, promptpay | Created on user signup via trigger |
| `trips` | id, name, destination, destination_lat/lng, cover_image_url, start_date, end_date, is_international, created_by, locked_rates (jsonb), rates_locked_at | `locked_rates` = `{JPY: 0.24, ...}` THB per 1 foreign unit |
| `trip_members` | id, trip_id, user_id, role ('host'\|'member'), joined_at | RLS recursive — uses security definer functions |
| `trip_invitations` | id, trip_id, token, created_by, expires_at, max_uses, use_count | Joined via `join_trip_by_token` RPC |
| `itinerary_days` | id, trip_id, day_number, date, title | Auto-created by CreateTripModal on trip insert |
| `itinerary_items` | id, trip_id, day_id, title, location_name, lat, lng, start_time, duration_min, is_backup, sort_order, created_by | Realtime enabled; sort_order = Math.floor(Date.now()/1000) |
| `item_comments` | id, item_id, trip_id, user_id, body, reactions (jsonb) | Per itinerary item; RLS in rls_policies.sql |
| `checklist_items` | id, trip_id, title, is_shared, owner_id, is_checked, checked_by, checked_at, sort_order, created_by | Realtime; sort_order = Math.floor(Date.now()/1000) |
| `expenses` | id, trip_id, title, category, amount_foreign, currency, exchange_rate, amount_thb, split_type, is_cash, paid_at, created_by | Realtime; is_cash excludes from settle-up |
| `expense_participants` | id, expense_id, trip_id, user_id, role ('payer'\|'splitter'), amount_thb | Realtime |
| `bookings` | id, trip_id, category, title, booking_ref, provider, checkin_at, checkout_at, location, notes, **is_private** (bool, default false), **metadata** (jsonb), created_by | is_private controls visibility; metadata stores flight_no/from_airport/to_airport/hotel_address |
| `booking_attachments` | id, booking_id, trip_id, file_name, file_type, storage_path, file_size_bytes, uploaded_by | Files in Storage bucket `trip-files`; RLS follows parent booking's is_private |
| `emergency_meetups` | id, trip_id, day_id, title, lat, lng, description, set_by | Host-only insert/delete; RLS in rls_policies.sql |
| `trip_memos` | id, trip_id, user_id, body (≤120 chars), color, rotation, created_at | Sticky memo board; members select/insert, owner delete; **requires manual SQL run** (in rls_policies.sql) |

**Required manual SQL (run once in Supabase SQL Editor):**
```sql
-- bookings new columns
alter table bookings add column if not exists is_private boolean not null default false;
alter table bookings add column if not exists metadata jsonb default '{}';
grant select,insert,update,delete on bookings to authenticated;
grant select,insert,update,delete on booking_attachments to authenticated;
grant select,insert,delete on trip_memos to authenticated;
```

### Supabase — Storage Buckets
| Bucket | Usage |
|---|---|
| `trip-covers` | Trip banner cover images (host upload) |
| `trip-files` | Booking attachments (PDF, images); path = `bookings/{tripId}/{timestamp}_{filename}` |
| `avatars` | User profile avatars (path = `{user_id}/{timestamp}.{ext}`) |

### Supabase — RLS summary
- **trips**: select = `is_trip_member OR created_by = auth.uid()`, insert = `auth.uid() = created_by`
- **trip_members**: uses `is_trip_member()` / `is_trip_host()` security definer functions to avoid infinite recursion
- **itinerary_items, checklist_items, expenses**: members can select/insert; creator can update/delete
- **emergency_meetups**: members select; host insert/delete
- **item_comments**: members select/insert (user_id = auth.uid()); owner delete
- **bookings**: `is_private=false` → all trip members select; `is_private=true` → only creator; insert/update/delete = creator only
- **booking_attachments**: SELECT follows parent booking's is_private logic via subquery join
- **trip_memos**: members select/insert; owner delete
- **All policies**: in `supabase/rls_policies.sql` — drop all existing policies on a table before re-running

### Supabase — Realtime
```sql
alter publication supabase_realtime add table
  itinerary_items, checklist_items, expenses, expense_participants, trip_members, trip_memos;
```

### Supabase — Security Definer Functions
```sql
-- ป้องกัน infinite recursion ใน trip_members policies
is_trip_member(p_trip_id uuid) returns boolean   -- SECURITY DEFINER, stable
is_trip_host(trip_uuid uuid) returns boolean     -- SECURITY DEFINER, stable

-- join ด้วย invite token
join_trip_by_token(p_token text) returns jsonb
```

### Supabase — Auth
- OAuth providers: Google, Apple
- Callback: `app/auth/callback/route.ts` (exchanges code → session via server client)
- Session stored in **cookies** via `@supabase/ssr`
- Middleware (`middleware.ts`) refreshes session on every request

---

### Design system
- CSS variables: `--bg`, `--s0/s1/s2` (surfaces), `--b0/b1` (borders), `--t1/t2/t3` (text hierarchy)
- Accents: `--indigo`, `--violet`, `--pink`, `--indigo-glow`
- Themes (4 total, set via `data-theme` on `<html>`):
  - **Dark Slate** — default (no data-theme attribute)
  - **Warm Pastel** — `[data-theme="warm-pastel"]`
  - **Jeju Sunlight** — `[data-theme="jeju-sunlight"]` (warm orange accent, cream bg)
  - **Matcha Latte** — `[data-theme="matcha-latte"]` (green accent, soft green bg)
- Theme switcher: `lib/hooks/useTheme.ts`, persists in localStorage, 2×2 grid UI on dashboard
- **All pages use CSS variables only** — never hardcode dark Tailwind classes (`text-white`, `bg-slate-900`, etc.)
  Use inline `style={{ color: 'var(--t1)' }}` etc. so all 4 themes work correctly
- Utility classes: `.glass`, `.shimmer`, `.pressable`, `.btn-primary`, `.spring-enter`, `.fade-up`, `.input`, `.bottom-sheet`, `.scroll-container`
- Body is `position: fixed` (PWA) — scrollable areas use `.scroll-container`
- Bottom nav height: `var(--nav-height)`; safe area: `var(--safe-bottom)`

### TripCard palette system
5 per-trip soft pastel palettes (assigned by `trip.id.charCodeAt(0) % 5`):
- 0: lavender `#f0effe` / accent `#6366f1`
- 1: sky `#e8f5fd` / accent `#0891b2`
- 2: cream-orange `#fff7ed` / accent `#ea580c`
- 3: mint `#ecfdf5` / accent `#059669`
- 4: rose `#fdf2f8` / accent `#db2777`

### External APIs
| API | Usage | Auth |
|---|---|---|
| Open-Meteo | Weather forecast (`lib/utils/weather.ts`) | None (free) |
| Nominatim / OpenStreetMap | Geocoding: destination search + itinerary item search; `addressdetails=1`, `accept-language=ko,en,th` | None (free) |
| open.er-api.com | Live FX rates | None (free) |
| Wikipedia / Wikimedia | Destination image + description; tries `th.wikipedia` for Thai city names | None (free) |

### npm packages (notable)
| Package | Usage |
|---|---|
| `recharts` | Expense pie/donut chart — use `<PieChart width={N} height={N}>` directly, NOT `<ResponsiveContainer>` |
| `canvas-confetti` | Checklist item check animation |
| `promptpay-qr` | Generate PromptPay QR payload |
| `qrcode` | Render QR to canvas |
| `leaflet` | Map view (dynamic import, SSR-safe) |
| `date-fns` | Date formatting, all locales via `th` |

---

### Features done
- **Theme switcher**: 4 themes (Dark Slate / Warm Pastel / Jeju Sunlight / Matcha Latte) — 2×2 grid UI on dashboard, persists in localStorage
- **TripCard pastel redesign**: Korean-minimal soft palette, per-trip pastel hero, SVG sketch overlay (balloon/mountains/compass), torn-ticket scallop divider, glassmorphism badges
- **Trip banner**: cover_image_url (host upload) → Wikipedia photo → gradient fallback
- **SmartTravelTips**: Open-Meteo avg temp → 4 clothing tiers, umbrella if rainy ≥ 2 days
- **Real-time**: supabase.channel on trip_members, itinerary_items, checklist_items, expenses, trip_memos
- **Offline weather cache**: network-first, localStorage fallback
- **FX rate lock**: host locks rates per trip; locked rate used in AddExpenseModal automatically
- **Expense edit/delete**: EditExpenseModal, owner-only pencil button
- **Settle-up**: calculateDebts() — net balance → greedy creditor/debtor matching
- **Invite system**: InviteButton → token → join_trip_by_token RPC
- **Avatar upload**: profile page, Supabase Storage `avatars` bucket, cache-busted URL
- **PromptPay QR**: SettleUpSheet generates QR modal per debt; canvas download
- **Cash expense**: is_cash toggle excludes from settle-up; green "เงินสด" badge
- **Countdown timer**: airplane ✈️ bobbing on dashed progress track (CSS keyframes)
- **Emergency meetups**: host pins lat/lng points on trip overview; open in Google Maps
- **Checklist confetti**: canvas-confetti on item check; paw-print checkbox SVG (pink fill when checked)
- **Packing templates**: 5 categories (เอกสาร, อุปกรณ์ไฟฟ้า, เสื้อผ้า, ของใช้ส่วนตัว, ท่องเที่ยว) — bulk insert
- **Item comments**: ItemComments.tsx connected; RLS policies in rls_policies.sql
- **Custom map markers**: emoji diamond-pin per place type (cafe/food/hotel/airport/etc.)
- **Expense pie chart**: recharts donut with interactive legend + bar breakdown per category
- **Attachment preview modal**: full-screen in-app image (zoom/rotate) + PDF (iframe) viewer
- **Vintage ticket cards**: BookingCard with serrated top/bottom edges, color-coded header per category, barcode-style REF
- **Smart AddBookingModal**: dynamic fields per category; multi-file upload; is_private toggle; metadata JSONB
- **Sticky Memo Board**: pastel post-it notes, random rotation, tape strip, realtime (needs trip_memos SQL)
- **Advanced itinerary search**: Nominatim with debounce 600ms, Korean/English/Thai, OSM emoji per place type
- **DayTimeline redesign**: emoji dot + color accent strip, dashed connector, travel-time chip, collapsible notes
- **PWA icons**: apple-touch-icon.png, favicon.ico/svg/96px, icon-192/512.png; iOS standalone mode meta tags

### Known bugs fixed (reference)
| Bug | Fix |
|---|---|
| trips INSERT RLS 403 | Generate UUID client-side; INSERT without `.select()`; add trip_members first; then SELECT |
| sort_order integer overflow | `Math.floor(Date.now() / 1000)` — Date.now() overflows PostgreSQL int |
| React hydration #418 | `getGreeting()` called new Date() on SSR; fixed with `useState('')` + `useEffect` |
| manifest.json 404 | Middleware intercepted file; added `manifest.json` to matcher exclusion |
| SW cache addAll failure | `/offline` not cached; replaced with `Promise.allSettled` |
| trip_invitations 406/400 | Used `.maybeSingle()` instead of `.single()`; added missing `created_by` |
| Itinerary not updating after add | Zustand optimistic update invisible to local state; fixed with `onAdded` callback chain |
| Wikipedia 404 for Thai cities | Try `th.wikipedia.org` before `en.wikipedia.org` |
| Expense settle-up empty | Payer amount `''` defaulted to 0; fixed by defaulting to amountTHB |
| checklist FK hint error | FK name wrong in `.select()`; changed to `!checked_by` |
| trip_memos FK hint error | PostgREST needs full constraint name; use `profiles!trip_memos_user_id_fkey` not `profiles!user_id` |
| trip_memos 403 | Missing `grant ... to authenticated`; run grant SQL after table creation |
| Light mode invisible text | Hardcode dark Tailwind classes don't respond to themes; always use CSS variables via inline `style={}` |
| recharts width/height -1 warning | `ResponsiveContainer` inside fixed-size div; switch to `<PieChart width={160} height={160}>` directly |
| recharts TypeScript error | `activeIndex` + `activeShape` props don't exist on `Pie` in installed version — remove both |
