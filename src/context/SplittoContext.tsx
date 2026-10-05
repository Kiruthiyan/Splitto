import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type {
  SplittoData,
  Member,
  Expense,
  Payment,
  MemberBalance,
  SettlementSuggestion,
} from '../types'
import {
  loadSplittoData,
  saveSplittoData,
  exportBackup,
  validateBackupData,
  resetSplittoStorage,
  getInitialSplittoData,
} from '../lib/storage'
import {
  calculateMemberBalances,
  calculateTotalExpenses,
  generateSettlementSuggestions,
} from '../lib/money'

interface SplittoContextType {
  data: SplittoData
  isInitialized: boolean
  operatorName: string | null
  members: Member[]
  activeMembers: Member[]
  expenses: Expense[]
  payments: Payment[]
  balances: MemberBalance[]
  suggestions: SettlementSuggestion[]
  totalExpenses: number
  myBalance: MemberBalance | null
  everyoneSettled: boolean
  initializeOperator: (name: string, initialFriends?: string[]) => { success: boolean; error?: string }
  addMember: (name: string) => { success: boolean; error?: string; memberId?: string }
  renameMember: (id: string, newName: string) => { success: boolean; error?: string }
  toggleMemberActive: (id: string) => { success: boolean; error?: string }
  deleteMember: (id: string) => { success: boolean; error?: string }
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string }
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string }
  deleteExpense: (id: string) => { success: boolean; error?: string }
  recordPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string }
  updatePayment: (id: string, payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string }
  deletePayment: (id: string) => { success: boolean; error?: string }
  updateOperatorName: (name: string) => { success: boolean; error?: string }
  importBackup: (jsonString: string) => { success: boolean; error?: string; counts?: { members: number; expenses: number; payments: number } }
  exportCurrentBackup: () => void
  resetAllData: () => void
  reloadFromStorage: () => void
}

const SplittoContext = createContext<SplittoContextType | undefined>(undefined)

export const SplittoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<SplittoData>(() => loadSplittoData())

  const reloadFromStorage = useCallback(() => {
    const loaded = loadSplittoData()
    setData(loaded)
  }, [])

  // Listen to cross-tab updates or storage changes
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'splitto_data') {
        reloadFromStorage()
      }
    }
    const handleCustomEvent = () => reloadFromStorage()

    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener('splitto_storage_update', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener('splitto_storage_update', handleCustomEvent)
    }
  }, [reloadFromStorage])

  // Save changes wrapper
  const persist = useCallback((newData: SplittoData): { success: boolean; error?: string } => {
    const res = saveSplittoData(newData)
    if (res.success) {
      setData(newData)
    }
    return res
  }, [])

  // Derived state
  const members = data.members
  const expenses = data.expenses
  const payments = data.payments
  const operatorName = data.operatorName

  const activeMembers = useMemo(() => {
    return members.filter((m) => m.isActive)
  }, [members])

  const isInitialized = useMemo(() => {
    return Boolean(operatorName && members.some((m) => m.isMe))
  }, [operatorName, members])

  const balances = useMemo(() => {
    return calculateMemberBalances(members, expenses, payments)
  }, [members, expenses, payments])

  const myBalance = useMemo(() => {
    return balances.find((b) => b.isMe) || null
  }, [balances])

  const totalExpenses = useMemo(() => {
    return calculateTotalExpenses(expenses)
  }, [expenses])

  const suggestions = useMemo(() => {
    return generateSettlementSuggestions(balances)
  }, [balances])

  const everyoneSettled = useMemo(() => {
    if (members.length === 0) return true
    return balances.every((b) => b.netBalance === 0)
  }, [members, balances])

  // 1. First-use Setup
  const initializeOperator = (name: string, initialFriends?: string[]) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { success: false, error: 'Please enter your name.' }
    }

    const now = new Date().toISOString()
    const meMember: Member = {
      id: `mem-${Date.now()}-me`,
      name: trimmed,
      isMe: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    const newMembers: Member[] = [meMember]
    if (initialFriends && initialFriends.length > 0) {
      initialFriends.forEach((fName, idx) => {
        const cleanF = fName.trim()
        if (cleanF) {
          newMembers.push({
            id: `mem-${Date.now()}-${idx + 1}`,
            name: cleanF,
            isMe: false,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          })
        }
      })
    }

    const newData: SplittoData = {
      ...data,
      operatorName: trimmed,
      members: newMembers,
    }

    return persist(newData)
  }

  // 2. Add Member
  const addMember = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { success: false, error: 'Member name cannot be empty.' }
    }

    // Check duplicate display name (case-insensitive)
    const duplicate = members.find((m) => m.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) {
      return {
        success: false,
        error: `A member named "${trimmed}" already exists. Please provide a distinguishing label (e.g. "${trimmed} K.").`,
      }
    }

    const now = new Date().toISOString()
    const newMember: Member = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      isMe: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    const newData: SplittoData = {
      ...data,
      members: [...data.members, newMember],
    }

    const res = persist(newData)
    return { ...res, memberId: newMember.id }
  }

  // 3. Rename Member
  const renameMember = (id: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) {
      return { success: false, error: 'Member name cannot be empty.' }
    }

    const duplicate = members.find(
      (m) => m.id !== id && m.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) {
      return {
        success: false,
        error: `Another member is already named "${trimmed}". Please use a unique label.`,
      }
    }

    const now = new Date().toISOString()
    const updatedMembers = members.map((m) => {
      if (m.id !== id) return m
      return { ...m, name: trimmed, updatedAt: now }
    })

    const updatedOperatorName = members.find((m) => m.id === id)?.isMe ? trimmed : operatorName

    const newData: SplittoData = {
      ...data,
      operatorName: updatedOperatorName,
      members: updatedMembers,
    }

    return persist(newData)
  }

  // 4. Toggle Member Inactive
  const toggleMemberActive = (id: string) => {
    const member = members.find((m) => m.id === id)
    if (!member) return { success: false, error: 'Member not found.' }
    if (member.isMe) return { success: false, error: 'You cannot inactivate your own profile.' }

    // If currently active and trying to inactivate, balance MUST be zero
    if (member.isActive) {
      const balance = balances.find((b) => b.memberId === id)?.netBalance || 0
      if (balance !== 0) {
        return {
          success: false,
          error: `Cannot inactivate "${member.name}" because their balance is not settled (balance: ${balance > 0 ? '+' : ''}${balance / 100}).`,
        }
      }
    }

    const now = new Date().toISOString()
    const updatedMembers = members.map((m) => {
      if (m.id !== id) return m
      return { ...m, isActive: !m.isActive, updatedAt: now }
    })

    const newData: SplittoData = {
      ...data,
      members: updatedMembers,
    }

    return persist(newData)
  }

  // 5. Delete Member (permanent only if unreferenced)
  const deleteMember = (id: string) => {
    const member = members.find((m) => m.id === id)
    if (!member) return { success: false, error: 'Member not found.' }
    if (member.isMe) return { success: false, error: 'You cannot delete your own profile.' }

    // Check if referenced in any expense or payment
    const referencedInExpense = expenses.some(
      (e) => e.paidById === id || e.shares.some((s) => s.memberId === id)
    )
    const referencedInPayment = payments.some(
      (p) => p.fromMemberId === id || p.toMemberId === id
    )

    if (referencedInExpense || referencedInPayment) {
      return {
        success: false,
        error: `Cannot permanently delete "${member.name}" because financial records reference them. You can mark them inactive instead once their balance is zero.`,
      }
    }

    const newData: SplittoData = {
      ...data,
      members: members.filter((m) => m.id !== id),
    }

    return persist(newData)
  }

  // 6. Create Expense
  const createExpense = (expenseInput: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newExpense: Expense = {
      ...expenseInput,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }

    const newData: SplittoData = {
      ...data,
      expenses: [newExpense, ...data.expenses],
    }

    return persist(newData)
  }

  // 7. Update Expense
  const updateExpense = (id: string, expenseInput: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const updatedExpenses = expenses.map((e) => {
      if (e.id !== id) return e
      return {
        ...expenseInput,
        id,
        createdAt: e.createdAt,
        updatedAt: now,
      }
    })

    const newData: SplittoData = {
      ...data,
      expenses: updatedExpenses,
    }

    return persist(newData)
  }

  // 8. Delete Expense
  const deleteExpense = (id: string) => {
    const newData: SplittoData = {
      ...data,
      expenses: expenses.filter((e) => e.id !== id),
    }
    return persist(newData)
  }

  // 9. Record Payment
  const recordPayment = (paymentInput: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newPayment: Payment = {
      ...paymentInput,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }

    const newData: SplittoData = {
      ...data,
      payments: [newPayment, ...data.payments],
    }

    return persist(newData)
  }

  // 10. Update Payment
  const updatePayment = (id: string, paymentInput: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const updatedPayments = payments.map((p) => {
      if (p.id !== id) return p
      return {
        ...paymentInput,
        id,
        createdAt: p.createdAt,
        updatedAt: now,
      }
    })

    const newData: SplittoData = {
      ...data,
      payments: updatedPayments,
    }

    return persist(newData)
  }

  // 11. Delete Payment
  const deletePayment = (id: string) => {
    const newData: SplittoData = {
      ...data,
      payments: payments.filter((p) => p.id !== id),
    }
    return persist(newData)
  }

  // 12. Update Operator Name
  const updateOperatorName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { success: false, error: 'Name cannot be empty.' }

    const updatedMembers = members.map((m) => {
      if (!m.isMe) return m
      return { ...m, name: trimmed, updatedAt: new Date().toISOString() }
    })

    const newData: SplittoData = {
      ...data,
      operatorName: trimmed,
      members: updatedMembers,
    }

    return persist(newData)
  }

  // 13. Import Backup
  const importBackup = (jsonString: string) => {
    const validation = validateBackupData(jsonString)
    if (!validation.valid || !validation.data) {
      return { success: false, error: validation.error || 'Invalid backup data.' }
    }

    const res = persist(validation.data)
    if (res.success) {
      return { success: true, counts: validation.counts }
    }
    return { success: false, error: res.error }
  }

  // 14. Export Backup
  const exportCurrentBackup = () => {
    exportBackup(data)
  }

  // 15. Reset Data
  const resetAllData = () => {
    resetSplittoStorage()
    setData(getInitialSplittoData())
  }

  return (
    <SplittoContext.Provider
      value={{
        data,
        isInitialized,
        operatorName,
        members,
        activeMembers,
        expenses,
        payments,
        balances,
        suggestions,
        totalExpenses,
        myBalance,
        everyoneSettled,
        initializeOperator,
        addMember,
        renameMember,
        toggleMemberActive,
        deleteMember,
        createExpense,
        updateExpense,
        deleteExpense,
        recordPayment,
        updatePayment,
        deletePayment,
        updateOperatorName,
        importBackup,
        exportCurrentBackup,
        resetAllData,
        reloadFromStorage,
      }}
    >
      {children}
    </SplittoContext.Provider>
  )
}

export function useSplitto() {
  const ctx = useContext(SplittoContext)
  if (!ctx) {
    throw new Error('useSplitto must be used within SplittoProvider')
  }
  return ctx
}
