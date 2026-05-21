/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Creator, Tier } from '../../types';
import {
  Search,
  Filter,
  Instagram,
  Youtube,
  Twitter,
  Video,
  MoreHorizontal,
  ArrowUpRight,
  X,
} from 'lucide-react';

interface CreatorTableProps {
  creators: Creator[];
  onSelectCreator: (creator: Creator) => void;
  onExport?: () => void;
}

const PAGE_SIZE = 20;
const TIERS: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export function CreatorTable({ creators, onSelectCreator, onExport }: CreatorTableProps) {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<Tier | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return creators.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.discordHandle.toLowerCase().includes(q);
      const matchesTier = tierFilter === 'All' || c.tier === tierFilter;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' ? c.isActive : !c.isActive);
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [creators, search, tierFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const activeFilters = (tierFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0);

  function clearFilters() {
    setTierFilter('All');
    setStatusFilter('All');
    setPage(0);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  function handleTierFilter(tier: Tier | 'All') {
    setTierFilter(tier);
    setPage(0);
  }

  function handleStatusFilter(status: 'All' | 'Active' | 'Inactive') {
    setStatusFilter(status);
    setPage(0);
  }

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-800 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search name or Discord handle..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-600"
            />
            {search && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative flex items-center gap-2 h-10 px-4 text-sm font-medium border rounded-lg transition-colors ${
                showFilters || activeFilters > 0
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
            <button
              onClick={onExport}
              className="h-10 px-6 text-sm font-bold bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 pt-1 pb-1">
            {/* Tier */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tier</span>
              <div className="flex items-center gap-1">
                {(['All', ...TIERS] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTierFilter(t as Tier | 'All')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      tierFilter === t
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-1">
                {(['All', 'Active', 'Inactive'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      statusFilter === s
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <th className="px-5 py-3 min-w-[200px]">Name</th>
              <th className="px-5 py-3">Discord</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3">Accounts</th>
              <th className="px-5 py-3">Active</th>
              <th className="px-5 py-3 text-right">1%</th>
              <th className="px-5 py-3 text-right">GMV MTD</th>
              <th className="px-5 py-3 text-right">GMV 7D</th>
              <th className="px-5 py-3 text-right">Posts</th>
              <th className="px-5 py-3 text-right">Lives</th>
              <th className="px-5 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-5 py-16 text-center">
                  <p className="text-zinc-500 text-sm font-medium">No creators match your search or filters.</p>
                  {(search || activeFilters > 0) && (
                    <button
                      onClick={() => { handleSearch(''); clearFilters(); }}
                      className="mt-2 text-emerald-500 text-xs font-bold hover:text-emerald-400 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((creator) => (
                <tr
                  key={creator.id}
                  className="hover:bg-zinc-800/40 transition-all cursor-pointer group"
                  onClick={() => onSelectCreator(creator)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 text-xs shadow-inner">
                        {creator.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-100 leading-none">{creator.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                          {creator.tier}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-zinc-400 font-medium">@{creator.discordHandle}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      creator.tier === 'Gold' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                      creator.tier === 'Silver' ? 'bg-zinc-100/10 border-zinc-100/20 text-zinc-300' :
                      creator.tier === 'Platinum' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                      'bg-orange-500/10 border-orange-500/20 text-orange-400'
                    }`}>
                      {creator.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {creator.accounts.map((acc, idx) => (
                        <div key={idx} title={`${acc.platform}: ${acc.handle}`} className="w-6 h-6 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-500 border border-zinc-700 hover:text-zinc-300 transition-colors">
                          {acc.platform === 'TikTok' && <Video className="w-3.5 h-3.5" />}
                          {acc.platform === 'Instagram' && <Instagram className="w-3.5 h-3.5" />}
                          {acc.platform === 'YouTube' && <Youtube className="w-3.5 h-3.5" />}
                          {acc.platform === 'Twitch' && <Twitter className="w-3.5 h-3.5" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${creator.isActive ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-zinc-700 shadow-transparent'}`} />
                      <span className={`text-xs font-bold uppercase tracking-tighter ${creator.isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {creator.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-sm font-mono font-medium text-zinc-400">{creator.commissionRate}%</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div>
                      <p className="text-sm font-mono font-bold text-zinc-100">${creator.metrics.mtd.gmv.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-500 font-bold">MTD</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-sm font-mono font-semibold text-zinc-300">${creator.metrics.sevenDay.gmv.toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-sm font-mono font-medium text-zinc-400">{creator.metrics.mtd.posts}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="text-sm font-mono font-medium text-zinc-400">{creator.metrics.mtd.lives}</p>
                  </td>
                  <td className="px-5 py-4">
                    <button className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="p-5 border-t border-zinc-800 bg-zinc-950/20 flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Showing{' '}
          <span className="font-bold text-zinc-300">
            {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE + PAGE_SIZE, filtered.length)}
          </span>{' '}
          of <span className="font-bold text-zinc-300">{filtered.length}</span> creators
          {filtered.length !== creators.length && (
            <span className="text-zinc-600"> (filtered from {creators.length})</span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-4 py-2 text-[10px] font-bold border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all tracking-widest"
          >
            PREV
          </button>
          <span className="text-[10px] font-bold text-zinc-500 tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="px-4 py-2 text-[10px] font-bold border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all tracking-widest"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
}
