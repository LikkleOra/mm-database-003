import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Search, Activity, TrendingDown, AlertTriangle, CircleSlash, Users, Clock,
} from 'lucide-react';
import { motion } from 'motion/react';

type ActivityStatus = 'active' | 'slowing' | 'inactive' | 'never_posted';
type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
type PostingStatus = 'posting' | 'occasional' | 'not_posting';

interface AccountAnalysisViewProps {
  campaign: 'Afina' | 'Sigma';
}

const ACTIVITY_STATUSES: ActivityStatus[] = ['active', 'slowing', 'inactive', 'never_posted'];

const ACTIVITY_LABELS: Record<ActivityStatus, string> = {
  active: 'Active',
  slowing: 'Slowing',
  inactive: 'Inactive',
  never_posted: 'Never Posted',
};

const ACTIVITY_BADGE_CLASS: Record<ActivityStatus, string> = {
  active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  slowing: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
  inactive: 'bg-red-500/10 border-red-500/20 text-red-400',
  never_posted: 'bg-zinc-800 border-zinc-700 text-zinc-500',
};

const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
  posting: 'Consistent',
  occasional: 'Occasional',
  not_posting: 'Not Posting',
};

const POSTING_STATUS_BADGE_CLASS: Record<PostingStatus | 'unset', string> = {
  posting: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  occasional: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
  not_posting: 'bg-red-500/10 border-red-500/20 text-red-400',
  unset: 'bg-zinc-900/50 border-zinc-800 text-zinc-600',
};

export function AccountAnalysisView({ campaign }: AccountAnalysisViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'All'>('All');

  const rows = useQuery(api.account_analysis.list, { campaign });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesSearch =
        !q || r.name.toLowerCase().includes(q) || r.discordHandle.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || r.activityStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const summary = useMemo(() => {
    if (!rows) return null;
    const counts: Record<ActivityStatus, number> = { active: 0, slowing: 0, inactive: 0, never_posted: 0 };
    let totalDays = 0;
    let daysCount = 0;
    for (const r of rows) {
      counts[r.activityStatus as ActivityStatus]++;
      if (r.daysSinceLastPost !== null) {
        totalDays += r.daysSinceLastPost;
        daysCount++;
      }
    }
    return {
      counts,
      totalCreators: rows.length,
      avgDaysSinceLastPost: daysCount > 0 ? Math.round(totalDays / daysCount) : null,
    };
  }, [rows]);

  const metrics = [
    { label: 'Total Creators', value: summary?.totalCreators ?? 0, icon: Users, color: 'text-zinc-400' },
    { label: 'Active (≤7d)', value: summary?.counts.active ?? 0, icon: Activity, color: 'text-emerald-500' },
    { label: 'Slowing (8-30d)', value: summary?.counts.slowing ?? 0, icon: TrendingDown, color: 'text-yellow-500' },
    { label: 'Inactive (30d+)', value: summary?.counts.inactive ?? 0, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Never Posted', value: summary?.counts.never_posted ?? 0, icon: CircleSlash, color: 'text-zinc-500' },
    {
      label: 'Avg Days Since Last Post',
      value: summary?.avgDaysSinceLastPost ?? '—',
      icon: Clock,
      color: 'text-zinc-100',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search creator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit flex-wrap">
            {(['All', ...ACTIVITY_STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  statusFilter === s
                    ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'text-zinc-500 hover:text-zinc-100'
                }`}
              >
                {s === 'All' ? 'All' : ACTIVITY_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{m.label}</p>
              <p className="text-xl font-bold text-zinc-100 mt-1">{m.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-3">
            <Activity className="w-4 h-4 text-emerald-500" />
            Posting Frequency Breakdown
          </h3>
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 rounded-lg uppercase tracking-widest">
            {filtered.length} Creators
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/30">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tier</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Post</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Days Since</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posts 7d</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posts 30d</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Posts</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Platforms</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-100">{r.name}</span>
                      <span className="text-[10px] text-zinc-600 font-medium">@{r.discordHandle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      r.tier === 'Gold' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                      r.tier === 'Silver' ? 'bg-zinc-100/10 border-zinc-100/20 text-zinc-300' :
                      r.tier === 'Platinum' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                      'bg-orange-500/10 border-orange-500/20 text-orange-400'
                    }`}>
                      {r.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 font-medium">
                    {r.lastPostedAt ? new Date(r.lastPostedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-zinc-100 font-bold">
                    {r.daysSinceLastPost !== null ? `${r.daysSinceLastPost}d` : '—'}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 font-medium">{r.postsLast7d}</td>
                  <td className="px-6 py-4 text-zinc-400 font-medium">{r.postsLast30d}</td>
                  <td className="px-6 py-4 text-zinc-100 font-bold">{r.totalApprovedPosts}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.accounts.length === 0 ? (
                        <span className="text-zinc-700">—</span>
                      ) : (
                        r.accounts.map((acc) => (
                          <span
                            key={acc.id}
                            title={`${acc.platform}: ${acc.handle}`}
                            className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${POSTING_STATUS_BADGE_CLASS[(acc.postingStatus as PostingStatus) ?? 'unset']}`}
                          >
                            {acc.platform}
                            {acc.postingStatus ? ` · ${POSTING_STATUS_LABELS[acc.postingStatus as PostingStatus]}` : ''}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${ACTIVITY_BADGE_CLASS[r.activityStatus as ActivityStatus]}`}>
                      {ACTIVITY_LABELS[r.activityStatus as ActivityStatus]}
                    </span>
                  </td>
                </tr>
              ))}
              {rows && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 font-medium italic">
                    No creators match your search or filters.
                  </td>
                </tr>
              )}
              {!rows && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 font-medium italic">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
