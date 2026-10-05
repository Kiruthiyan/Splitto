import React, { useState } from 'react'
import { useDialog } from '../common/useDialog'
import { useSplitto } from '../../context/SplittoContext'
import { formatLKR } from '../../lib/money'
import { Avatar } from '../common/Avatar'
import { Badge } from '../common/Badge'
import { formatDisplayDate } from '../../lib/format'
import type { Member } from '../../types'
import {
  X,
  TrendingUp,
  TrendingDown,
  Power,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  CreditCard,
} from 'lucide-react'

interface MemberDetailModalProps {
  member: Member | null
  isOpen: boolean
  onClose: () => void
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const {
    balances,
    toggleMemberActive,
    deleteMember,
    expenses,
    payments,
  } = useSplitto()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const dialogRef = useDialog(isOpen && !!member, onClose)

  if (!isOpen || !member) return null

  const memberBalance = balances.find((b) => b.memberId === member.id)
  const net = memberBalance?.netBalance || 0

  // Count references
  const expenseCount = expenses.filter(
    (e) => e.paidById === member.id || e.shares.some((s) => s.memberId === member.id)
  ).length

  const paymentCount = payments.filter(
    (p) => p.fromMemberId === member.id || p.toMemberId === member.id
  ).length

  const isReferenced = expenseCount > 0 || paymentCount > 0

  const handleToggleActive = () => {
    setErrorMsg(null)
    const res = toggleMemberActive(member.id)
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update member status.')
    } else {
      onClose()
    }
  }

  const handleDelete = () => {
    setErrorMsg(null)
    const res = deleteMember(member.id)
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to delete member.')
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={member ? `${member.name} details` : 'Member details'} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Avatar name={member.name} isMe={member.isMe} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-slate-900">{member.name}</h2>
                {member.isMe && <Badge variant="navy" size="sm">You</Badge>}
                {!member.isActive && <Badge variant="gray" size="sm">Inactive</Badge>}
              </div>
              <p className="text-[11px] text-slate-500">
                Added {formatDisplayDate(member.createdAt)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Net Balance Highlight */}
          <div
            className={`p-4 rounded-2xl border text-center ${
              net > 0
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : net < 0
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 block">
              Current Net Balance
            </span>
            <div
              className={`text-2xl font-extrabold mt-1 ${
                net > 0 ? 'text-emerald-700' : net < 0 ? 'text-rose-700' : 'text-slate-700'
              }`}
            >
              {formatLKR(net)}
            </div>
            <p className="text-xs font-semibold mt-1 opacity-90">
              {net > 0
                ? `${member.name} should receive this money`
                : net < 0
                ? `${member.name} owes this money`
                : 'All settled up with zero balance'}
            </p>
          </div>

          {/* Breakdown Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Financial Breakdown
            </h3>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  Expenses Paid Out:
                </span>
                <span className="font-bold text-slate-900">
                  {formatLKR(memberBalance?.expensesPaid || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  Assigned Expense Share:
                </span>
                <span className="font-bold text-slate-900">
                  {formatLKR(memberBalance?.expenseShareOwed || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  Payments Sent:
                </span>
                <span className="font-bold text-slate-900">
                  {formatLKR(memberBalance?.paymentsSent || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  Payments Received:
                </span>
                <span className="font-bold text-slate-900">
                  {formatLKR(memberBalance?.paymentsReceived || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* History Reference Note */}
          <div className="text-[11px] text-slate-500 bg-slate-100/70 p-3 rounded-xl leading-relaxed">
            Referenced in <strong>{expenseCount}</strong> expenses and{' '}
            <strong>{paymentCount}</strong> payments.
          </div>

          {/* Action buttons (Deactivate / Reactivate / Delete) */}
          {!member.isMe && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {/* Inactivation / Reactivation */}
              <button
                type="button"
                onClick={handleToggleActive}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Power className="w-4 h-4 text-slate-500" />
                <span>
                  {member.isActive ? 'Mark Member Inactive' : 'Reactivate Member'}
                </span>
              </button>

              {/* Permanent Deletion (only if completely unreferenced) */}
              {!isReferenced && (
                <div>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Permanently Delete Member</span>
                    </button>
                  ) : (
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
