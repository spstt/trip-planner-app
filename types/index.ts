// ============================================================
// SHARED TYPES — mirrors Supabase schema
// ============================================================

export type UserRole = 'host' | 'member'
export type BookingCategory = 'flight' | 'hotel' | 'train' | 'rental' | 'activity' | 'other'
export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'activity' | 'shopping' | 'other'
export type SplitType = 'equal' | 'custom'
export type ParticipantRole = 'payer' | 'splitter'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  default_currency: string
  bank_account: string | null
  promptpay: string | null
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  name: string
  destination: string
  destination_lat: number | null
  destination_lng: number | null
  cover_image_url: string | null
  start_date: string
  end_date: string
  is_international: boolean
  created_by: string
  locked_rates: Record<string, number>
  rates_locked_at: string | null
  created_at: string
  updated_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: Profile
}

export interface TripInvitation {
  id: string
  trip_id: string
  token: string
  created_by: string
  expires_at: string
  max_uses: number | null
  use_count: number
  created_at: string
}

export interface ItineraryDay {
  id: string
  trip_id: string
  day_number: number
  date: string
  title: string | null
  created_at: string
  items?: ItineraryItem[]
}

export interface ItineraryItem {
  id: string
  trip_id: string
  day_id: string
  is_backup: boolean
  sort_order: number
  title: string
  location_name: string | null
  lat: number | null
  lng: number | null
  start_time: string | null
  duration_min: number | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  creator?: Profile
  comments?: ItemComment[]
}

export interface ItemComment {
  id: string
  item_id: string
  trip_id: string
  user_id: string
  body: string
  reactions: Record<string, string>
  created_at: string
  profile?: Profile
}

export interface EmergencyMeetup {
  id: string
  trip_id: string
  day_id: string | null
  title: string
  lat: number
  lng: number
  description: string | null
  set_by: string
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  trip_id: string
  category: BookingCategory
  title: string
  booking_ref: string | null
  provider: string | null
  checkin_at: string | null
  checkout_at: string | null
  location: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  attachments?: BookingAttachment[]
}

export interface BookingAttachment {
  id: string
  booking_id: string
  trip_id: string
  file_name: string
  file_type: string
  storage_path: string
  file_size_bytes: number | null
  uploaded_by: string
  created_at: string
  signedUrl?: string // ephemeral, not stored in DB
}

export interface Expense {
  id: string
  trip_id: string
  title: string
  category: ExpenseCategory
  amount_foreign: number
  currency: string
  exchange_rate: number
  amount_thb: number
  split_type: SplitType
  is_cash: boolean
  notes: string | null
  paid_at: string
  created_by: string
  created_at: string
  updated_at: string
  participants?: ExpenseParticipant[]
}

export interface ExpenseParticipant {
  id: string
  expense_id: string
  trip_id: string
  user_id: string
  role: ParticipantRole
  amount_thb: number
  profile?: Profile
}

export interface ChecklistItem {
  id: string
  trip_id: string
  title: string
  is_shared: boolean
  owner_id: string | null
  checked_by: string | null
  is_checked: boolean
  checked_at: string | null
  sort_order: number
  created_by: string
  created_at: string
  checker?: Profile
}

// Computed debt settlement
export interface DebtEntry {
  from: string      // user_id who owes
  to: string        // user_id who is owed
  amount: number    // THB
  fromProfile?: Profile
  toProfile?: Profile
}

// Weather from Open-Meteo
export interface WeatherDay {
  date: string
  tempMax: number
  tempMin: number
  weatherCode: number
  precipitationSum: number
}
