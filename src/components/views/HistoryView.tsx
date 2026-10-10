import React, { useState, useMemo } from 'react'
import { useSplitto } from '../../context/SplittoContext'
import { formatLKR } from '../../lib/money'
import { formatDisplayDate } from '../../lib/format'
import type { Expense, Payment, TransactionFilter } from '../../types'
import { Receipt, CreditCard, Search, Calendar, Filter } from 'lucide-react'

interface HistoryViewProps {
  onSelectTransaction: (item: { type: 'expense' | 'payment'; data: Expense | Payment }) => void
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectTransaction }) => {
  const { expenses, payments, members } = useSplitto()
  const [filter, setFilter] = useState<TransactionFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const memberMap = useMemo(() => {
    const map = new Map<string, string>()
    members.forEach((m) => map.set(m.id, m.name))
    return map
  }, [members])

  // Combine, filter, and sort transactions
  const filteredList = useMemo(() => {
    const list: Array<{ type: 'expense' | 'payment'; date: string; data: Expense | Payment }> = []

    if (filter === 'all' || filter === 'expenses') {
      expenses.forEach((e) => list.push({ type: 'expense', date: e.date, data: e }))
    }
    if (filter === 'all' || filter === 'payments') {
      payments.forEach((p) => list.push({ type: 'payment', date: p.date, data: p }))
    }

    // Sort newest date first
    list.sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        (b.data.createdAt || '').localeCompare(a.data.createdAt || '')
    )

    // Search query filter
    if (!searchQuery.trim()) return list

    const q = searchQuery.toLowerCase()
    return list.filter((item) => {
      if (item.type === 'expense') {
        const exp = item.data as Expense
        const payer = memberMap.get(exp.paidById)?.toLowerCase() || ''
        return (
          exp.description.toLowerCase().includes(q) ||
          (exp.category && exp.category.toLowerCase().includes(q)) ||
          payer.includes(q)
        )
      } else {
        const pay = item.data as Payment
        const from = memberMap.get(pay.fromMemberId)?.toLowerCase() || ''
        const to = memberMap.get(pay.toMemberId)?.toLowerCase() || ''
        return from.includes(q) || to.includes(q) || (pay.note && pay.note.toLowerCase().includes(q))
      }
    })
  }, [expenses, payments, filter, searchQuery, memberMap])

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredList> = {}
    filteredList.forEach((item) => {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    })
    return groups
  }, [filteredList])

  const dateKeys = Object.keys(groupedByDate)

  return (
    <div className="space-y-4 pb-24 animate-modal-in">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
            Transaction History
          </h1>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredList.length} {filteredList.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            aria-label="Search transactions"
            placeholder="Search description, member, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-xs text-slate-900 transition focus-ring"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            aria-pressed={filter === 'expenses'}
            onClick={() => setFilter('expenses')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] ${
              filter === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Expenses
          </button>
          <button
            aria-pressed={filter === 'payments'}
            onClick={() => setFilter('payments')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] ${
              filter === 'payments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Payments
          </button>
        </div>
      </div>

      {/* Date-Grouped Transaction List */}
      {dateKeys.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No records found</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {searchQuery ? 'Try adjusting your search query.' : 'Record an expense or payment to see it here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateKeys.map((date) => {
            const items = groupedByDate[date]
            const formattedDateHeader = formatDisplayDate(date)

            return (
              <div key={date} className="space-y-2">
                <div className="px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {formattedDateHeader}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                  {items.map((item) => {
                    const isExp = item.type === 'expense'
                    const exp = isExp ? (item.data as Expense) : null
                    const pay = !isExp ? (item.data as Payment) : null

                    const payerName = isExp
                      ? memberMap.get(exp?.paidById || '') || 'Member'
                      : memberMap.get(pay?.fromMemberId || '') || 'Member'

                    const recipientName = !isExp
                      ? memberMap.get(pay?.toMemberId || '') || 'Member'
                      : null

                    const splitSummary = isExp
                      ? exp?.shares.length === members.length
                        ? 'Split among all'
                        : `${exp?.shares.length} participants`
                      : null

                    return (
                      <div
                        key={item.data.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectTransaction(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelectTransaction(item)
                          }
                        }}
                        className="focus-ring p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition min-h-[56px]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isExp
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isExp ? (
                              <Receipt className="w-4 h-4 stroke-[2.2]" />
                            ) : (
                              <CreditCard className="w-4 h-4 stroke-[2.2]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {isExp ? exp?.description : `${payerName} paid ${recipientName}`}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {isExp
                                ? `Paid by ${payerName} • ${splitSummary}`
                                : `${payerName} → ${recipientName}${pay?.purpose === 'advance' ? ' • Advance' : ''}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-bold ${
                              isExp ? 'text-slate-900' : 'text-emerald-700'
                            }`}
                          >
                            {formatLKR(item.data.amount)}
                          </span>
                          <span className="block text-[11px] font-semibold text-slate-500 capitalize">
                            {isExp ? exp?.category || 'Expense' : pay?.purpose === 'advance' ? 'Advance' : 'Payment'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
