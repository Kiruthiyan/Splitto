import React, { useState, useEffect } from 'react'
import { useDialog } from '../common/useDialog'
import { useSplitto } from '../../context/SplittoContext'
import {
  formatLKR,
  parseLKRInput,
  outstandingDebt,
  centsToInputValue,
} from '../../lib/money'
import { Avatar } from '../common/Avatar'
import type { Payment } from '../../types'
import {
  X,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Trash2,
} from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentToEdit?: Payment | null
  initialFromId?: string
  initialToId?: string
  initialAmountInCents?: number
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentToEdit,
  initialFromId,
  initialToId,
  initialAmountInCents,
}) => {
  const {
    members,
    balances,
    expenses,
    payments,
    recordPayment,
    updatePayment,
    deletePayment,
  } = useSplitto()

  const [fromMemberId, setFromMemberId] = useState('')
  const [toMemberId, setToMemberId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Initialize modal state
  useEffect(() => {
    if (!isOpen) return

    setErrorMsg(null)
    setIsDeleting(false)

    if (paymentToEdit) {
      setFromMemberId(paymentToEdit.fromMemberId)
      setToMemberId(paymentToEdit.toMemberId)
      setAmountInput(centsToInputValue(paymentToEdit.amount))
      setDate(paymentToEdit.date)
      setNote(paymentToEdit.note || '')
    } else {
      const meMember = members.find((m) => m.isMe)
      const otherMember = members.find((m) => !m.isMe)

      setFromMemberId(initialFromId || otherMember?.id || '')
      setToMemberId(initialToId || meMember?.id || '')

      if (initialAmountInCents && initialAmountInCents > 0) {
        setAmountInput(centsToInputValue(initialAmountInCents))
      } else {
        setAmountInput('')
      }

      setDate(new Date().toISOString().split('T')[0])
      setNote('')
    }
  }, [isOpen, paymentToEdit, initialFromId, initialToId, initialAmountInCents, members])

  const dialogRef = useDialog(isOpen, onClose)

  if (!isOpen) return null

  const fromMember = members.find((m) => m.id === fromMemberId)
  const toMember = members.find((m) => m.id === toMemberId)

  // Calculate current balances and previewed resulting balances
  let parsedAmount = 0
  try {
    parsedAmount = parseLKRInput(amountInput)
  } catch {
    parsedAmount = 0
  }

  const currentFromBalance = balances.find((b) => b.memberId === fromMemberId)?.netBalance || 0
  const currentToBalance = balances.find((b) => b.memberId === toMemberId)?.netBalance || 0

  // Resulting balance preview:
  // Payer sends money -> payer net balance becomes `currentFromBalance + parsedAmount`
  // Recipient receives money -> recipient net balance becomes `currentToBalance - parsedAmount`
  const previewFromBalance = currentFromBalance + parsedAmount
  const previewToBalance = currentToBalance - parsedAmount

  // Direct debt fromMember -> toMember, excluding the payment being edited
  const outstanding = outstandingDebt(
    expenses,
    payments.filter((p) => p.id !== paymentToEdit?.id),
    fromMemberId,
    toMemberId
  )
  const isOverpayment = parsedAmount > 0 && parsedAmount > outstanding

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!fromMemberId || !toMemberId) {
      setErrorMsg('Please select both the payer and recipient.')
      return
    }

    if (fromMemberId === toMemberId) {
      setErrorMsg('Payer and recipient cannot be the same member.')
      return
    }

    if (parsedAmount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.')
      return
    }

    if (isOverpayment) {
      setErrorMsg(
        outstanding === 0
          ? 'Nothing is owed in that direction.'
          : `Payment exceeds outstanding debt of ${formatLKR(outstanding)}.`
      )
      return
    }

    const payload = {
      fromMemberId,
      toMemberId,
      amount: parsedAmount,
      date,
      note: note.trim() || undefined,
    }

    if (paymentToEdit) {
      const res = updatePayment(paymentToEdit.id, payload)
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update payment.')
        return
      }
    } else {
      const res = recordPayment(payload)
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record payment.')
        return
      }
    }

    onClose()
  }

  const handleDelete = () => {
    if (!paymentToEdit) return
    const res = deletePayment(paymentToEdit.id)
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to delete payment.')
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={paymentToEdit ? 'Edit payment' : 'Record payment'} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-modal-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {paymentToEdit ? 'Edit Payment' : 'Record Payment'}
            </h2>
            <p className="text-[11px] text-slate-500">Record a payment made outside the app</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* External Payment Callout */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-sky-950 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-950">Payment made outside the app</p>
              <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                This records a cash, bank transfer, or online payment that was already made. Splitto does not transfer real funds.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Visual direction card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={fromMember?.name || 'Payer'} isMe={fromMember?.isMe} size="sm" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {fromMember?.name || 'Payer'}
                </span>
                <span className="text-[11px] text-slate-500">Payer</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

            <div className="flex items-center gap-2 min-w-0 text-right">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {toMember?.name || 'Recipient'}
                </span>
                <span className="text-[11px] text-slate-500">Recipient</span>
              </div>
              <Avatar name={toMember?.name || 'Recipient'} isMe={toMember?.isMe} size="sm" />
            </div>
          </div>

          {/* From Member Dropdown */}
          <div>
            <label htmlFor="payment-1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Who paid? (From) <span className="text-rose-500">*</span>
            </label>
            <select id="payment-1"
              value={fromMemberId}
              onChange={(e) => {
                setFromMemberId(e.target.value)
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 bg-white transition focus-ring font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.isMe ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* To Member Dropdown */}
          <div>
            <label htmlFor="payment-2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Who received? (To) <span className="text-rose-500">*</span>
            </label>
            <select id="payment-2"
              value={toMemberId}
              onChange={(e) => {
                setToMemberId(e.target.value)
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 bg-white transition focus-ring font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === fromMemberId}>
                  {m.name} {m.isMe ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="payment-3" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount (Rs.) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  Rs.
                </span>
                <input id="payment-3"
                  type="text"
                  required
                  placeholder="0.00"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value)
                  }}
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base font-extrabold text-slate-900 transition focus-ring"
                />
              </div>
            </div>

            <div>
              <label htmlFor="payment-4" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input id="payment-4"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 transition focus-ring"
                />
                <Calendar className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Resulting Balance Preview Card */}
          {parsedAmount > 0 && fromMember && toMember && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Resulting Balance Preview
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{fromMember.name}'s balance:</span>
                <span className="font-bold text-slate-900">
                  {formatLKR(currentFromBalance)} ➔{' '}
                  <strong className={previewFromBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatLKR(previewFromBalance)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{toMember.name}'s balance:</span>
                <span className="font-bold text-slate-900">
                  {formatLKR(currentToBalance)} ➔{' '}
                  <strong className={previewToBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatLKR(previewToBalance)}
                  </strong>
                </span>
              </div>

              {isOverpayment && (
                <div className="pt-2 border-t border-slate-200 text-[11px] text-rose-700 font-semibold">
                  {outstanding === 0
                    ? 'Nothing is owed in that direction.'
                    : `Exceeds outstanding debt of ${formatLKR(outstanding)}.`}
                </div>
              )}
            </div>
          )}

          {/* Optional Note */}
          <div>
            <label htmlFor="payment-5" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Note (Optional)
            </label>
            <input id="payment-5"
              type="text"
              placeholder="e.g. Bank transfer ref #1234, cash in hand"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 transition focus-ring"
            />
          </div>

          {/* Delete Payment Option (when editing) */}
          {paymentToEdit && (
            <div className="pt-3 border-t border-slate-100">
              {!isDeleting ? (
                <button
                  type="button"
                  onClick={() => setIsDeleting(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete this payment record</span>
                </button>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-900">Confirm deletion?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleting(false)}
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

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition min-h-[44px] flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>{paymentToEdit ? 'Save Changes' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
