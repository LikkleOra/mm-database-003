import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Trophy, TrendingUp, DollarSign, Video, Crown } from 'lucide-react';
import { motion } from 'motion/react';

type Period = '7d' | 'mtd';
type Metric = 'gmv' | 'posts' | 'orders';

const TIER_COLORS: Record<string, string> = {
  Platinum: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Gold: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Silver: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20',
  Bronze: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

const RANK_STYLES = [
  { bg: 'bg-yellow-500/20 border-yellow-500/40', text: 'text-yellow-400', label: '1st', crown: true },
  { bg: 'bg-zinc-400/10 border-zinc-400/30', text: 'text-zinc-300', label: '2nd', crown: false },
  { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', label: '3rd', crown: false },
];

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === 'gmv') return `$${value.toLocaleString()}`;
  return value.toLocaleString();
}

function metricLabel(metric: Metric): string {
  if (metric === 'gmv') return 'GMV';
  if (metric === 'posts') return 'Posts';
  return 'Orders';
}

interface Props {
  userRole: 'admin' | 'manager' | 'viewer';
}

export function LeaderboardView({ userRole: _userRole }: Props) {
  const [period, setPeriod] = useState<Period>('7d');
  const [metric, setMetric] = useState<Metric>('gmv');

  const rankingsData = useQuery(api.leaderboard.rankings, { period, metric });
  const isLoading = rankingsData === undefined;
  const rankings = rankingsData ?? [];

  const podium = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Leaderboard</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              {isLoading ? 'Loading…' : `${rankings.length} active creators ranked`}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Period */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            {([['7d', '7 Day'], ['mtd', 'MTD']] as [Period, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setPeriod(id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  period === id ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-100'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {/* Metric */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            {([['gmv', 'GMV'], ['posts', 'Posts'], ['orders', 'Orders']] as [Metric, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setMetric(id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  metric === id ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-100'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && rankings.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-center">
          <Trophy className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm font-bold text-zinc-500">No data yet</p>
          <p className="text-xs text-zinc-600 mt-1 font-medium">Creator metrics will appear once data is populated.</p>
        </div>
      )}

      {!isLoading && rankings.length > 0 && (
        <>
          {/* Podium — top 3 */}
          {podium.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {/* Reorder for podium look: 2nd | 1st | 3rd */}
              {[podium[1], podium[0], podium[2]].map((entry, visualIdx) => {
                if (!entry) return <div key={visualIdx} />;
                const rankIdx = entry.rank - 1;
                const style = RANK_STYLES[rankIdx] ?? RANK_STYLES[2];
                const isWinner = entry.rank === 1;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: visualIdx * 0.1 }}
                    className={`relative border rounded-2xl p-6 text-center ${style.bg} ${isWinner ? 'ring-1 ring-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : ''}`}
                  >
                    {isWinner && (
                      <Crown className="absolute top-4 right-4 w-4 h-4 text-yellow-400" />
                    )}
                    <div className={`text-4xl font-bold font-mono mb-1 ${style.text}`}>{style.label}</div>
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-100 mx-auto mb-3">
                      {entry.name[0].toUpperCase()}
                    </div>
                    <p className="font-bold text-zinc-100 text-sm truncate">{entry.name}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${TIER_COLORS[entry.tier] ?? TIER_COLORS.Bronze}`}>
                      {entry.tier}
                    </span>
                    <div className="mt-4 pt-4 border-t border-zinc-800/50">
                      <p className={`text-2xl font-bold font-mono ${style.text}`}>
                        {formatMetricValue(entry[metric], metric)}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{metricLabel(metric)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <p className="text-xs font-bold text-zinc-300 font-mono">${entry.gmv.toLocaleString()}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">GMV</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-300 font-mono">{entry.posts}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Posts</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-300 font-mono">{entry.orders}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Orders</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Ranked table — 4th and beyond */}
          {rest.length > 0 && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Full Rankings</p>
                <div className="flex items-center gap-1">
                  {metric === 'gmv' && <DollarSign className="w-3 h-3 text-zinc-600" />}
                  {metric === 'posts' && <Video className="w-3 h-3 text-zinc-600" />}
                  {metric === 'orders' && <TrendingUp className="w-3 h-3 text-zinc-600" />}
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{metricLabel(metric)}</p>
                </div>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {rest.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx, 30) * 0.02 }}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="w-8 text-center">
                      <span className="text-sm font-bold text-zinc-500 font-mono">#{entry.rank}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-100 shrink-0">
                      {entry.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-100 truncate">{entry.name}</p>
                      <span className={`inline-block mt-0.5 px-2 py-0 rounded text-[9px] font-bold border uppercase ${TIER_COLORS[entry.tier] ?? TIER_COLORS.Bronze}`}>
                        {entry.tier}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-right shrink-0">
                      <div>
                        <p className="text-sm font-bold text-zinc-200 font-mono">${entry.gmv.toLocaleString()}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">GMV</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-200 font-mono">{entry.posts}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Posts</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-200 font-mono">{entry.orders}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Orders</p>
                      </div>
                    </div>
                    <div className="w-20 text-right shrink-0">
                      <p className={`text-sm font-bold font-mono ${metric === 'gmv' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                        {formatMetricValue(entry[metric], metric)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
