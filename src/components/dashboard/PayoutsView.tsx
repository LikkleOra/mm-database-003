import { useState, FormEvent } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator } from '../../types';
import {
  DollarSign, Clock, CheckCircle, XCircle, Banknote,
  Plus, X, AlertCircle, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TIER_COLORS: Record<string, string> = {
  Platinum: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Gold: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Silver: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20',
  Bronze: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', icon: Clock },
  approved: { color: 'bg-blue-500/10 border-blue-500/20 text-blue-400', icon: CheckCircle },
  paid: { color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', icon: Banknote },
  denied: { color: 'bg-red-500/10 border-red-500/20 text-red-400', icon: XCircle },
} as const;

type StatusFilter = 'pending' | 'approved' | 'paid' | 'denied' | undefined;

interface Props {
  userRole: 'admin' | 'manager' | 'viewer';
  creators: Creator[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function PayoutsView({ userRole, creators }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const payoutsData = useQuery(api.payouts.list, { status: statusFilter });
  const summaryData = useQuery(api.payouts.summary);
  const createPayout = useMutation(api.payouts.create);
  const updateStatus = useMutation(api.payouts.updateStatus);

  const isLoading = payoutsData === undefined;
  const payouts = payoutsData ?? [];
  const summary = summaryData ?? { pending: 0, approved: 0, paid: 0, denied: 0, totalPending: 0, totalPaid: 0 };

  const canWrite = userRole === 'admin' || userRole === 'manager';
  const canApprove = userRole === 'admin';

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Status update
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isCreating) return;
    const fd = new FormData(e.currentTarget);
    const creatorId = fd.get('creatorId') as string;
    const amountRaw = parseFloat(fd.get('amount') as string);
    const period = (fd.get('period') as string).trim() || currentPeriod();
    const notes = (fd.get('notes') as string).trim() || undefined;

    if (!creatorId || isNaN(amountRaw) || amountRaw <= 0) {
      setCreateError('Creator and a valid amount are required.');
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    try {
      await createPayout({ creatorId: creatorId as Id<'creators'>, amount: amountRaw, period, notes });
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create payout.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusUpdate(payoutId: string, status: 'approved' | 'paid' | 'denied') {
    if (updatingId) return;
    setUpdatingId(payoutId);
    setUpdateError(null);
    setShowStatusMenu(null);
    try {
      await updateStatus({ payoutId: payoutId as Id<'payouts'>, status });
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setUpdatingId(null);
    }
  }

  const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: undefined, label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'paid', label: 'Paid' },
    { id: 'denied', label: 'Denied' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Payouts</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Creator payout tracking</p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => { setCreateError(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 h-9 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" />
            New Payout
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending Amount', value: `$${summary.totalPending.toLocaleString()}`, icon: Clock, color: 'text-yellow-400', bg: 'border-yellow-500/20' },
          { label: 'Total Paid Out', value: `$${summary.totalPaid.toLocaleString()}`, icon: Banknote, color: 'text-emerald-400', bg: 'border-emerald-500/20' },
          { label: 'Awaiting Approval', value: summary.pending + summary.approved, icon: CheckCircle, color: 'text-blue-400', bg: 'border-blue-500/20' },
          { label: 'Paid This Cycle', value: summary.paid, icon: DollarSign, color: 'text-emerald-400', bg: 'border-zinc-800' },
        ].map((s) => (
          <div key={s.label} className={`bg-zinc-900/40 border ${s.bg} rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {updateError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs font-bold text-red-400">{updateError}</p>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={String(tab.id)}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              statusFilter === tab.id
                ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'text-zinc-500 hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && payouts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-center">
          <DollarSign className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm font-bold text-zinc-500">No payouts yet</p>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            {canWrite ? 'Use "New Payout" to create the first entry.' : 'Payouts will appear here once created.'}
          </p>
        </div>
      )}

      {/* Payouts table */}
      {!isLoading && payouts.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-zinc-800/50">
            {payouts.map((payout, idx) => {
              const statusCfg = STATUS_CONFIG[payout.status];
              const StatusIcon = statusCfg.icon;
              return (
                <motion.div
                  key={payout.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx, 20) * 0.03 }}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-800/20 transition-colors"
                >
                  {/* Creator info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-zinc-100">{payout.creatorName}</p>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${TIER_COLORS[payout.creatorTier] ?? TIER_COLORS.Bronze}`}>
                        {payout.creatorTier}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 font-medium">Period: <span className="text-zinc-400">{payout.period}</span></span>
                      {payout.notes && <span className="text-[10px] text-zinc-600 italic truncate max-w-xs">{payout.notes}</span>}
                    </div>
                    <p className="text-[9px] text-zinc-600 font-medium mt-0.5">{timeAgo(payout.createdAt)}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold font-mono text-emerald-400">${payout.amount.toLocaleString()}</p>
                    {payout.processedAt && (
                      <p className="text-[9px] text-zinc-600 font-medium">paid {timeAgo(payout.processedAt)}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest shrink-0 ${statusCfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {payout.status}
                  </div>

                  {/* Actions */}
                  {canApprove && payout.status !== 'paid' && payout.status !== 'denied' && (
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setShowStatusMenu(showStatusMenu === payout.id ? null : payout.id)}
                        disabled={updatingId === payout.id}
                        className="flex items-center gap-1 h-8 px-3 bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-bold rounded-lg hover:text-zinc-100 hover:border-zinc-600 transition-all disabled:opacity-40"
                      >
                        Update <ChevronDown className="w-3 h-3" />
                      </button>
                      {showStatusMenu === payout.id && (
                        <div className="absolute right-0 top-10 w-36 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-10 overflow-hidden">
                          {payout.status === 'pending' && (
                            <button onClick={() => handleStatusUpdate(payout.id, 'approved')}
                              className="w-full px-4 py-2.5 text-[10px] font-bold text-left uppercase tracking-widest text-blue-400 hover:bg-zinc-800 transition-colors">
                              Approve
                            </button>
                          )}
                          {(payout.status === 'pending' || payout.status === 'approved') && (
                            <button onClick={() => handleStatusUpdate(payout.id, 'paid')}
                              className="w-full px-4 py-2.5 text-[10px] font-bold text-left uppercase tracking-widest text-emerald-400 hover:bg-zinc-800 transition-colors">
                              Mark Paid
                            </button>
                          )}
                          <button onClick={() => handleStatusUpdate(payout.id, 'denied')}
                            className="w-full px-4 py-2.5 text-[10px] font-bold text-left uppercase tracking-widest text-red-400 hover:bg-zinc-800 transition-colors">
                            Deny
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Payout Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <form onSubmit={handleCreate} noValidate>
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <DollarSign className="w-5 h-5 text-black" />
                    </div>
                    New Payout
                  </h3>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-zinc-500" />
                  </button>
                </div>
                <div className="p-8 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Creator</label>
                    <select name="creatorId" defaultValue="" className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer">
                      <option value="" disabled>Select a creator…</option>
                      {creators.filter((c) => c.isActive).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Amount ($)</label>
                      <input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00"
                        className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Period</label>
                      <input name="period" type="text" defaultValue={currentPeriod()}
                        className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Notes (optional)</label>
                    <textarea name="notes" rows={2} placeholder="Reason for payout, campaign, etc."
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none placeholder:text-zinc-700" />
                  </div>
                  {createError && (
                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-400 font-bold">{createError}</p>
                    </div>
                  )}
                </div>
                <div className="p-8 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 h-12 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">Cancel</button>
                  <button type="submit" disabled={isCreating} className="px-8 h-12 bg-emerald-500 text-black text-[10px] font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest disabled:opacity-50">
                    {isCreating ? 'Creating…' : 'Create Payout'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
