export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'groceries'
  | 'bills'
  | 'entertainment'
  | 'shopping'
  | 'other'

export type PaymentPurpose = 'settlement' | 'advance'

export type SplitMethod = 'equal' | 'custom' | 'exact_single'

export interface Member {
  id: string
  name: string
  isMe: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ExpenseShare {
  memberId: string
  amount: number // in cents (integer)
}

export interface Expense {
  id: string
  description: string
  amount: number // in cents (integer)
  paidById: string
  date: string // YYYY-MM-DD
  category?: ExpenseCategory
  note?: string
  splitMethod: SplitMethod
  shares: ExpenseShare[]
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  fromMemberId: string
  toMemberId: string
  amount: number // in cents (integer)
  date: string // YYYY-MM-DD
  note?: string
  purpose?: PaymentPurpose // descriptive only; missing = 'settlement'
  createdAt: string
  updatedAt: string
}

export interface SplittoData {
  schemaVersion: 1
  revision: number
  operatorName: string | null
  members: Member[]
  expenses: Expense[]
  payments: Payment[]
}

export interface MemberBalance {
  memberId: string
  name: string
  isMe: boolean
  isActive: boolean
  expensesPaid: number // in cents
  expenseShareOwed: number // in cents
  paymentsSent: number // in cents
  paymentsReceived: number // in cents
  netBalance: number // in cents. >0 receivable, <0 owes, 0 settled
}

export interface SettlementSuggestion {
  fromMemberId: string
  fromMemberName: string
  toMemberId: string
  toMemberName: string
  amount: number // in cents
}

export type TransactionFilter = 'all' | 'expenses' | 'payments'
