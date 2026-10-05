import React, { useState } from 'react'
import { useSplitto } from '../../context/SplittoContext'
import { User, Users, Plus, ArrowRight, Sparkles, AlertCircle, Check } from 'lucide-react'

export const FirstUseOnboarding: React.FC = () => {
  const { initializeOperator } = useSplitto()

  const [step, setStep] = useState<1 | 2>(1)
  const [myName, setMyName] = useState('')
  const [friendNameInput, setFriendNameInput] = useState('')
  const [friendsList, setFriendsList] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const trimmed = myName.trim()
    if (!trimmed) {
      setErrorMsg('Please enter your name.')
      return
    }
    setStep(2)
  }

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const trimmed = friendNameInput.trim()
    if (!trimmed) return

    // Check duplicate
    if (trimmed.toLowerCase() === myName.trim().toLowerCase()) {
      setErrorMsg(`"${trimmed}" is your name. Please use a friend's name or add a distinguishing label.`)
      return
    }
    if (friendsList.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`"${trimmed}" has already been added.`)
      return
    }

    setFriendsList([...friendsList, trimmed])
    setFriendNameInput('')
  }

  const handleRemoveFriend = (index: number) => {
    setFriendsList(friendsList.filter((_, i) => i !== index))
  }

  const handleCompleteSetup = () => {
    const res = initializeOperator(myName.trim(), friendsList)
    if (!res.success) {
      setErrorMsg(res.error || 'Setup failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-sky-100 p-6 sm:p-8 animate-modal-in">
        {/* Full Logo Header */}
        <div className="flex justify-center mb-6">
          <img
            src="/splitto-logo.png"
            alt="Splitto"
            className="h-10 sm:h-12 w-auto object-contain"
            width="180"
            height="48"
          />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              step === 1 ? 'bg-sky-600 text-white shadow-xs' : 'bg-sky-100 text-sky-800'
            }`}
          >
            1
          </div>
          <div className="h-0.5 flex-1 bg-sky-100" />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              step === 2 ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
            }`}
          >
            2
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Ask Operator Name */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200/80 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Personal Shared Expense Tracker
              </div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                What should we call you?
              </h1>
              <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                This is a personal, offline-first expense tracker. Your records stay saved in this browser.
              </p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Your Display Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kirusigan, Alex, Priya"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 transition focus-ring font-medium"
                    autoFocus
                  />
                  <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-xl text-sm shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Add Initial Friends */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200/80 mb-3">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                Add Your Friends
              </div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                Who do you split expenses with?
              </h1>
              <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                Add friends by name. You can also add or remove people at any time later.
              </p>
            </div>

            {/* Friend input */}
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                type="text"
                placeholder="Friend's name (e.g. Niro, Arun)"
                value={friendNameInput}
                onChange={(e) => setFriendNameInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base text-slate-900 transition focus-ring"
                autoFocus
              />
              <button
                type="submit"
                disabled={!friendNameInput.trim()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0 min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {/* Friends Added List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between p-2.5 bg-sky-50/70 rounded-xl border border-sky-200 text-xs">
                <span className="font-bold text-sky-950 flex items-center gap-2">
                  <Check className="w-4 h-4 text-sky-600" />
                  {myName} (You)
                </span>
                <span className="text-[10px] font-bold text-sky-700 uppercase bg-white px-2 py-0.5 rounded border border-sky-200">Operator</span>
              </div>

              {friendsList.map((friend, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                >
                  <span className="font-semibold text-slate-800">{friend}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(idx)}
                    className="text-slate-400 hover:text-rose-600 text-xs font-bold px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {friendsList.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  Add at least one friend to start splitting shared expenses.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCompleteSetup}
                disabled={friendsList.length === 0}
                className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Get Started with Splitto</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Back to change name
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

