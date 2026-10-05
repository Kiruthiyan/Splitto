import React from 'react'
import { Home, History, Users2, Plus } from 'lucide-react'

export type TabType = 'home' | 'history' | 'members'

interface BottomNavProps {
  currentTab: TabType
  onSelectTab: (tab: TabType) => void
  onOpenAddExpense: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddExpense,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-sky-100 shadow-lg safe-bottom">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around relative">
        {/* Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex-1 flex flex-col items-center justify-center h-full min-h-[44px] transition ${
            currentTab === 'home'
              ? 'text-sky-700 font-bold'
              : 'text-slate-500 hover:text-slate-600'
          }`}
          aria-label="Home"
          aria-current={currentTab === 'home' ? 'page' : undefined}
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-1 font-semibold">Home</span>
        </button>

        {/* Center Prominent Add Expense Action */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onOpenAddExpense}
            className="w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-sky-600/35 transition focus-ring min-w-[44px] min-h-[44px]"
            aria-label="Add Expense"
            title="Add Expense"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* History */}
        <button
          onClick={() => onSelectTab('history')}
          className={`flex-1 flex flex-col items-center justify-center h-full min-h-[44px] transition ${
            currentTab === 'history'
              ? 'text-sky-700 font-bold'
              : 'text-slate-500 hover:text-slate-600'
          }`}
          aria-label="History"
          aria-current={currentTab === 'history' ? 'page' : undefined}
        >
          <History className={`w-5 h-5 ${currentTab === 'history' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-1 font-semibold">History</span>
        </button>

        {/* Members */}
        <button
          onClick={() => onSelectTab('members')}
          className={`flex-1 flex flex-col items-center justify-center h-full min-h-[44px] transition ${
            currentTab === 'members'
              ? 'text-sky-700 font-bold'
              : 'text-slate-500 hover:text-slate-600'
          }`}
          aria-label="Members"
          aria-current={currentTab === 'members' ? 'page' : undefined}
        >
          <Users2 className={`w-5 h-5 ${currentTab === 'members' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-1 font-semibold">Members</span>
        </button>
      </div>
    </div>
  )
}
