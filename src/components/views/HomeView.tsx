import React from 'react'
import { useSplitto } from '../../context/SplittoContext'
import { formatLKR } from '../../lib/money'
import { formatDisplayDate } from '../../lib/format'
import { Avatar } from '../common/Avatar'
import { Badge } from '../common/Badge'
import type { Expense, Payment } from '../../types'
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  CreditCard,
  ArrowRight,
  Clock,
  Sparkles,
  Users2,
  Calendar,
  AlertCircle,
  Receipt,
  CheckCircle2,
} from 'lucide-react'

interface HomeViewProps {
  onOpenAddExpense: () => void
  onOpenRecordPayment: (fromId?: string, toId?: string, amountInCents?: number) => void
  onNavigateToMembers: () => void
  onSelectTransaction: (item: { type: 'expense' | 'payment'; data: Expense | Payment }) => void
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenAddExpense,
  onOpenRecordPayment,
  onNavigateToMembers,
  onSelectTransaction,
}) => {
  const {
    members,
    activeMembers,
    expenses,
    payments,
    balances,
    suggestions,
    totalExpenses,
    myBalance,
    everyoneSettled,
  } = useSplitto()

  const myNet = myBalance?.netBalance || 0

  const displayName = (id: string, fallback: string) =>
    members.find((m) => m.id === id)?.isMe ? 'You' : fallback

  // Combine recent transactions (expenses and payments) sorted newest first
  const recentTransactions = React.useMemo(() => {
    const list: Array<{ type: 'expense' | 'payment'; date: string; data: Expense | Payment }> = []
    expenses.forEach((e) => list.push({ type: 'expense', date: e.date, data: e }))
    payments.forEach((p) => list.push({ type: 'payment', date: p.date, data: p }))

    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.data.createdAt || '').localeCompare(a.data.createdAt || ''))
      .slice(0, 6)
  }, [expenses, payments])

  return (
    <div className="space-y-5 pb-24 animate-modal-in">
      {/* 1. If fewer than 2 active members exist, guide the user */}
      {activeMembers.length < 2 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Users2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Add a member to split expenses</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                You need at least two active members to record shared costs. Add someone to get started.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToMembers}
            className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shrink-0 transition min-h-[44px] focus-ring"
          >
            Add Member
          </button>
        </div>
      )}

      {/* 2. MY POSITION HERO CARD */}
      <div
        className={`p-5 rounded-3xl border shadow-sm transition ${
          myNet > 0
            ? 'bg-gradient-to-br from-emerald-500/15 via-white to-emerald-500/5 border-emerald-300 ring-1 ring-emerald-500/20'
            : myNet < 0
            ? 'bg-gradient-to-br from-rose-500/15 via-white to-rose-500/5 border-rose-300 ring-1 ring-rose-500/20'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>Your Net Position</span>
          <Scale
            className={`w-4 h-4 ${
              myNet > 0 ? 'text-emerald-600' : myNet < 0 ? 'text-rose-600' : 'text-slate-500'
            }`}
          />
        </div>

        <div className="mt-3">
          <div
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              myNet > 0 ? 'text-emerald-700' : myNet < 0 ? 'text-rose-700' : 'text-slate-700'
            }`}
          >
            {formatLKR(myNet)}
          </div>

          <div className="mt-2.5">
            {myNet > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <TrendingUp className="w-3.5 h-3.5" />
                You should receive {formatLKR(myNet)}
              </span>
            ) : myNet < 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <TrendingDown className="w-3.5 h-3.5" />
                You owe {formatLKR(Math.abs(myNet))}
              </span>
            ) : expenses.length === 0 && payments.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                No expenses yet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                You are settled
              </span>
            )}
          </div>
        </div>

        {/* Global settled status */}
        {everyoneSettled && members.length > 0 && expenses.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>Everyone is settled! All group balances are zero.</span>
          </div>
        )}
      </div>

      {/* 3. QUICK STATS: Total Expenses, My Total Paid, My Expense Share */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Expenses
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1 block truncate">
            {formatLKR(totalExpenses)}
          </span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            You Paid
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1 block truncate">
            {formatLKR(myBalance?.expensesPaid || 0)}
          </span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Your Share
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1 block truncate">
            {formatLKR(myBalance?.expenseShareOwed || 0)}
          </span>
        </div>
      </div>

      {/* 4. ACTIONS BAR */}
      <div className="flex gap-2.5">
        <button
          onClick={onOpenAddExpense}
          disabled={activeMembers.length < 2}
          className="flex-1 py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Expense</span>
        </button>

        <button
          onClick={() => onOpenRecordPayment()}
          disabled={activeMembers.length < 2}
          className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 min-h-[44px]"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* 5. OUTSTANDING DEBTS (direct, person to person) */}
      {suggestions.length > 0 && (
        <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2.5">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Who Owes Whom
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Outstanding amounts between two people, after any payments already recorded.
          </p>

          <ul className="space-y-2 pt-1">
            {suggestions.map((s) => {
              const fromName = displayName(s.fromMemberId, s.fromMemberName)
              const toName = displayName(s.toMemberId, s.toMemberName)
              const fromIsMe = fromName === 'You'

              return (
                <li
                  key={`${s.fromMemberId}-${s.toMemberId}`}
                  className="p-3 bg-white rounded-xl border border-sky-200/60 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="text-xs min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {fromName} <span className="font-normal text-slate-600">{fromIsMe ? 'owe' : 'owes'}</span> {toName}
                    </p>
                    <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
                      {formatLKR(s.amount)}
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenRecordPayment(s.fromMemberId, s.toMemberId, s.amount)}
                    aria-label={`Record payment from ${fromName} to ${toName}`}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition shrink-0 min-h-[44px] focus-ring"
                  >
                    Record payment
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 6. MEMBERS NET BALANCES LIST */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Members & Balances ({members.length})
          </h2>
          <button
            onClick={onNavigateToMembers}
            className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1"
          >
            <span>Manage</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {balances.map((mb) => (
            <div key={mb.memberId} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={mb.name} isMe={mb.isMe} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{mb.name}</span>
                    {mb.isMe && <Badge variant="navy" size="sm">You</Badge>}
                    {!mb.isActive && <Badge variant="gray" size="sm">Inactive</Badge>}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Paid {formatLKR(mb.expensesPaid)}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`text-xs font-bold ${
                    mb.netBalance > 0
                      ? 'text-emerald-700'
                      : mb.netBalance < 0
                      ? 'text-rose-700'
                      : 'text-slate-500'
                  }`}
                >
                  {formatLKR(mb.netBalance)}
                </span>
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  {mb.netBalance > 0 ? 'Receivable' : mb.netBalance < 0 ? 'Owes' : 'Settled'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. RECENT TRANSACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            Recent Transactions
          </h2>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No transactions recorded yet</p>
            <p className="text-[11px] text-slate-500">
              Tap "Add Expense" to record your first shared cost.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const isExp = tx.type === 'expense'
              const exp = isExp ? (tx.data as Expense) : null
              const pay = !isExp ? (tx.data as Payment) : null

              const payerName = isExp
                ? members.find((m) => m.id === exp?.paidById)?.name || 'Member'
                : members.find((m) => m.id === pay?.fromMemberId)?.name || 'Member'

              const recipientName = !isExp
                ? members.find((m) => m.id === pay?.toMemberId)?.name || 'Member'
                : null

              return (
                <div
                  key={tx.data.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectTransaction(tx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectTransaction(tx)
                    }
                  }}
                  className="focus-ring py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isExp ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isExp ? <Receipt className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {isExp ? exp?.description : `${payerName} paid ${recipientName}`}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{formatDisplayDate(tx.date)}</span>
                        <span>•</span>
                        <span>{isExp ? `Paid by ${payerName}` : pay?.purpose === 'advance' ? 'Advance' : 'Payment'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900">
                      {formatLKR(tx.data.amount)}
                    </span>
                    <span className="block text-[11px] text-slate-500 font-medium capitalize">
                      {isExp ? exp?.category || 'Expense' : pay?.purpose === 'advance' ? 'Advance' : 'Payment'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
