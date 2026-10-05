import React, { useState } from 'react'
import { useDialog } from '../common/useDialog'
import { useSplitto } from '../../context/SplittoContext'
import { formatLKR } from '../../lib/money'
import { Avatar } from '../common/Avatar'
import { Badge } from '../common/Badge'
import { formatDisplayDate } from '../../lib/format'
import type { Expense, Payment } from '../../types'
import {
  X,
  Receipt,
  CreditCard,
  Calendar,
  Edit2,
  Trash2,
  Users2,
  ArrowRight,
  FileText,
} from 'lucide-react'

interface TransactionDetailModalProps {
  item: { type: 'expense' | 'payment'; data: Expense | Payment } | null
  isOpen: boolean
  onClose: () => void
  onEditExpense: (expense: Expense) => void
  onEditPayment: (payment: Payment) => void
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEditExpense,
  onEditPayment,
}) => {
  const { members, deleteExpense, deletePayment } = useSplitto()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dialogRef = useDialog(isOpen && !!item, onClose)

  if (!isOpen || !item) return null

  const isExp = item.type === 'expense'
  const exp = isExp ? (item.data as Expense) : null
  const pay = !isExp ? (item.data as Payment) : null

  const payer = isExp
    ? members.find((m) => m.id === exp?.paidById)
    : members.find((m) => m.id === pay?.fromMemberId)

  const recipient = !isExp ? members.find((m) => m.id === pay?.toMemberId) : null

  const handleDelete = () => {
    if (isExp && exp) {
      deleteExpense(exp.id)
    } else if (pay) {
      deletePayment(pay.id)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={item?.type === 'expense' ? 'Expense details' : 'Payment details'} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isExp ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isExp ? <Receipt className="w-4 h-4 stroke-[2.2]" /> : <CreditCard className="w-4 h-4 stroke-[2.2]" />}
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {isExp ? 'Expense Details' : 'Payment Details'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main Title & Amount */}
          <div className="text-center py-2 space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatLKR(item.data.amount)}
            </div>
            <p className="text-sm font-bold text-slate-700">
              {isExp ? exp?.description : `${payer?.name} paid ${recipient?.name}`}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDisplayDate(item.data.date)}</span>
              {isExp && exp?.category && (
                <>
                  <span>•</span>
                  <Badge variant="gray" size="sm" className="capitalize">
                    {exp.category}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Details breakdown */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
            {isExp && exp ? (
              <>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Paid By:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Avatar name={payer?.name || 'Member'} isMe={payer?.isMe} size="sm" />
                    {payer?.name} {payer?.isMe ? '(You)' : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Split Method:</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {exp.splitMethod === 'equal'
                      ? 'Split Equally'
                      : exp.splitMethod === 'custom'
                      ? 'Custom Amounts'
                      : 'Assigned to One Person'}
                  </span>
                </div>

                {exp.note && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500 block mb-0.5">Note:</span>
                    <p className="text-slate-700 italic">"{exp.note}"</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-slate-600">
                  <span>From (Payer):</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Avatar name={payer?.name || 'Payer'} isMe={payer?.isMe} size="sm" />
                    {payer?.name} {payer?.isMe ? '(You)' : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>To (Recipient):</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Avatar name={recipient?.name || 'Recipient'} isMe={recipient?.isMe} size="sm" />
                    {recipient?.name} {recipient?.isMe ? '(You)' : ''}
                  </span>
                </div>

                {pay?.note && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500 block mb-0.5">Note:</span>
                    <p className="text-slate-700 italic">"{pay.note}"</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Participant Shares (if expense) */}
          {isExp && exp && exp.shares.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Assigned Shares ({exp.shares.length})
              </span>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {exp.shares.map((s) => {
                  const m = members.find((mem) => mem.id === s.memberId)
                  return (
                    <div
                      key={s.memberId}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={m?.name || 'Member'} isMe={m?.isMe} size="sm" />
                        <span className="font-semibold text-slate-800 truncate">
                          {m?.name || 'Member'} {m?.isMe ? '(You)' : ''}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatLKR(s.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Delete confirmation section */}
          {confirmDelete && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-rose-900">Confirm deletion?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-md hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => {
                onClose()
                if (isExp && exp) onEditExpense(exp)
                else if (pay) onEditPayment(pay)
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition min-h-[44px]"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
