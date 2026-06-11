import { create } from 'zustand'
import type { Trip, TripMember, ItineraryDay, ItineraryItem, Expense, ChecklistItem } from '@/types'

interface TripState {
  currentTrip: Trip | null
  members: TripMember[]
  days: ItineraryDay[]
  expenses: Expense[]
  checklists: ChecklistItem[]
  isOffline: boolean

  setCurrentTrip: (trip: Trip) => void
  setMembers: (members: TripMember[]) => void
  setDays: (days: ItineraryDay[]) => void

  // Optimistic updates
  addItem: (item: ItineraryItem) => void
  updateItem: (id: string, patch: Partial<ItineraryItem>) => void
  removeItem: (id: string) => void

  addExpense: (expense: Expense) => void
  updateExpense: (id: string, patch: Partial<Expense>) => void
  removeExpense: (id: string) => void

  toggleChecklist: (id: string, checkedBy: string | null, isChecked: boolean) => void
  setOffline: (v: boolean) => void
}

export const useTripStore = create<TripState>((set) => ({
  currentTrip: null,
  members: [],
  days: [],
  expenses: [],
  checklists: [],
  isOffline: false,

  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setMembers: (members) => set({ members }),
  setDays: (days) => set({ days }),

  addItem: (item) => set(state => ({
    days: state.days.map(d =>
      d.id === item.day_id
        ? { ...d, items: [...(d.items ?? []), item].sort((a, b) => a.sort_order - b.sort_order) }
        : d
    )
  })),

  updateItem: (id, patch) => set(state => ({
    days: state.days.map(d => ({
      ...d,
      items: (d.items ?? []).map(i => i.id === id ? { ...i, ...patch } : i)
    }))
  })),

  removeItem: (id) => set(state => ({
    days: state.days.map(d => ({
      ...d,
      items: (d.items ?? []).filter(i => i.id !== id)
    }))
  })),

  addExpense: (expense) => set(state => ({ expenses: [expense, ...state.expenses] })),

  updateExpense: (id, patch) => set(state => ({
    expenses: state.expenses.map(e => e.id === id ? { ...e, ...patch } : e)
  })),

  removeExpense: (id) => set(state => ({
    expenses: state.expenses.filter(e => e.id !== id)
  })),

  toggleChecklist: (id, checkedBy, isChecked) => set(state => ({
    checklists: state.checklists.map(c =>
      c.id === id ? { ...c, is_checked: isChecked, checked_by: checkedBy, checked_at: isChecked ? new Date().toISOString() : null } : c
    )
  })),

  setOffline: (isOffline) => set({ isOffline }),
}))
