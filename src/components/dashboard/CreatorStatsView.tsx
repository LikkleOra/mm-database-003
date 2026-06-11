import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  BarChart3, Search, Calendar, Filter, ChevronDown, 
  Download, Facebook, Instagram, Music2, Hash, Youtube,
  TrendingUp, Users, DollarSign, Target, MousePointer2, FileText, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function ShoppingBagIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

type Period = 'bonus_collection' | 'mid_month';

interface CreatorStatsViewProps {
  campaign: 'Afina' | 'Sigma';
  onViewChange: (view: string) => void;
}

export function CreatorStatsView({ campaign, onViewChange }: CreatorStatsViewProps) {
  const [period, setPeriod] = useState<Period>('bonus_collection');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(''); // Default to all or current month
  
  const stats = useQuery(api.creator_stats.list, { campaign, period, month, search: search || undefined });
  const summary = useQuery(api.creator_stats.getSummary, { campaign, period, month, search: search || undefined });

  const handleExport = () => {
    if (!stats || stats.length === 0) return;
    
    const headers = [
      'Creator', 'Month', 'Retainer', 'Direct Orders', 'Indirect Orders', 
      'Total Orders', 'Clicks', 'Posts', 'FB Views', 'IG Views', 
      'TT Views', 'TH Views', 'YT Views', 'Total Views', 'Total US Views'
    ];
    
    const rows = stats.map(s => [
      s.discordHandle, s.month, s.retainer, s.directOrders, s.indirectOrders,
      s.totalOrders, s.affiliateClicks, s.totalPosts, 
      s.facebook.views, s.instagram.views, s.tiktok.views, 
      s.threads.views, s.youtube.views, s.totalViews, s.totalUsViews
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `creator_stats_${period}_${campaign}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const metrics = [
    { label: 'Total Direct Orders', value: summary?.totalDirectOrders ?? 0, icon: Target, color: 'text-emerald-500' },
    { label: 'Total Indirect Orders', value: summary?.totalIndirectOrders ?? 0, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Total Orders', value: summary?.totalOrders ?? 0, icon: ShoppingBagIcon, color: 'text-amber-500' },
    { label: 'Total Creators', value: summary?.totalCreators ?? 0, icon: Users, color: 'text-purple-500' },
    { label: 'Total Retainer USD', value: `$${(summary?.totalRetainerUSD ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Total Views', value: (summary?.totalViews ?? 0).toLocaleString(), icon: BarChart3, color: 'text-zinc-400' },
    { label: 'Total US Views', value: (summary?.totalUsViews ?? 0).toLocaleString(), icon: BarChart3, color: 'text-zinc-100' },
    { label: 'Affiliate Clicks', value: (summary?.totalAffiliateClicks ?? 0).toLocaleString(), icon: MousePointer2, color: 'text-cyan-500' },
    { label: 'Total Posts', value: summary?.totalPosts ?? 0, icon: FileText, color: 'text-orange-500' },
  ];

  const platformViews = [
    { label: 'Facebook', views: summary?.facebookViews ?? 0, usViews: summary?.facebookUsViews ?? 0, icon: Facebook, color: 'bg-blue-600' },
    { label: 'Instagram', views: summary?.instagramViews ?? 0, usViews: summary?.instagramUsViews ?? 0, icon: Instagram, color: 'bg-pink-600' },
    { label: 'TikTok', views: summary?.tiktokViews ?? 0, usViews: summary?.tiktokUsViews ?? 0, icon: Music2, color: 'bg-zinc-800' },
    { label: 'Threads', views: summary?.threadsViews ?? 0, usViews: summary?.threadsUsViews ?? 0, icon: Hash, color: 'bg-zinc-100 text-black' },
    { label: 'YouTube', views: summary?.youtubeViews ?? 0, usViews: summary?.youtubeUsViews ?? 0, icon: Youtube, color: 'bg-red-600' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Tab Switcher & Filters */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
            <button
              onClick={() => setPeriod('bonus_collection')}
              className={`px-6 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                period === 'bonus_collection'
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-zinc-500 hover:text-zinc-100'
              }`}
            >
              Bonus Collection Stats
            </button>
            <button
              onClick={() => setPeriod('mid_month')}
              className={`px-6 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                period === 'mid_month'
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-zinc-500 hover:text-zinc-100'
              }`}
            >
              Mid Month Stats (1-15)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onViewChange('import')}
              className="flex items-center gap-2 h-10 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 h-10 px-4 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded-xl hover:bg-zinc-800 transition-all uppercase tracking-widest"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search creator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

      {/* Platform Views */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {platformViews.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center`}>
                <p.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-[10px] font-bold text-zinc-100 uppercase tracking-widest">{p.label}</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Views</p>
                <p className="text-lg font-bold text-zinc-100">{p.views.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">US Views</p>
                <p className="text-lg font-bold text-zinc-100">{p.usViews.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Creator Performance Breakdown
          </h3>
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 rounded-lg uppercase tracking-widest">
            {stats?.length ?? 0} Creators
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/30">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Retainer</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Direct</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Indirect</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Orders</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clicks</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posts</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TikTok</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instagram</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Facebook</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">YouTube</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Views</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total US</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {stats?.map((s) => (
                <tr key={s._id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-zinc-100">
                    <div className="flex flex-col">
                      <span>@{s.discordHandle}</span>
                      <span className="text-[10px] text-zinc-600 font-medium">{s.month}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">${s.retainer}</td>
                  <td className="px-6 py-4 text-zinc-400 font-medium">{s.directOrders}</td>
                  <td className="px-6 py-4 text-zinc-400 font-medium">{s.indirectOrders}</td>
                  <td className="px-6 py-4 text-zinc-100 font-bold">{s.totalOrders}</td>
                  <td className="px-6 py-4 text-zinc-400 font-medium">{s.affiliateClicks.toLocaleString()}</td>
                  <td className="px-6 py-4 text-zinc-400 font-medium">{s.totalPosts}</td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex flex-col">
                      <span className="font-bold">{s.tiktok.views.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-600">US: {s.tiktok.usViews.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex flex-col">
                      <span className="font-bold">{s.instagram.views.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-600">US: {s.instagram.usViews.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex flex-col">
                      <span className="font-bold">{s.facebook.views.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-600">US: {s.facebook.usViews.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex flex-col">
                      <span className="font-bold">{s.youtube.views.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-600">US: {s.youtube.usViews.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-100 font-bold">{s.totalViews.toLocaleString()}</td>
                  <td className="px-6 py-4 text-zinc-100 font-bold">{s.totalUsViews.toLocaleString()}</td>
                </tr>
              ))}
              {(!stats || stats.length === 0) && (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-zinc-500 font-medium italic">
                    No stats found for the selected month and period.
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

function ShoppingBagIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
