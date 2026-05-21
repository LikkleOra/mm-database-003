/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator, Activity, Tier } from '../../types';
import {
  X, Plus, MessageSquare, Clock, ExternalLink, ChevronRight,
  AlertCircle, Calendar, Video, Instagram, Youtube, Pencil, Check, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreatorDetailProps {
  creator: Creator;
  activities: Activity[];
  userRole: 'admin' | 'manager' | 'viewer';
  onClose: () => void;
  onAddActivity: (creatorId: string) => void;
}

const TIERS: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Twitch'] as const;

type MetricsState = {
  mtd: { gmv: number; posts: number; lives: number; orders: number };
  sevenDay: { gmv: number; posts: number; lives: number; orders: number };
};

export function CreatorDetail({ creator, activities, userRole, onClose, onAddActivity }: CreatorDetailProps) {
  const canWrite = userRole === 'admin' || userRole === 'manager';
  const isAdmin = userRole === 'admin';

  const updateCreator = useMutation(api.creators.update);
  const removeCreator = useMutation(api.creators.remove);
  const addAccount = useMutation(api.social_accounts.create);
  const removeActivity = useMutation(api.activities.remove);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTier, setEditTier] = useState<Tier>(creator.tier);
  const [editCommission, setEditCommission] = useState(String(creator.commissionRate));
  const [editActive, setEditActive] = useState(creator.isActive);
  const [editMetrics, setEditMetrics] = useState<MetricsState>(creator.metrics);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Creator delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add account modal state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newPlatform, setNewPlatform] = useState<typeof PLATFORMS[number]>('TikTok');
  const [newHandle, setNewHandle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Activity delete confirm
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState<string | null>(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  function updateMetricField(
    period: 'mtd' | 'sevenDay',
    field: 'gmv' | 'posts' | 'lives' | 'orders',
    value: string
  ) {
    setEditMetrics((prev) => ({
      ...prev,
      [period]: { ...prev[period], [field]: parseFloat(value) || 0 },
    }));
  }

  async function handleSaveEdit() {
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateCreator({
        id: creator.id as Id<'creators'>,
        tier: editTier,
        commissionRate: parseFloat(editCommission) || creator.commissionRate,
        isActive: editActive,
        metrics: editMetrics,
      });
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  function cancelEdit() {
    setEditTier(creator.tier);
    setEditCommission(String(creator.commissionRate));
    setEditActive(creator.isActive);
    setEditMetrics(creator.metrics);
    setEditError(null);
    setIsEditing(false);
  }

  async function handleDeleteCreator() {
    setIsDeleting(true);
    try {
      await removeCreator({ id: creator.id as Id<'creators'> });
      onClose();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to delete creator.');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAddAccount(e: FormEvent) {
    e.preventDefault();
    if (!newHandle.trim()) return;
    setIsSavingAccount(true);
    setAccountError(null);
    try {
      await addAccount({
        creatorId: creator.id as Id<'creators'>,
        platform: newPlatform,
        handle: newHandle.trim(),
        url: newUrl.trim() || '#',
      });
      setShowAddAccount(false);
      setNewHandle('');
      setNewUrl('');
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Failed to add account.');
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleDeleteActivity(id: string) {
    setIsDeletingActivity(true);
    try {
      await removeActivity({ id: id as Id<'activities'> });
      setConfirmDeleteActivityId(null);
    } catch {
      // silent — activity stays visible
    } finally {
      setIsDeletingActivity(false);
    }
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[620px] bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 flex flex-col border-l border-zinc-800"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
          <div className="h-6 w-px bg-zinc-800" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Creator Profile</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !isEditing && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Delete creator?</span>
                <button
                  onClick={handleDeleteCreator}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-zinc-600 hover:text-red-400"
                title="Delete creator"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}
          {canWrite && (
            <button
              onClick={() => isEditing ? cancelEdit() : setIsEditing(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
                isEditing
                  ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <Pencil className="w-3 h-3" />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <section className="p-8 border-b border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-950">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl flex items-center justify-center text-4xl font-serif italic text-zinc-700">
                {creator.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">{creator.name}</h2>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      {TIERS.map((t) => (
                        <button
                          key={t}
                          onClick={() => setEditTier(t)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                            editTier === t ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700 text-zinc-500 hover:text-zinc-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      creator.tier === 'Gold' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                      creator.tier === 'Silver' ? 'bg-zinc-100/10 border-zinc-100/20 text-zinc-300' :
                      creator.tier === 'Platinum' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                      'bg-orange-500/10 border-orange-500/20 text-orange-400'
                    }`}>
                      {creator.tier}
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 font-medium mt-1">
                  @{creator.discordHandle} <span className="mx-2 text-zinc-800">•</span> Joined {new Date(creator.joinedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {isEditing ? (
              <button
                onClick={() => setEditActive((v) => !v)}
                className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${
                  editActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${editActive ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                {editActive ? 'Active' : 'Inactive'}
              </button>
            ) : (
              <div className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                creator.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${creator.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                {creator.isActive ? 'Active' : 'Inactive'}
              </div>
            )}
          </div>

          {/* Metrics — read view */}
          {!isEditing && (
            <div className="grid grid-cols-4 gap-3 mt-8">
              {[
                { label: 'GMV MTD', value: `$${creator.metrics.mtd.gmv.toLocaleString()}` },
                { label: 'Posts 7D', value: creator.metrics.sevenDay.posts },
                { label: 'Orders MTD', value: creator.metrics.mtd.orders.toLocaleString() },
                { label: 'Comm. Rate', value: `${creator.commissionRate}%` },
              ].map((m) => (
                <div key={m.label} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{m.label}</p>
                  <p className="text-xl font-bold font-mono text-zinc-100">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Metrics editor — shown when editing */}
          {isEditing && (
            <div className="mt-8 space-y-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Edit Metrics</p>
              {(['mtd', 'sevenDay'] as const).map((period) => (
                <div key={period} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mb-3">
                    {period === 'mtd' ? 'Month to Date' : 'Last 7 Days'}
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {(['gmv', 'posts', 'lives', 'orders'] as const).map((field) => (
                      <div key={field}>
                        <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">
                          {field === 'gmv' ? 'GMV ($)' : field}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step={field === 'gmv' ? '0.01' : '1'}
                          value={editMetrics[period][field]}
                          onChange={(e) => updateMetricField(period, field, e.target.value)}
                          className="w-full h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Commission + save row */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Commission Rate (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.5"
                    value={editCommission}
                    onChange={(e) => setEditCommission(e.target.value)}
                    className="w-28 h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="flex items-center gap-2 h-9 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-lg hover:bg-emerald-400 transition-all uppercase tracking-widest disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={cancelEdit} className="h-9 px-4 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">
                    Cancel
                  </button>
                  {editError && <p className="text-[10px] text-red-400 font-bold">{editError}</p>}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Activity History */}
        <section className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Operational History
              {activities.length > 0 && (
                <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-500">{activities.length}</span>
              )}
            </h3>
            {canWrite && (
              <button
                onClick={() => onAddActivity(creator.id)}
                className="flex items-center gap-2 h-9 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-lg hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest"
              >
                <Plus className="w-3.5 h-3.5" />
                New Log Entry
              </button>
            )}
          </div>

          <div className="space-y-6">
            {activities.length === 0 ? (
              <div className="p-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30">
                <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No system activities recorded</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="relative pl-8 pb-8 border-l border-zinc-800 last:pb-0">
                  <div className={`absolute left-[-4.5px] top-0 w-2 h-2 rounded-full ring-4 ring-zinc-950 ${
                    activity.type === 'win' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                    activity.type === 'loss' ? 'bg-red-500' :
                    activity.type === 'adjustment' ? 'bg-blue-500' : 'bg-zinc-600'
                  }`} />
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3 text-zinc-700" />
                      {new Date(activity.recordedAt).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                        activity.type === 'win' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        activity.type === 'loss' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        activity.type === 'adjustment' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}>
                        {activity.type}
                      </span>
                      {canWrite && (
                        confirmDeleteActivityId === activity.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={isDeletingActivity}
                              className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-bold rounded uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {isDeletingActivity ? '…' : 'Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteActivityId(null)}
                              className="px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:text-zinc-200 uppercase tracking-widest"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteActivityId(activity.id)}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-700 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
                    <p className="font-bold text-zinc-100 mb-2 leading-tight">{activity.title}</p>
                    <p className="text-sm text-zinc-400 leading-relaxed font-medium">{activity.description}</p>
                    <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-500">
                          {activity.recordedBy.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Logged by team</span>
                      </div>
                      {activity.impact && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          activity.impact === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                          activity.impact === 'medium' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          <AlertCircle className="w-3 h-3" />
                          {activity.impact} Impact
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Platform Integrations */}
        <section className="p-8 bg-zinc-950/40 backdrop-blur-sm border-t border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 mb-6">
            <Calendar className="w-4 h-4 text-emerald-500" />
            Platform Integrations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creator.accounts.map((acc, idx) => (
              <a
                key={idx}
                href={acc.url}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-100 transition-colors">
                    {acc.platform === 'TikTok' && <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    {acc.platform === 'Instagram' && <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    {acc.platform === 'YouTube' && <Youtube className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    {acc.platform === 'Twitch' && <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    {acc.platform === 'Facebook' && <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{acc.platform}</p>
                    <p className="text-sm font-bold text-zinc-200">@{acc.handle}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-700 group-hover:text-zinc-100 transition-colors" />
              </a>
            ))}

            {canWrite && (
              <button
                onClick={() => setShowAddAccount(true)}
                className="p-4 border-2 border-dashed border-zinc-800 bg-zinc-950/20 rounded-2xl hover:bg-zinc-950/50 hover:border-emerald-500/30 transition-all group flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Add Account</span>
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex justify-end shrink-0">
        <button onClick={onClose} className="px-6 h-10 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">
          Close
        </button>
      </div>

      {/* Add Account Modal */}
      <AnimatePresence>
        {showAddAccount && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleAddAccount}>
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-zinc-100">Add Platform Account</h4>
                  <button type="button" onClick={() => setShowAddAccount(false)} className="p-1.5 hover:bg-zinc-800 rounded-lg">
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Platform</label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value as typeof PLATFORMS[number])}
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                    >
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Handle</label>
                    <input
                      type="text"
                      value={newHandle}
                      onChange={(e) => setNewHandle(e.target.value)}
                      placeholder="@username"
                      required
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Profile URL <span className="normal-case text-zinc-600">(optional)</span></label>
                    <input
                      type="text"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {accountError && <p className="text-[10px] text-red-400 font-bold">{accountError}</p>}
                </div>
                <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddAccount(false)} className="px-4 h-9 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAccount}
                    className="px-5 h-9 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all uppercase tracking-widest disabled:opacity-50"
                  >
                    {isSavingAccount ? 'Adding…' : 'Add Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
