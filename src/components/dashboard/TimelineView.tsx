/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Activity, Creator } from '../../types';
import { History, Search, Clock, ArrowRight, ChevronDown, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

const TYPE_OPTIONS = ['All', 'win', 'loss', 'observation', 'adjustment'] as const;
type TypeFilter = typeof TYPE_OPTIONS[number];

const TYPE_COLORS: Record<string, string> = {
  win: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  loss: 'bg-red-500/10 border-red-500/20 text-red-400',
  adjustment: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  observation: 'bg-zinc-800 border-zinc-700 text-zinc-500',
};

const TYPE_ICONS: Record<string, string> = {
  win: '🏆',
  loss: '⚠️',
  adjustment: '⚙️',
  observation: '📝',
};

const PAGE_SIZE = 20;

interface TimelineViewProps {
  activities: Activity[];
  creators: Creator[];
  users: Array<{ clerkId: string; name: string }>;
  userRole: 'admin' | 'manager' | 'viewer';
  onSelectCreator: (id: string) => void;
}

export function TimelineView({ activities, creators, users, userRole, onSelectCreator }: TimelineViewProps) {
  const removeActivity = useMutation(api.activities.remove);
  const canWrite = userRole === 'admin' || userRole === 'manager';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setIsDeletingId(id);
    try {
      await removeActivity({ id: id as Id<'activities'> });
      setConfirmDeleteId(null);
    } finally {
      setIsDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activities.filter((a) => {
      const creator = creators.find((c) => c.id === a.creatorId);
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        creator?.name.toLowerCase().includes(q);
      const matchesType = typeFilter === 'All' || a.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activities, creators, search, typeFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const activeFilterCount = (search ? 1 : 0) + (typeFilter !== 'All' ? 1 : 0);

  function resolveUserName(clerkId: string) {
    return users.find((u) => u.clerkId === clerkId)?.name ?? 'Team Member';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <History className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">System Operational Timeline</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              {activities.length === 0
                ? 'No activities recorded yet'
                : `${filtered.length} of ${activities.length} entries`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder="Search logs..."
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-48 placeholder:text-zinc-600"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-2 h-9 px-4 border rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                typeFilter !== 'All'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {typeFilter === 'All' ? 'Type' : typeFilter}
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-emerald-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showTypeMenu && (
              <div className="absolute right-0 top-11 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-10 overflow-hidden">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTypeFilter(t); setShowTypeMenu(false); setVisibleCount(PAGE_SIZE); }}
                    className={`w-full px-4 py-2.5 text-xs font-bold text-left uppercase tracking-widest transition-colors ${
                      typeFilter === t ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('All'); setVisibleCount(PAGE_SIZE); }}
              className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="divide-y divide-zinc-800/50">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                <History className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-sm font-bold text-zinc-400">No activities recorded yet</p>
              <p className="text-xs text-zinc-600 mt-1 font-medium">Open a creator profile and log the first entry.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-500">No logs match your filters</p>
              <button
                onClick={() => { setSearch(''); setTypeFilter('All'); }}
                className="mt-2 text-emerald-500 text-xs font-bold hover:text-emerald-400"
              >
                Clear filters
              </button>
            </div>
          ) : (
            visible.map((activity, idx) => {
              const creator = creators.find((c) => c.id === activity.creatorId);
              const loggedByName = resolveUserName(activity.recordedBy);
              return (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx, 10) * 0.04 }}
                  key={activity.id}
                  className="p-5 hover:bg-zinc-800/30 transition-all flex items-start gap-5 group"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg text-base ${
                      TYPE_COLORS[activity.type] ?? 'bg-zinc-800 border-zinc-700 text-zinc-500'
                    }`}>
                      {TYPE_ICONS[activity.type]}
                    </div>
                    <div className="w-px flex-1 bg-zinc-800 mt-2 min-h-[24px]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => onSelectCreator(activity.creatorId)}
                          className="text-xs font-bold text-zinc-300 hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                        >
                          {creator?.name ?? 'Unknown Creator'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <span className="text-zinc-700">•</span>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(activity.recordedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${TYPE_COLORS[activity.type]}`}>
                          {activity.type}
                        </span>
                        {activity.impact && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                            activity.impact === 'high'
                              ? 'bg-zinc-100 text-black border-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                          }`}>
                            {activity.impact} Impact
                          </span>
                        )}
                        {canWrite && (
                          confirmDeleteId === activity.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(activity.id)}
                                disabled={isDeletingId === activity.id}
                                className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-bold rounded uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50"
                              >
                                {isDeletingId === activity.id ? '…' : 'Delete'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:text-zinc-200 uppercase tracking-widest"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(activity.id)}
                              className="p-1 hover:bg-zinc-800 rounded text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl group-hover:border-zinc-700 transition-colors">
                      <h4 className="font-bold text-zinc-100 mb-1">{activity.title}</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">{activity.description}</p>
                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                            {loggedByName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                            Logged by {loggedByName}
                          </span>
                        </div>
                        <button
                          onClick={() => onSelectCreator(activity.creatorId)}
                          className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 transition-colors tracking-widest uppercase opacity-0 group-hover:opacity-100"
                        >
                          View Creator
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {hasMore && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="px-6 py-2 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-100 hover:bg-zinc-900 transition-all"
          >
            Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} More
          </button>
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            Showing {visibleCount} of {filtered.length}
          </span>
        </div>
      )}
    </div>
  );
}
