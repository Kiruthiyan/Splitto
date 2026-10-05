import React, { useState, useMemo } from 'react'
import { useSplitto } from '../../context/SplittoContext'
import { formatLKR } from '../../lib/money'
import { Avatar } from '../common/Avatar'
import { Badge } from '../common/Badge'
import { formatDisplayDate } from '../../lib/format'
import type { Member } from '../../types'
import {
  Users2,
  UserPlus,
  Search,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Power,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface MembersViewProps {
  onSelectMemberDetails: (member: Member) => void
}

export const MembersView: React.FC<MembersViewProps> = ({ onSelectMemberDetails }) => {
  const {
    members,
    balances,
    addMember,
    renameMember,
    toggleMemberActive,
    deleteMember,
  } = useSplitto()

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [renamingMemberId, setRenamingMemberId] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>()
    balances.forEach((b) => map.set(b.memberId, b.netBalance))
    return map
  }, [balances])

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const q = searchQuery.toLowerCase()
    return members.filter((m) => m.name.toLowerCase().includes(q))
  }, [members, searchQuery])

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    const res = addMember(newMemberName)
    if (!res.success) {
      setActionError(res.error || 'Failed to add member.')
    } else {
      setNewMemberName('')
      setIsAddingMember(false)
    }
  }

  const handleRenameSubmit = (memberId: string) => {
    setActionError(null)
    const res = renameMember(memberId, renameInput)
    if (!res.success) {
      setActionError(res.error || 'Failed to rename member.')
    } else {
      setRenamingMemberId(null)
    }
  }

  return (
    <div className="space-y-4 pb-24 animate-modal-in">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Members
            </h1>
            <p className="text-xs text-slate-500">
              {members.length} {members.length === 1 ? 'person' : 'people'} in your expense ledger
            </p>
          </div>

          <button
            onClick={() => {
              setIsAddingMember(true)
              setActionError(null)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-sm transition min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>

        {/* Search Bar */}
        {members.length > 4 && (
          <div className="relative">
            <input
              type="text"
              aria-label="Search members"
              placeholder="Search members by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-xs text-slate-900 transition focus-ring"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Quick Add Form Drawer */}
        {isAddingMember && (
          <form
            onSubmit={handleAddSubmit}
            className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 space-y-2 animate-modal-in"
          >
            <label htmlFor="member-1" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              New Member's Name
            </label>
            <div className="flex gap-2">
              <input id="member-1"
                type="text"
                required
                placeholder="e.g. Niro, Arun, Kavinda"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-sky-500 text-slate-900"
                autoFocus
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition shrink-0 min-h-[36px]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-2.5 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {actionError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{actionError}</span>
          </div>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {filteredMembers.map((member) => {
          const balance = balanceMap.get(member.id) || 0
          const isRenaming = renamingMemberId === member.id

          return (
            <div
              key={member.id}
              className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                !member.isActive ? 'bg-slate-50/70 opacity-75' : 'hover:bg-slate-50/50'
              }`}
            >
              {/* Member Info */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={member.name} isMe={member.isMe} size="md" />

                <div className="min-w-0 flex-1">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        aria-label={`New name for ${member.name}`}
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-900 focus:border-sky-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameSubmit(member.id)}
                        className="p-1 bg-sky-600 text-white rounded hover:bg-sky-700"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingMemberId(null)}
                        className="p-1 text-slate-500 hover:text-slate-600"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {member.name}
                      </span>
                      {member.isMe && <Badge variant="navy" size="sm">You</Badge>}
                      {!member.isActive && <Badge variant="gray" size="sm">Inactive</Badge>}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Added {formatDisplayDate(member.createdAt)}
                  </p>
                </div>
              </div>

              {/* Balance & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span
                    className={`text-xs font-bold ${
                      balance > 0
                        ? 'text-emerald-700'
                        : balance < 0
                        ? 'text-rose-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {formatLKR(balance)}
                  </span>
                  <span className="block text-[11px] font-semibold uppercase text-slate-500">
                    {balance > 0 ? 'Receivable' : balance < 0 ? 'Owes' : 'Settled'}
                  </span>
                </div>

                {/* Member action icons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectMemberDetails(member)}
                    className="p-2 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="View financial breakdown"
                    aria-label={`View financial breakdown for ${member.name}`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setRenamingMemberId(member.id)
                      setRenameInput(member.name)
                      setActionError(null)
                    }}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Rename member"
                    aria-label={`Rename ${member.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
