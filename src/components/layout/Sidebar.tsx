/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Users, History, Video, Target, MessageSquare, Youtube,
  Zap, BarChart3, Settings, LayoutDashboard, LogOut, X,
  Inbox, Trophy, DollarSign, FileUp, Link as LinkIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser, useClerk } from '@clerk/clerk-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
  activeCampaign: 'Afina' | 'Sigma';
  onCampaignChange: (c: 'Afina' | 'Sigma') => void;
}

const NAV_ITEMS = [
  { id: 'timeline', label: 'Timeline', icon: History },
  { id: 'database', label: 'Creator Database', icon: Users },
  { id: 'submit', label: 'Submit Link', icon: LinkIcon },
  { id: 'submissions', label: 'Submissions', icon: Inbox },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'payouts', label: 'Payouts', icon: DollarSign },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'tracker', label: 'Tracker', icon: Target },
  { id: 'discord', label: 'Discord Tracking', icon: MessageSquare },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'gmv', label: 'GMV Max Tests', icon: Zap },
  { id: 'analysis', label: 'Account Analysis', icon: BarChart3 },
  { id: 'simulator', label: 'Simulator', icon: LayoutDashboard },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({ activeView, onViewChange, isOpen, onClose, activeCampaign, onCampaignChange }: SidebarProps) {
  const { user } = useUser();
  const { signOut } = useClerk();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.firstName?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  function handleNav(id: string) {
    onViewChange(id);
    onClose();
  }

  const sidebarContent = (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-md h-full flex flex-col">
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-black font-bold">M</div>
          MM Database
        </h1>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Campaign toggle */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Campaign</p>
        <div className="flex gap-1.5">
          {(['Afina', 'Sigma'] as const).map((c) => (
            <button
              key={c}
              onClick={() => onCampaignChange(c)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeCampaign === c
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeCampaign === c ? 'bg-black' : 'bg-zinc-600'}`} />
              {c}
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === item.id
                ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        ))}

        <div className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">System</div>
        <button
          onClick={() => handleNav('import')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'import'
              ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'
          }`}
        >
          <FileUp className="w-4 h-4 shrink-0" />
          Import Creators
        </button>
        <button
          onClick={() => handleNav('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'settings'
              ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </button>
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
              {initials}
            </div>
          )}
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-zinc-200">{displayName}</p>
            <p className="text-[10px] text-zinc-500 truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible fixed sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <div className="fixed left-0 top-0 h-screen w-64 z-10">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile: slide-in drawer with backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 h-screen w-64 z-50 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
