import React, { useState, useEffect } from 'react'
import { SplittoProvider, useSplitto } from './context/SplittoContext'
import { Header } from './components/common/Header'
import { BottomNav, type TabType } from './components/common/BottomNav'
import { FirstUseOnboarding } from './components/views/FirstUseOnboarding'
import { HomeView } from './components/views/HomeView'
import { HistoryView } from './components/views/HistoryView'
import { MembersView } from './components/views/MembersView'
import { SettingsModal } from './components/views/SettingsModal'
import { ExpenseModal } from './components/modals/ExpenseModal'
import { PaymentModal } from './components/modals/PaymentModal'
import { MemberDetailModal } from './components/modals/MemberDetailModal'
import { TransactionDetailModal } from './components/modals/TransactionDetailModal'
import type { Expense, Payment, Member } from './types'

function SplittoApp() {
  const { isInitialized } = useSplitto()

  const [currentTab, setCurrentTab] = useState<TabType>('home')

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null)
  const [paymentPrefill, setPaymentPrefill] = useState<{
    fromId?: string
    toId?: string
    amountInCents?: number
  }>({})

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<{
    type: 'expense' | 'payment'
    data: Expense | Payment
  } | null>(null)

  // PWA install prompt handler
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('Service worker registration failed:', err)
        })
      })
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  // If first-time user (no profile yet), show First-Use Onboarding
  if (!isInitialized) {
    return <FirstUseOnboarding />
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-900 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-900">
      {/* Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        installPrompt={deferredPrompt}
        onInstall={handleInstallClick}
      />

      {/* Main Workspace (Mobile centered container) */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 sm:px-6 pt-4 pb-20">
        {currentTab === 'home' && (
          <HomeView
            onOpenAddExpense={() => {
              setExpenseToEdit(null)
              setIsExpenseModalOpen(true)
            }}
            onOpenRecordPayment={(fromId, toId, amountInCents) => {
              setPaymentToEdit(null)
              setPaymentPrefill({ fromId, toId, amountInCents })
              setIsPaymentModalOpen(true)
            }}
            onNavigateToMembers={() => setCurrentTab('members')}
            onSelectTransaction={(item) => setSelectedTransaction(item)}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            onSelectTransaction={(item) => setSelectedTransaction(item)}
          />
        )}

        {currentTab === 'members' && (
          <MembersView
            onSelectMemberDetails={(member) => setSelectedMember(member)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation with Floating Add Expense */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenAddExpense={() => {
          setExpenseToEdit(null)
          setIsExpenseModalOpen(true)
        }}
      />

      {/* Expense Modal (Add / Edit) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false)
          setExpenseToEdit(null)
        }}
        expenseToEdit={expenseToEdit}
      />

      {/* Payment Modal (Record / Edit) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setPaymentToEdit(null)
          setPaymentPrefill({})
        }}
        paymentToEdit={paymentToEdit}
        initialFromId={paymentPrefill.fromId}
        initialToId={paymentPrefill.toId}
        initialAmountInCents={paymentPrefill.amountInCents}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        item={selectedTransaction}
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        onEditExpense={(exp) => {
          setSelectedTransaction(null)
          setExpenseToEdit(exp)
          setIsExpenseModalOpen(true)
        }}
        onEditPayment={(pay) => {
          setSelectedTransaction(null)
          setPaymentToEdit(pay)
          setIsPaymentModalOpen(true)
        }}
      />

      {/* Member Details Modal */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <SplittoProvider>
      <SplittoApp />
    </SplittoProvider>
  )
}
