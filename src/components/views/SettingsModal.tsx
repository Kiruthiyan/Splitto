import React, { useState, useRef } from 'react'
import { useSplitto } from '../../context/SplittoContext'
import { validateBackupData } from '../../lib/storage'
import {
  X,
  User,
  Download,
  Upload,
  RotateCcw,
  ShieldAlert,
  HardDrive,
  Check,
  AlertCircle,
  FileCheck,
  Info,
} from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    operatorName,
    updateOperatorName,
    exportCurrentBackup,
    importBackup,
    resetAllData,
    members,
    expenses,
    payments,
  } = useSplitto()

  const [nameInput, setNameInput] = useState(operatorName || '')
  const [nameSuccess, setNameSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Import pending review state
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null)
  const [pendingCounts, setPendingCounts] = useState<{
    members: number
    expenses: number
    payments: number
  } | null>(null)

  // Reset confirmation state
  const [confirmReset, setConfirmReset] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!isOpen) return null

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const res = updateOperatorName(nameInput)
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update name.')
    } else {
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 2500)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const validation = validateBackupData(content)
      if (!validation.valid || !validation.counts) {
        setErrorMsg(validation.error || 'Invalid backup file.')
        return
      }

      setPendingImportJson(content)
      setPendingCounts(validation.counts)
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = () => {
    if (!pendingImportJson) return
    const res = importBackup(pendingImportJson)
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to import backup.')
    } else {
      setPendingImportJson(null)
      setPendingCounts(null)
      setSuccessMsg('Backup restored successfully! All records have been updated.')
    }
  }

  const handleCancelImport = () => {
    setPendingImportJson(null)
    setPendingCounts(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirmReset = () => {
    resetAllData()
    setConfirmReset(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-modal-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Settings & Storage</h2>
            <p className="text-[11px] text-slate-400">Manage your profile and local records</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* 1. Storage Explanation Callout */}
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-950 uppercase tracking-wider text-[10px]">
              <HardDrive className="w-3.5 h-3.5 text-sky-600" />
              <span>Browser & Origin Storage Information</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed">
              Your records stay 100% saved locally in your browser for this specific website address (origin). Data on <code>localhost</code> will not automatically appear on your deployed Vercel domain. To transfer records, export a backup here and import it at your new address. Future deployments on the same origin preserve your records.
            </p>
          </div>

          {/* 2. Edit Operator Name */}
          <form onSubmit={handleUpdateName} className="space-y-2">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Your Display Name ("Me")
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 text-sm text-slate-900 transition focus-ring font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={nameInput.trim() === operatorName}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl transition min-h-[44px]"
              >
                Update
              </button>
            </div>
            {nameSuccess && (
              <p className="text-sky-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Name updated successfully!
              </p>
            )}
          </form>

          {/* 3. Export / Import Backup Section */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Data Backup & Restore
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Export Button */}
              <button
                type="button"
                onClick={exportCurrentBackup}
                className="p-3.5 rounded-2xl border border-sky-100 bg-white hover:bg-sky-50/50 transition flex items-center gap-3 text-left shadow-2xs min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Export JSON Backup</span>
                  <span className="text-[10px] text-slate-400">Save records to a file</span>
                </div>
              </button>

              {/* Import Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 rounded-2xl border border-sky-100 bg-white hover:bg-sky-50/50 transition flex items-center gap-3 text-left shadow-2xs min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Import JSON Backup</span>
                  <span className="text-[10px] text-slate-400">Restore from a file</span>
                </div>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* 4. Import Confirmation Preview Dialog */}
          {pendingCounts && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3 animate-modal-in">
              <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Backup Verified & Ready to Restore</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-blue-100 space-y-1 text-slate-700 text-[11px]">
                <p>• <strong>{pendingCounts.members}</strong> members</p>
                <p>• <strong>{pendingCounts.expenses}</strong> expenses</p>
                <p>• <strong>{pendingCounts.payments}</strong> settlement payments</p>
              </div>

              <div className="text-blue-900 text-[11px] leading-relaxed">
                <strong>Warning:</strong> Restoring this backup will replace your current records ({members.length} members, {expenses.length} expenses, {payments.length} payments). We recommend exporting a backup of your current records first.
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={exportCurrentBackup}
                  className="px-3 py-1.5 bg-white border border-blue-300 text-blue-800 rounded-lg text-xs font-bold hover:bg-blue-50"
                >
                  Export Current First
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                >
                  Yes, Replace & Restore
                </button>
                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 5. Reset All Data */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Danger Zone
            </h3>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Records & Start Fresh</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-start gap-2 text-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Are you sure you want to delete all records?</p>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                      This will erase all members, expenses, and payments from this device's browser storage. This cannot be undone unless you exported a backup.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-white rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                  >
                    Yes, Erase Everything
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
