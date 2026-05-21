/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DollarSign, Users, TrendingUp, Video } from 'lucide-react';
import { Creator } from '../../types';

interface StatCardsProps {
  creators: Creator[];
  loading?: boolean;
}

export function StatCards({ creators, loading }: StatCardsProps) {
  const totalGmvMtd = creators.reduce((sum, c) => sum + c.metrics.mtd.gmv, 0);
  const totalGmv7d = creators.reduce((sum, c) => sum + c.metrics.sevenDay.gmv, 0);
  const activeCount = creators.filter((c) => c.isActive).length;
  const totalOrders7d = creators.reduce((sum, c) => sum + c.metrics.sevenDay.orders, 0);
  const totalOrdersMtd = creators.reduce((sum, c) => sum + c.metrics.mtd.orders, 0);
  const totalPostsMtd = creators.reduce((sum, c) => sum + c.metrics.mtd.posts, 0);
  const totalPosts7d = creators.reduce((sum, c) => sum + c.metrics.sevenDay.posts, 0);

  const stats = [
    {
      label: 'Total GMV MTD',
      value: `$${totalGmvMtd.toLocaleString()}`,
      sub: `7D: $${totalGmv7d.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      label: 'Active Creators',
      value: `${activeCount}`,
      sub: `${creators.length - activeCount} inactive`,
      icon: Users,
      color: 'text-blue-400',
    },
    {
      label: 'Total Orders 7D',
      value: totalOrders7d.toLocaleString(),
      sub: `MTD: ${totalOrdersMtd.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-purple-400',
    },
    {
      label: 'Post Volume MTD',
      value: totalPostsMtd.toLocaleString(),
      sub: `7D: ${totalPosts7d}`,
      icon: Video,
      color: 'text-orange-400',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div key={idx} className="backdrop-blur-md border border-zinc-800 bg-zinc-900/40 p-5 rounded-2xl transition-all hover:bg-zinc-900/60">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">{stat.value}</h3>
            </div>
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
          <p className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}
