/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Creator } from '../../types';
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ReportsViewProps {
  creators: Creator[];
}

type Period = 'mtd' | '7d';

const TIER_COLORS: Record<string, string> = {
  Platinum: '#A855F7',
  Gold: '#EAB308',
  Silver: '#D4D4D8',
  Bronze: '#FB923C',
};

export function ReportsView({ creators }: ReportsViewProps) {
  const [period, setPeriod] = useState<Period>('mtd');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const getMetrics = (c: Creator) => (period === 'mtd' ? c.metrics.mtd : c.metrics.sevenDay);

  const TIERS = ['Platinum', 'Gold', 'Silver', 'Bronze'] as const;

  const gmvByTier = TIERS.map((tier) => ({
    tier,
    gmv: creators.filter((c) => c.tier === tier).reduce((acc, c) => acc + getMetrics(c).gmv, 0),
    count: creators.filter((c) => c.tier === tier).length,
  }));

  const totalGMV = creators.reduce((acc, c) => acc + getMetrics(c).gmv, 0);
  const totalPosts = creators.reduce((acc, c) => acc + getMetrics(c).posts, 0);
  const activeRate = creators.length > 0 ? (creators.filter((c) => c.isActive).length / creators.length) * 100 : 0;
  const avgCommission = creators.length > 0
    ? creators.reduce((acc, c) => acc + c.commissionRate, 0) / creators.length
    : 0;

  const topCreators = [...creators]
    .sort((a, b) => getMetrics(b).gmv - getMetrics(a).gmv)
    .slice(0, 5);

  const periodLabel = period === 'mtd' ? 'Month to Date' : 'Last 7 Days';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Performance Reports</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              Aggregate metrics — {periodLabel}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowPeriodMenu((v) => !v)}
            className="flex items-center gap-2 h-10 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-100 transition-all"
          >
            {periodLabel}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showPeriodMenu && (
            <div className="absolute right-0 top-12 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-10 overflow-hidden">
              {(['mtd', '7d'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setShowPeriodMenu(false); }}
                  className={`w-full px-4 py-2.5 text-xs font-bold text-left uppercase tracking-widest transition-colors ${
                    period === p ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  {p === 'mtd' ? 'Month to Date' : 'Last 7 Days'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total GMV', value: `$${totalGMV.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
          { label: 'Avg. Comm Rate', value: `${avgCommission.toFixed(1)}%`, icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Total Content', value: totalPosts.toLocaleString(), icon: BarChart3, color: 'text-purple-500' },
          { label: 'Activation Rate', value: `${activeRate.toFixed(1)}%`, icon: Users, color: 'text-yellow-500' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            key={stat.label}
            className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-zinc-950 border border-zinc-800 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                <ArrowUpRight className="w-3 h-3" />
                Live
              </div>
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-zinc-100 font-mono italic tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV by tier bar chart */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">
            GMV Distribution by Tier — {periodLabel}
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gmvByTier} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="tier"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                />
                <Tooltip
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'GMV']}
                />
                <Bar dataKey="gmv" radius={[6, 6, 0, 0]} barSize={40}>
                  {gmvByTier.map((entry) => (
                    <Cell key={entry.tier} fill={TIER_COLORS[entry.tier]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier efficiency leaderboard */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Tier Efficiency Leaderboard</h3>
          <div className="flex-1 space-y-3">
            {[...gmvByTier].sort((a, b) => b.gmv - a.gmv).map((tier, i) => (
              <div
                key={tier.tier}
                className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-200">{tier.tier} Tier</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
                      {tier.count} creator{tier.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-emerald-500">${tier.gmv.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-600 font-bold">
                    AVG: ${(tier.gmv / (tier.count || 1)).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 creators by GMV */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">
          Top Creators by GMV — {periodLabel}
        </h3>
        {topCreators.length === 0 ? (
          <p className="text-sm text-zinc-600 font-medium text-center py-8">No creator data available.</p>
        ) : (
          <div className="space-y-3">
            {topCreators.map((creator, i) => {
              const gmv = getMetrics(creator).gmv;
              const maxGmv = getMetrics(topCreators[0]).gmv || 1;
              const pct = (gmv / maxGmv) * 100;
              return (
                <div key={creator.id} className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-zinc-600 w-4 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-200">{creator.name}</span>
                      <span className="text-xs font-mono font-bold text-emerald-500">${gmv.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: TIER_COLORS[creator.tier] ?? '#10b981' }}
                      />
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${
                    creator.tier === 'Platinum' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                    creator.tier === 'Gold' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                    creator.tier === 'Silver' ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' :
                    'bg-orange-500/10 border-orange-500/20 text-orange-400'
                  }`}>
                    {creator.tier}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
