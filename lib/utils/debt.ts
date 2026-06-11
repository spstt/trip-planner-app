import type { Expense, ExpenseParticipant, DebtEntry } from '@/types'

// Debt optimization: minimize number of transactions
// Uses a greedy algorithm on net balances
export function calculateDebts(
  expenses: Expense[],
  participants: ExpenseParticipant[]
): DebtEntry[] {
  // Calculate net balance per user (positive = owed money, negative = owes money)
  const balances: Record<string, number> = {}

  for (const expense of expenses) {
    const expParticipants = participants.filter(p => p.expense_id === expense.id)
    const payers = expParticipants.filter(p => p.role === 'payer')
    const splitters = expParticipants.filter(p => p.role === 'splitter')

    for (const payer of payers) {
      balances[payer.user_id] = (balances[payer.user_id] ?? 0) + payer.amount_thb
    }
    for (const splitter of splitters) {
      balances[splitter.user_id] = (balances[splitter.user_id] ?? 0) - splitter.amount_thb
    }
  }

  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0.01)
    .map(([id, b]) => ({ id, amount: b }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < -0.01)
    .map(([id, b]) => ({ id, amount: -b }))
    .sort((a, b) => b.amount - a.amount)

  const debts: DebtEntry[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci]
    const debt = debtors[di]
    const amount = Math.min(credit.amount, debt.amount)

    if (amount > 0.01) {
      debts.push({ from: debt.id, to: credit.id, amount: Math.round(amount * 100) / 100 })
    }

    credit.amount -= amount
    debt.amount -= amount

    if (credit.amount < 0.01) ci++
    if (debt.amount < 0.01) di++
  }

  return debts
}

export function formatCurrency(amount: number, currency = 'THB'): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
