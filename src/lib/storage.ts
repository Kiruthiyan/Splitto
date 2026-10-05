import type { SplittoData } from '../types'
import { validateExpenseInput, isValidDateString } from './money.ts'

export const STORAGE_KEY = 'splitto_data'
export const CURRENT_SCHEMA_VERSION = 1

export function getInitialSplittoData(): SplittoData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    revision: 1,
    operatorName: null,
    members: [],
    expenses: [],
    payments: [],
  }
}

/**
 * Loads and validates Splitto data from localStorage.
 * Handles storage unavailability, malformed JSON, and schema versioning safely.
 */
export function loadSplittoData(): SplittoData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getInitialSplittoData()
    }

    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return getInitialSplittoData()
    }

    // Ensure arrays exist
    const members = Array.isArray(parsed.members) ? parsed.members : []
    const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : []
    const payments = Array.isArray(parsed.payments) ? parsed.payments : []
    const operatorName = typeof parsed.operatorName === 'string' ? parsed.operatorName : null
    const revision = typeof parsed.revision === 'number' ? parsed.revision : 1

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      revision,
      operatorName,
      members,
      expenses,
      payments,
    }
  } catch (err) {
    console.error('Failed to load from localStorage:', err)
    return getInitialSplittoData()
  }
}

/**
 * Saves Splitto data to localStorage safely.
 * Returns { success: true } or { success: false, error: string }.
 */
export function saveSplittoData(data: SplittoData): { success: boolean; error?: string } {
  try {
    const nextRevision = (data.revision || 0) + 1
    const toSave: SplittoData = {
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      revision: nextRevision,
    }
    const serialized = JSON.stringify(toSave)
    localStorage.setItem(STORAGE_KEY, serialized)

    // Notify other components or tabs
    window.dispatchEvent(new Event('splitto_storage_update'))

    return { success: true }
  } catch (err: any) {
    console.error('Failed to save to localStorage:', err)
    if (err?.name === 'QuotaExceededError') {
      return {
        success: false,
        error: 'Storage quota exceeded. Please export a backup and remove old data.',
      }
    }
    return {
      success: false,
      error: err?.message || 'Storage error while saving records.',
    }
  }
}

export interface BackupValidationResult {
  valid: boolean
  error?: string
  data?: SplittoData
  counts?: {
    members: number
    expenses: number
    payments: number
  }
}

/**
 * Validates an imported JSON string for integrity:
 * - schema structure
 * - member unique IDs
 * - expense shares referencing existing members and summing exactly to total
 * - payment references
 */
export function validateBackupData(jsonString: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(jsonString)
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Backup file is not a valid JSON object.' }
    }

    if (!Array.isArray(parsed.members)) {
      return { valid: false, error: 'Backup missing "members" array.' }
    }

    if (!Array.isArray(parsed.expenses)) {
      return { valid: false, error: 'Backup missing "expenses" array.' }
    }

    if (!Array.isArray(parsed.payments)) {
      return { valid: false, error: 'Backup missing "payments" array.' }
    }

    // Validate members
    const memberIds = new Set<string>()
    let hasMe = false

    for (const m of parsed.members) {
      if (!m.id || typeof m.id !== 'string') {
        return { valid: false, error: 'Member missing a valid ID.' }
      }
      if (memberIds.has(m.id)) {
        return { valid: false, error: `Duplicate member ID found: ${m.id}` }
      }
      memberIds.add(m.id)

      if (!m.name || typeof m.name !== 'string' || !m.name.trim()) {
        return { valid: false, error: 'Member has an empty or invalid name.' }
      }
      if (m.isMe) hasMe = true
    }

    if (!hasMe && parsed.members.length > 0) {
      return { valid: false, error: 'Backup must include the "Me" primary user profile.' }
    }

    // Validate expenses
    for (const e of parsed.expenses) {
      if (!e.id || typeof e.id !== 'string') {
        return { valid: false, error: 'Expense missing a valid ID.' }
      }
      if (!e.description || typeof e.description !== 'string') {
        return { valid: false, error: 'Expense has missing or invalid description.' }
      }
      if (typeof e.amount !== 'number' || e.amount <= 0 || !Number.isInteger(e.amount)) {
        return { valid: false, error: `Expense "${e.description}" has invalid positive integer amount.` }
      }
      if (!memberIds.has(e.paidById)) {
        return { valid: false, error: `Expense "${e.description}" references unknown payer member.` }
      }
      if (!Array.isArray(e.shares) || e.shares.length === 0) {
        return { valid: false, error: `Expense "${e.description}" has no participant shares.` }
      }

      const expErr = validateExpenseInput(e, parsed.members)
      if (expErr) {
        return { valid: false, error: `Expense "${e.description}": ${expErr}` }
      }

      let shareTotal = 0
      const shareParticipants = new Set<string>()

      for (const s of e.shares) {
        if (!memberIds.has(s.memberId)) {
          return { valid: false, error: `Expense "${e.description}" shares reference an unknown member.` }
        }
        if (shareParticipants.has(s.memberId)) {
          return { valid: false, error: `Expense "${e.description}" contains duplicate participant share.` }
        }
        shareParticipants.add(s.memberId)

        if (typeof s.amount !== 'number' || s.amount < 0 || !Number.isInteger(s.amount)) {
          return { valid: false, error: `Expense "${e.description}" contains invalid share amount.` }
        }
        shareTotal += s.amount
      }

      if (shareTotal !== e.amount) {
        return {
          valid: false,
          error: `Expense "${e.description}" shares sum (${shareTotal}) does not match expense amount (${e.amount}).`,
        }
      }
    }

    // Validate payments
    for (const p of parsed.payments) {
      if (!p.id || typeof p.id !== 'string') {
        return { valid: false, error: 'Payment missing a valid ID.' }
      }
      if (typeof p.amount !== 'number' || p.amount <= 0 || !Number.isInteger(p.amount)) {
        return { valid: false, error: 'Payment has an invalid amount.' }
      }
      if (!memberIds.has(p.fromMemberId) || !memberIds.has(p.toMemberId)) {
        return { valid: false, error: 'Payment references an unknown member.' }
      }
      if (p.fromMemberId === p.toMemberId) {
        return { valid: false, error: 'Payment from and to members cannot be identical.' }
      }
      if (!isValidDateString(p.date)) {
        return { valid: false, error: 'Payment has an invalid date.' }
      }
    }

    const validatedData: SplittoData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      revision: (parsed.revision || 0) + 1,
      operatorName: parsed.operatorName || (parsed.members.find((m: any) => m.isMe)?.name ?? null),
      members: parsed.members,
      expenses: parsed.expenses,
      payments: parsed.payments,
    }

    return {
      valid: true,
      data: validatedData,
      counts: {
        members: validatedData.members.length,
        expenses: validatedData.expenses.length,
        payments: validatedData.payments.length,
      },
    }
  } catch (err: any) {
    return { valid: false, error: `Failed to parse backup JSON: ${err.message}` }
  }
}

/**
 * Downloads current Splitto data as a formatted JSON backup file.
 */
export function exportBackup(data: SplittoData): void {
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `splitto-backup-${dateStr}.json`
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Resets all Splitto data to empty state.
 */
export function resetSplittoStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('splitto_storage_update'))
}
