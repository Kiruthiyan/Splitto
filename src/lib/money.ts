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

/**
 * Generates settlement suggestions matching debtors with creditors.
 * Deterministic matching: matches debtors (most negative first) to creditors (most positive first).
 */
export function generateSettlementSuggestions(
  balances: MemberBalance[]
): SettlementSuggestion[] {
  const debtors: { id: string; name: string; amountOwed: number }[] = []
  const creditors: { id: string; name: string; amountReceivable: number }[] = []

  balances.forEach((b) => {
    if (b.netBalance < 0) {
      debtors.push({
        id: b.memberId,
        name: b.name,
        amountOwed: Math.abs(b.netBalance),
      })
    } else if (b.netBalance > 0) {
      creditors.push({
        id: b.memberId,
        name: b.name,
        amountReceivable: b.netBalance,
      })
    }
  })

  // Sort deterministically: highest debts & receivables first
  debtors.sort((a, b) => b.amountOwed - a.amountOwed || a.id.localeCompare(b.id))
  creditors.sort((a, b) => b.amountReceivable - a.amountReceivable || a.id.localeCompare(b.id))

  const suggestions: SettlementSuggestion[] = []
  let dIdx = 0
  let cIdx = 0

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx]
    const creditor = creditors[cIdx]

    if (debtor.amountOwed === 0) {
      dIdx++
      continue
    }
    if (creditor.amountReceivable === 0) {
      cIdx++
      continue
    }

    const settleAmount = Math.min(debtor.amountOwed, creditor.amountReceivable)
    if (settleAmount > 0) {
      suggestions.push({
        fromMemberId: debtor.id,
        fromMemberName: debtor.name,
        toMemberId: creditor.id,
        toMemberName: creditor.name,
        amount: settleAmount,
      })

      debtor.amountOwed -= settleAmount
      creditor.amountReceivable -= settleAmount
    }

    if (debtor.amountOwed === 0) dIdx++
    if (creditor.amountReceivable === 0) cIdx++
  }

  return suggestions
}
