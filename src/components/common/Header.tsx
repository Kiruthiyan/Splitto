import React from 'react'
import { Settings, Download } from 'lucide-react'

interface HeaderProps {
  onOpenSettings: () => void
  installPrompt?: any
  onInstall?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  installPrompt,
  onInstall,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-2xs safe-top">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand: Full Wordmark Logo (Responsive, compact, no repeated "Splitto" text) */}
        <div className="flex items-center gap-2">
          <img
            src="/splitto-logo-header.png"
            alt="Splitto"
            className="h-7 sm:h-8 w-auto object-contain"
            width="120"
            height="32"
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/70">
            Personal
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {installPrompt && (
            <button
              onClick={onInstall}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition focus-ring"
              title="Install app on device"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-sky-50 rounded-xl transition focus-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Settings and backups"
            title="Settings and backups"
          >
            <Settings className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  )
}

