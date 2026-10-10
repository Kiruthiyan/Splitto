import type { Member, Expense, Payment, MemberBalance, SettlementSuggestion } from '../types'

/**
 * Formats an amount in integer minor units (cents) to standard LKR format.
 * Example: 150000 -> "Rs. 1,500.00"
 * Negative: -50000 -> "-Rs. 500.00"
 */
export function formatLKR(amountInCents: number): string {
  const isNegative = amountInCents < 0
  const abs = Math.abs(amountInCents)
  const rupees = Math.floor(abs / 100)
  const cents = abs % 100

  const formattedRupees = rupees.toLocaleString('en-US')
  const formattedCents = cents.toString().padStart(2, '0')

  return `${isNegative ? '-' : ''}Rs. ${formattedRupees}.${formattedCents}`
}

/**
 * Formats amount without the currency prefix (for prefilling edit inputs).
 * Example: 150000 -> "1500.00" or "1500"
 */
export function centsToInputValue(cents: number): string {
  if (cents === 0) return ''
  const isNegative = cents < 0
  const abs = Math.abs(cents)
  const r = Math.floor(abs / 100)
  const c = abs % 100
  return `${isNegative ? '-' : ''}${r}${c > 0 ? '.' + c.toString().padStart(2, '0') : ''}`
}

/**
 * Parses user input string (e.g. "1500", "1500.50", "2,000.00") into integer minor units (cents).
 * Throws Error on invalid, negative, or >2 decimal numbers.
 */
export function parseLKRInput(value: string): number {
  const sanitized = value.trim().replace(/,/g, '')
  if (!sanitized) return 0

  const regex = /^\d+(\.\d{1,2})?$/
  if (!regex.test(sanitized)) {
    throw new Error('Please enter a valid positive amount (e.g. 1500 or 1500.50)')
  }

  const parts = sanitized.split('.')
  const rupees = parseInt(parts[0], 10)
  if (!Number.isSafeInteger(rupees)) {
    throw new Error('Amount exceeds safe calculation limits')
  }

  let cents = 0
  if (parts.length > 1) {
    cents = parseInt(parts[1].padEnd(2, '0'), 10)
  }

  const total = rupees * 100 + cents
  if (!Number.isSafeInteger(total)) {
    throw new Error('Amount exceeds safe calculation limits')
  }

  return total
}

/**
 * Distributes an integer amount in cents equally among participants.
 * Leftover remainder cents are distributed deterministically in stable member creation order
 * (first `remainder` members get 1 extra cent).
 * Ensures sum of shares exactly equals total amount.
 */
export function distributeEqualShares(
  totalCents: number,
  participantIds: string[],
  memberCreationOrder: string[]
): Record<string, number> {
  const count = participantIds.length
  if (count === 0) return {}
  if (totalCents < 0) throw new Error('Total amount cannot be negative')

  // Order participant IDs by their original member creation order
  const orderMap = new Map<string, number>()
  memberCreationOrder.forEach((id, idx) => orderMap.set(id, idx))

  const sortedParticipants = [...participantIds].sort((a, b) => {
    const orderA = orderMap.has(a) ? orderMap.get(a)! : 999999
    const orderB = orderMap.has(b) ? orderMap.get(b)! : 999999
    if (orderA !== orderB) return orderA - orderB
    return a.localeCompare(b)
  })

  const baseShare = Math.floor(totalCents / count)
  const remainder = totalCents % count

  const shares: Record<string, number> = {}
  sortedParticipants.forEach((id, idx) => {
    shares[id] = baseShare + (idx < remainder ? 1 : 0)
  })

  return shares
}

/**
 * Calculates net balances for all members derived purely from saved expenses and payments.
 * Formula for each member:
 * net balance = expenses paid - assigned expense shares + settlement payments sent - settlement payments received
 */
export function calculateMemberBalances(
  members: Member[],
  expenses: Expense[],
  payments: Payment[]
): MemberBalance[] {
  const balanceMap = new Map<
    string,
    {
      member: Member
      expensesPaid: number
      expenseShareOwed: number
      paymentsSent: number
      paymentsReceived: number
    }
  >()

  // Initialize every member
  members.forEach((m) => {
    balanceMap.set(m.id, {
      member: m,
      expensesPaid: 0,
      expenseShareOwed: 0,
      paymentsSent: 0,
      paymentsReceived: 0,
    })
  })

  // 1. Process expenses
  expenses.forEach((expense) => {
    const payerData = balanceMap.get(expense.paidById)
    if (payerData) {
      payerData.expensesPaid += expense.amount
    }

    expense.shares.forEach((share) => {
      const participantData = balanceMap.get(share.memberId)
      if (participantData) {
        participantData.expenseShareOwed += share.amount
      }
    })
  })

  // 2. Process payments (settlements)
  payments.forEach((payment) => {
    const senderData = balanceMap.get(payment.fromMemberId)
    if (senderData) {
      senderData.paymentsSent += payment.amount
    }

    const recipientData = balanceMap.get(payment.toMemberId)
    if (recipientData) {
      recipientData.paymentsReceived += payment.amount
    }
  })

  // 3. Compute final net balances
  const balances: MemberBalance[] = []
  balanceMap.forEach((data, memberId) => {
    const netBalance =
      data.expensesPaid -
      data.expenseShareOwed +
      data.paymentsSent -
      data.paymentsReceived

    balances.push({
      memberId,
      name: data.member.name,
      isMe: data.member.isMe,
      isActive: data.member.isActive,
      expensesPaid: data.expensesPaid,
      expenseShareOwed: data.expenseShareOwed,
      paymentsSent: data.paymentsSent,
      paymentsReceived: data.paymentsReceived,
      netBalance,
    })
  })

  return balances
}

/**
 * Total expenses in the ledger (sum of all expenses).
 * Settlement payments NEVER increase this.
 */
export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

export interface PairwiseDebt {
  fromMemberId: string
  toMemberId: string
  amount: number // cents, always > 0: `from` owes `to`
}

/**
 * Direct person-to-person debts derived from expenses and payments.
 * - each expense: every participant (other than payer) owes the payer their share
 * - each payment: reduces what `from` owes `to` (or increases what `to` owes `from`)
 * Opposite directions between the same pair are netted. No third-party routing.
 */
export function calculatePairwiseDebts(expenses: Expense[], payments: Payment[]): PairwiseDebt[] {
  const net = new Map<string, number>() // key "a|b" with a<b; value >0 means a owes b
  const add = (debtor: string, creditor: string, amount: number) => {
    if (debtor === creditor || amount === 0) return
    if (debtor < creditor) {
      const k = `${debtor}|${creditor}`
      net.set(k, (net.get(k) || 0) + amount)
    } else {
      const k = `${creditor}|${debtor}`
      net.set(k, (net.get(k) || 0) - amount)
    }
  }

  expenses.forEach((e) => e.shares.forEach((s) => add(s.memberId, e.paidById, s.amount)))
  // payment from X to Y: Y now owes X that amount (cancels X's debt to Y)
  payments.forEach((p) => add(p.toMemberId, p.fromMemberId, p.amount))

  const out: PairwiseDebt[] = []
  Array.from(net.keys())
    .sort()
    .forEach((k) => {
      const v = net.get(k)!
      if (v === 0) return
      const [a, b] = k.split('|')
      out.push(
        v > 0
          ? { fromMemberId: a, toMemberId: b, amount: v }
          : { fromMemberId: b, toMemberId: a, amount: -v }
      )
    })
  return out
}

/** Amount `from` currently owes `to` directly (0 if none or reversed). */
export function outstandingDebt(
  expenses: Expense[],
  payments: Payment[],
  fromId: string,
  toId: string
): number {
  const d = calculatePairwiseDebts(expenses, payments).find(
    (x) => x.fromMemberId === fromId && x.toMemberId === toId
  )
  return d ? d.amount : 0
}

/**
 * Settlement suggestions = outstanding direct debts (largest first).
 * Never routes through unrelated members.
 */
export function generateSettlementSuggestions(
  members: Member[],
  expenses: Expense[],
  payments: Payment[]
): SettlementSuggestion[] {
  const name = new Map(members.map((m) => [m.id, m.name]))
  return calculatePairwiseDebts(expenses, payments)
    .sort((a, b) => b.amount - a.amount || a.fromMemberId.localeCompare(b.fromMemberId))
    .map((d) => ({
      fromMemberId: d.fromMemberId,
      fromMemberName: name.get(d.fromMemberId) ?? '',
      toMemberId: d.toMemberId,
      toMemberName: name.get(d.toMemberId) ?? '',
      amount: d.amount,
    }))
}

export function isValidDateString(d: unknown): boolean {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const t = new Date(d + 'T00:00:00Z')
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d
}

/** Returns an error string, or null if expense is financially valid. */
export function validateExpenseInput(
  e: Pick<Expense, 'amount' | 'paidById' | 'date' | 'shares'>,
  members: Pick<Member, 'id'>[]
): string | null {
  const ids = new Set(members.map((m) => m.id))
  if (!Number.isSafeInteger(e.amount) || e.amount <= 0) return 'Amount must be greater than zero.'
  if (!ids.has(e.paidById)) return 'Invalid payer.'
  if (!isValidDateString(e.date)) return 'Invalid date.'
  if (!Array.isArray(e.shares) || e.shares.length === 0) return 'Select at least one participant.'
  const seen = new Set<string>()
  let sum = 0
  for (const s of e.shares) {
    if (!ids.has(s.memberId)) return 'Invalid participant.'
    if (seen.has(s.memberId)) return 'Duplicate participant.'
    seen.add(s.memberId)
    if (!Number.isSafeInteger(s.amount) || s.amount < 0) return 'Invalid share amount.'
    sum += s.amount
  }
  if (sum !== e.amount) return 'Shares must add up exactly to the expense amount.'
  return null
}

/**
 * Signed direct balance between two members, from expense shares and payments between
 * them only: > 0 means `a` owes `b`, < 0 means `b` owes `a`, 0 means even.
 */
export function pairBalance(expenses: Expense[], payments: Payment[], a: string, b: string): number {
  const d = calculatePairwiseDebts(expenses, payments).find(
    (x) => (x.fromMemberId === a && x.toMemberId === b) || (x.fromMemberId === b && x.toMemberId === a)
  )
  if (!d) return 0
  return d.fromMemberId === a ? d.amount : -d.amount
}

/**
 * Returns an error string, or null if payment is valid.
 * Any positive amount between two different members is allowed (settlement, partial,
 * overpayment or advance); the UI asks for confirmation when it flips the direction of debt.
 */
export function validatePaymentInput(
  p: Pick<Payment, 'fromMemberId' | 'toMemberId' | 'amount' | 'date'>,
  members: Pick<Member, 'id'>[]
): string | null {
  const ids = new Set(members.map((m) => m.id))
  if (!ids.has(p.fromMemberId)) return 'Invalid payer.'
  if (!ids.has(p.toMemberId)) return 'Invalid recipient.'
  if (p.fromMemberId === p.toMemberId) return 'Payer and recipient cannot be the same member.'
  if (!Number.isSafeInteger(p.amount) || p.amount <= 0) return 'Payment amount must be greater than zero.'
  if (!isValidDateString(p.date)) return 'Invalid date.'
  return null
}
