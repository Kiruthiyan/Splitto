import React, { useState, useEffect, useMemo } from 'react'
import { useDialog } from '../common/useDialog'
import { useSplitto } from '../../context/SplittoContext'
import {
  formatLKR,
  parseLKRInput,
  centsToInputValue,
  distributeEqualShares,
} from '../../lib/money'
import { Avatar } from '../common/Avatar'
import type { Expense, ExpenseCategory, SplitMethod } from '../../types'
import {
  X,
  Utensils,
  Car,
  ShoppingBasket,
  FileText,
  Film,
  ShoppingBag,
  Package,
  Calendar,
  AlertCircle,
  Trash2,
  Coins,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  expenseToEdit?: Expense | null
}

const CATEGORIES: { id: ExpenseCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'groceries', label: 'Groceries', icon: ShoppingBasket },
  { id: 'bills', label: 'Bills', icon: FileText },
  { id: 'entertainment', label: 'Fun', icon: Film },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'other', label: 'Other', icon: Package },
]

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
}) => {
  const {
    members,
    activeMembers,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useSplitto()

  // Form state
  const [description, setDescription] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [paidById, setPaidById] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [note, setNote] = useState('')
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal')

  // Selected participant IDs for split
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  // Custom split amounts: memberId -> string
  const [customShares, setCustomShares] = useState<Record<string, string>>({})

  // One-person target member
  const [singleTargetId, setSingleTargetId] = useState<string>('')

  const [formError, setFormError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Creation order of all members
  const memberCreationOrder = useMemo(() => members.map((m) => m.id), [members])

  // Initialize form on open
  useEffect(() => {
    if (!isOpen) return

    setFormError(null)
    setIsDeleting(false)

    if (expenseToEdit) {
      setDescription(expenseToEdit.description)
      setAmountInput(centsToInputValue(expenseToEdit.amount))
      setPaidById(expenseToEdit.paidById)
      setDate(expenseToEdit.date)
      setCategory(expenseToEdit.category || 'other')
      setNote(expenseToEdit.note || '')
      setSplitMethod(expenseToEdit.splitMethod)

      const pIds = expenseToEdit.shares.map((s) => s.memberId)
      setSelectedParticipants(pIds)

      if (expenseToEdit.splitMethod === 'custom') {
        const cMap: Record<string, string> = {}
        expenseToEdit.shares.forEach((s) => {
          cMap[s.memberId] = centsToInputValue(s.amount)
        })
        setCustomShares(cMap)
      } else if (expenseToEdit.splitMethod === 'exact_single') {
        setSingleTargetId(expenseToEdit.shares[0]?.memberId || '')
      }
    } else {
      // New Expense Defaults
      setDescription('')
      setAmountInput('')
      setDate(new Date().toISOString().split('T')[0])
      setCategory('food')
      setNote('')
      setSplitMethod('equal')

      // Default paid by "Me"
      const meMember = members.find((m) => m.isMe) || activeMembers[0]
      setPaidById(meMember?.id || '')

      // Default all active members selected
      const defaultIds = activeMembers.map((m) => m.id)
      setSelectedParticipants(defaultIds)
      setCustomShares({})
      setSingleTargetId(activeMembers[0]?.id || '')
    }
  }, [isOpen, expenseToEdit, members, activeMembers])

  // Total parsed in cents
  const totalAmountInCents = useMemo(() => {
    try {
      return parseLKRInput(amountInput)
    } catch {
      return 0
    }
  }, [amountInput])

  // Computed shares breakdown preview
  const computedShares = useMemo(() => {
    if (totalAmountInCents <= 0) return {}

    if (splitMethod === 'equal') {
      if (selectedParticipants.length === 0) return {}
      return distributeEqualShares(totalAmountInCents, selectedParticipants, memberCreationOrder)
    } else if (splitMethod === 'exact_single') {
      if (!singleTargetId) return {}
      return { [singleTargetId]: totalAmountInCents }
    } else {
      // Custom split
      const res: Record<string, number> = {}
      selectedParticipants.forEach((pId) => {
        try {
          const val = parseLKRInput(customShares[pId] || '')
          res[pId] = val
        } catch {
          res[pId] = 0
        }
      })
      return res
    }
  }, [
    totalAmountInCents,
    splitMethod,
    selectedParticipants,
    memberCreationOrder,
    singleTargetId,
    customShares,
  ])

  // Custom split remaining unallocated amount
  const customAllocatedSum = useMemo(() => {
    if (splitMethod !== 'custom') return 0
    return Object.values(computedShares).reduce((a, b) => a + b, 0)
  }, [splitMethod, computedShares])

  const customRemainingCents = totalAmountInCents - customAllocatedSum

  const dialogRef = useDialog(isOpen, onClose)

  if (!isOpen) return null

  // Participant selection toggle
  const toggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      if (selectedParticipants.length === 1) {
        setFormError('At least one participant must be selected.')
        return
      }
      setSelectedParticipants(selectedParticipants.filter((id) => id !== memberId))
    } else {
      setSelectedParticipants([...selectedParticipants, memberId])
    }
    setFormError(null)
  }

  // Handle custom share input with 2-participant auto remainder calculation
  const handleCustomShareChange = (memberId: string, value: string) => {
    const updated = { ...customShares, [memberId]: value }

    // If exactly 2 participants, entering either automatically calculates the other's remainder!
    if (selectedParticipants.length === 2 && totalAmountInCents > 0) {
      const otherId = selectedParticipants.find((id) => id !== memberId)!
      try {
        const parsed = parseLKRInput(value)
        if (parsed <= totalAmountInCents) {
          const remainder = totalAmountInCents - parsed
          updated[otherId] = centsToInputValue(remainder)
        }
      } catch {
        // do not update other if invalid
      }
    }

    setCustomShares(updated)
    setFormError(null)
  }

  // Assign remainder button for one participant
  const handleAssignRemainder = (memberId: string) => {
    if (customRemainingCents <= 0) return
    const currentVal = customShares[memberId] ? parseLKRInput(customShares[memberId]) : 0
    const newVal = currentVal + customRemainingCents
    setCustomShares({ ...customShares, [memberId]: centsToInputValue(newVal) })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!description.trim()) {
      setFormError('Please enter an expense description.')
      return
    }

    let parsedTotal = 0
    try {
      parsedTotal = parseLKRInput(amountInput)
      if (parsedTotal <= 0) {
        setFormError('Amount must be greater than zero.')
        return
      }
    } catch (err: any) {
      setFormError(err.message || 'Please enter a valid amount.')
      return
    }

    if (!paidById) {
      setFormError('Please choose who paid for this expense.')
      return
    }

    if (splitMethod === 'exact_single') {
      if (!singleTargetId) {
        setFormError('Please select the participant responsible for this expense.')
        return
      }
    } else {
      if (selectedParticipants.length === 0) {
        setFormError('Please select at least one participant.')
        return
      }
    }

    // Build shares array
    let shares: { memberId: string; amount: number }[] = []

    if (splitMethod === 'equal') {
      const shareMap = distributeEqualShares(parsedTotal, selectedParticipants, memberCreationOrder)
      shares = Object.entries(shareMap).map(([mId, amt]) => ({ memberId: mId, amount: amt }))
    } else if (splitMethod === 'exact_single') {
      shares = [{ memberId: singleTargetId, amount: parsedTotal }]
    } else {
      // Custom split: validate exact total
      if (customRemainingCents !== 0) {
        setFormError(
          `Custom shares must equal total amount exactly. Remaining unallocated: ${formatLKR(
            customRemainingCents
          )}.`
        )
        return
      }

      shares = Object.entries(computedShares).map(([mId, amt]) => ({
        memberId: mId,
        amount: amt,
      }))
    }

    const payload = {
      description: description.trim(),
      amount: parsedTotal,
      paidById,
      date,
      category,
      note: note.trim() || undefined,
      splitMethod,
      shares,
    }

    if (expenseToEdit) {
      const res = updateExpense(expenseToEdit.id, payload)
      if (!res.success) {
        setFormError(res.error || 'Failed to update expense.')
        return
      }
    } else {
      const res = createExpense(payload)
      if (!res.success) {
        setFormError(res.error || 'Failed to save expense.')
        return
      }
    }

    onClose()
  }

  const handleDelete = () => {
    if (!expenseToEdit) return
    const res = deleteExpense(expenseToEdit.id)
    if (!res.success) {
      setFormError(res.error || 'Failed to delete expense.')
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={expenseToEdit ? 'Edit expense' : 'Add expense'} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-modal-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <p className="text-[11px] text-slate-500">Record a shared expense in LKR</p>
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
          {formError && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{formError}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="expense-1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <input id="expense-1"
              type="text"
              required
              placeholder="e.g. Breakfast, Dinner, Fuel, CEB Bill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 transition focus-ring font-medium"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="expense-2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount (Rs.) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  Rs.
                </span>
                <input id="expense-2"
                  type="text"
                  required
                  placeholder="0.00"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base font-extrabold text-slate-900 transition focus-ring"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expense-3" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input id="expense-3"
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

          {/* Category */}
          <div>
            <div id="expense-category-label" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </div>
            <div role="group" aria-labelledby="expense-category-label" className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setCategory(cat.id)}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center min-h-[44px] ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-sky-800 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-0.5 ${isSelected ? 'text-sky-600' : 'text-slate-500'}`} />
                    <span className="text-[11px] truncate max-w-full">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Paid By (Active members) */}
          <div>
            <label htmlFor="expense-4" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Paid By <span className="text-rose-500">*</span>
            </label>
            <select id="expense-4"
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 bg-white transition focus-ring font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.isMe ? '(You)' : ''} {!m.isActive ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Split Method Tabs */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Split Method
              </div>
            </div>

            <div role="group" aria-label="Split method" className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-3">
              <button
                type="button"
                aria-pressed={splitMethod === 'equal'}
                onClick={() => setSplitMethod('equal')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition min-h-[40px] ${
                  splitMethod === 'equal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Split Equally
              </button>
              <button
                type="button"
                aria-pressed={splitMethod === 'custom'}
                onClick={() => setSplitMethod('custom')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition min-h-[40px] ${
                  splitMethod === 'custom'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Custom Amounts
              </button>
              <button
                type="button"
                aria-pressed={splitMethod === 'exact_single'}
                onClick={() => setSplitMethod('exact_single')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition min-h-[40px] ${
                  splitMethod === 'exact_single'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                One Person
              </button>
            </div>

            {/* Split Method 1: EQUAL SPLIT */}
            {splitMethod === 'equal' && (
              <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Select participants in split:</span>
                  <span className="font-bold text-slate-700" aria-live="polite">
                    {selectedParticipants.length} {selectedParticipants.length === 1 ? 'person' : 'people'} selected
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {members.map((m) => {
                    const isSelected = selectedParticipants.includes(m.id)
                    const share = computedShares[m.id] || 0

                    return (
                      <label
                        key={m.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition min-h-[44px] ${
                          isSelected
                            ? 'bg-white border-sky-300 shadow-2xs'
                            : 'bg-white/40 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParticipant(m.id)}
                            className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                          />
                          <Avatar name={m.name} isMe={m.isMe} size="sm" />
                          <span className="text-xs font-bold text-slate-800">
                            {m.name} {m.isMe ? '(You)' : ''}
                          </span>
                        </div>

                        {isSelected && totalAmountInCents > 0 && (
                          <span className="text-xs font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                            {formatLKR(share)}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Split Method 2: CUSTOM AMOUNTS */}
            {splitMethod === 'custom' && (
              <div className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Enter each participant's share:</span>
                  <span
                    role="status"
                    className={`font-bold ${
                      customRemainingCents === 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {customRemainingCents === 0
                      ? 'Balanced: shares match the total'
                      : customRemainingCents > 0
                      ? `Remaining to assign: ${formatLKR(customRemainingCents)}`
                      : `Over by ${formatLKR(-customRemainingCents)}`}
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {members.map((m) => {
                    const isSelected = selectedParticipants.includes(m.id)
                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 bg-white rounded-xl border flex items-center justify-between gap-3 ${
                          isSelected ? 'border-slate-200' : 'border-slate-100 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParticipant(m.id)}
                            className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                          />
                          <Avatar name={m.name} isMe={m.isMe} size="sm" />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {m.name}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-28 shrink-0">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">
                                Rs.
                              </span>
                              <input
                                type="text"
                                aria-label={`${m.name} share in rupees`}
                                placeholder="0.00"
                                inputMode="decimal"
                                value={customShares[m.id] || ''}
                                onChange={(e) => handleCustomShareChange(m.id, e.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-right text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              />
                            </div>

                            {customRemainingCents > 0 && (
                              <button
                                type="button"
                                onClick={() => handleAssignRemainder(m.id)}
                                className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold rounded border border-sky-200 shrink-0"
                                title="Assign all remaining unallocated amount to this member"
                              >
                                + Remainder
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Split Method 3: ONE PERSON */}
            {splitMethod === 'exact_single' && (
              <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <label htmlFor="expense-5" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Assign entire cost to:
                </label>
                <select id="expense-5"
                  value={singleTargetId}
                  onChange={(e) => setSingleTargetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 bg-white transition focus-ring font-medium"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isMe ? '(You)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  The payer paid, but this single person is 100% responsible for the cost.
                </p>
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="expense-6" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Note (Optional)
            </label>
            <input id="expense-6"
              type="text"
              placeholder="e.g. Receipt #1234, special remarks"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 transition focus-ring"
            />
          </div>

          {/* Delete Expense Section (in edit mode) */}
          {expenseToEdit && (
            <div className="pt-3 border-t border-slate-100">
              {!isDeleting ? (
                <button
                  type="button"
                  onClick={() => setIsDeleting(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete this expense</span>
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
              <Coins className="w-4 h-4" />
              <span>{expenseToEdit ? 'Save Changes' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
