-- ================================================================
-- join_trip_by_token(p_token text)
-- เรียกใช้ผ่าน supabase.rpc('join_trip_by_token', { p_token: '...' })
-- คืนค่า: { trip_id, error }
-- ================================================================
create or replace function join_trip_by_token(p_token text)
returns jsonb
language plpgsql
security definer           -- รันด้วยสิทธิ์ owner ผ่าน RLS
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_inv      record;
  v_trip_id  uuid;
begin
  -- 1. ผู้ใช้ต้องล็อกอินแล้ว
  if v_user_id is null then
    return jsonb_build_object('error', 'กรุณาเข้าสู่ระบบก่อน');
  end if;

  -- 2. ดึง invitation และตรวจสอบความถูกต้อง
  select * into v_inv
  from   trip_invitations
  where  token      = p_token
    and  expires_at > now();

  if not found then
    return jsonb_build_object('error', 'ลิงก์เชิญหมดอายุหรือไม่ถูกต้อง');
  end if;

  -- 3. ตรวจว่าเกิน max_uses หรือไม่ (null = ไม่จำกัด)
  if v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then
    return jsonb_build_object('error', 'ลิงก์เชิญถูกใช้ครบจำนวนแล้ว');
  end if;

  v_trip_id := v_inv.trip_id;

  -- 4. ตรวจว่าเป็นสมาชิกอยู่แล้วหรือไม่
  if exists (
    select 1 from trip_members
    where  trip_id = v_trip_id
      and  user_id = v_user_id
  ) then
    -- ถือว่าสำเร็จ ไม่ต้อง insert ซ้ำ
    return jsonb_build_object('trip_id', v_trip_id);
  end if;

  -- 5. Insert สมาชิกใหม่ด้วย role = 'member'
  insert into trip_members (trip_id, user_id, role)
  values (v_trip_id, v_user_id, 'member');

  -- 6. เพิ่ม use_count
  update trip_invitations
  set    use_count = use_count + 1
  where  token = p_token;

  return jsonb_build_object('trip_id', v_trip_id);

exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

-- อนุญาตให้ authenticated user เรียก RPC นี้ได้
grant execute on function join_trip_by_token(text) to authenticated;
