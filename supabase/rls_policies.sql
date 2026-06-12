-- ================================================================
-- RLS POLICIES — trip-planner-app
-- รันใน Supabase SQL Editor ทีละ block
-- ================================================================

-- ── 1. itinerary_items ──────────────────────────────────────────
alter table itinerary_items enable row level security;

create policy "itinerary: members select"
  on itinerary_items for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = itinerary_items.trip_id
        and user_id = auth.uid()
    )
  );

create policy "itinerary: members insert"
  on itinerary_items for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_id = itinerary_items.trip_id
        and user_id = auth.uid()
    )
  );

create policy "itinerary: creator update"
  on itinerary_items for update
  using (created_by = auth.uid());

create policy "itinerary: creator delete"
  on itinerary_items for delete
  using (created_by = auth.uid());

-- ── 2. itinerary_days ──────────────────────────────────────────
alter table itinerary_days enable row level security;

create policy "itinerary_days: members select"
  on itinerary_days for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = itinerary_days.trip_id
        and user_id = auth.uid()
    )
  );

-- insert/update ทำผ่าน trigger เท่านั้น (security definer) ไม่ต้องเปิด

-- ── 3. checklist_items ─────────────────────────────────────────
alter table checklist_items enable row level security;

create policy "checklist: members select"
  on checklist_items for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = checklist_items.trip_id
        and user_id = auth.uid()
    )
  );

create policy "checklist: members insert"
  on checklist_items for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_id = checklist_items.trip_id
        and user_id = auth.uid()
    )
  );

-- update: สมาชิกทุกคน toggle ได้ (checked_by, is_checked)
create policy "checklist: members update"
  on checklist_items for update
  using (
    exists (
      select 1 from trip_members
      where trip_id = checklist_items.trip_id
        and user_id = auth.uid()
    )
  );

-- delete: เจ้าของรายการเท่านั้น
create policy "checklist: creator delete"
  on checklist_items for delete
  using (created_by = auth.uid());

-- ── 4. expenses ────────────────────────────────────────────────
alter table expenses enable row level security;

create policy "expenses: members select"
  on expenses for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = expenses.trip_id
        and user_id = auth.uid()
    )
  );

create policy "expenses: members insert"
  on expenses for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_id = expenses.trip_id
        and user_id = auth.uid()
    )
  );

-- update/delete: คนที่สร้างเท่านั้น
create policy "expenses: creator update"
  on expenses for update
  using (created_by = auth.uid());

create policy "expenses: creator delete"
  on expenses for delete
  using (created_by = auth.uid());

-- ── 5. expense_participants ────────────────────────────────────
alter table expense_participants enable row level security;

create policy "exp_participants: members select"
  on expense_participants for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = expense_participants.trip_id
        and user_id = auth.uid()
    )
  );

create policy "exp_participants: members insert"
  on expense_participants for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_id = expense_participants.trip_id
        and user_id = auth.uid()
    )
  );

create policy "exp_participants: members delete"
  on expense_participants for delete
  using (
    exists (
      select 1 from trip_members
      where trip_id = expense_participants.trip_id
        and user_id = auth.uid()
    )
  );

-- ── 6. trips (ถ้ายัง UNRESTRICTED) ────────────────────────────
alter table trips enable row level security;

create policy "trips: members select"
  on trips for select
  using (
    exists (
      select 1 from trip_members
      where trip_id = trips.id
        and user_id = auth.uid()
    )
  );

create policy "trips: authenticated insert"
  on trips for insert
  with check (auth.uid() = created_by);

create policy "trips: host update"
  on trips for update
  using (
    exists (
      select 1 from trip_members
      where trip_id = trips.id
        and user_id = auth.uid()
        and role = 'host'
    )
  );

create policy "trips: host delete"
  on trips for delete
  using (
    exists (
      select 1 from trip_members
      where trip_id = trips.id
        and user_id = auth.uid()
        and role = 'host'
    )
  );

-- ── 7. trip_members (ถ้ายัง UNRESTRICTED) ─────────────────────
alter table trip_members enable row level security;

create policy "trip_members: members select"
  on trip_members for select
  using (
    exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
    )
  );

-- insert ผ่าน join_trip_by_token (security definer) + host สร้างทริป
create policy "trip_members: self or host insert"
  on trip_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
        and tm.role = 'host'
    )
  );

create policy "trip_members: host delete"
  on trip_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
        and tm.role = 'host'
    )
  );
