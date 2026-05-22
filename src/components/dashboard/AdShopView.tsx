import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator } from '../../types';
import {
  ShoppingBag, Plus, X, ExternalLink, CheckCircle,
  AlertCircle, Video, Instagram, Youtube, Pencil, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Platform = 'TikTok' | 'Instagram' | 'YouTube';
type PlatformFilter = 'All' | Platform;

const PLATFORMS: Platform[] = ['TikTok', 'Instagram', 'YouTube'];

const PLATFORM_ICON: Record<Platform, React.ReactNode> = {
  TikTok:    <Video className="w-3.5 h-3.5" />,
  Instagram: <Instagram className="w-3.5 h-3.5" />,
  YouTube:   <Youtube className="w-3.5 h-3.5" />,
};

const PLATFORM_STYLE: Record<Platform, string> = {
  TikTok:    'bg-pink-500/10 border-pink-500/20 text-pink-400',
  Instagram: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  YouTube:   'bg-red-500/10 border-red-500/20 text-red-400',
};

interface Props {
  userRole: 'admin' | 'manager' | 'viewer';
  creators: Creator[];
}

interface ModalState {
  id?: Id<'shop_accounts'>;
  creatorId: Id<'creators'> | '';
  platform: Platform;
  shopName: string;
  adAccountName: string;
  shopUrl: string;
  notes: string;
}

const EMPTY_MODAL: ModalState = {
  creatorId: '',
  platform: 'TikTok',
  shopName: '',
  adAccountName: '',
  shopUrl: '',
  notes: '',
};

export function AdShopView({ userRole, creators }: Props) {
  const entries = useQuery(api.shop_accounts.listAll) ?? [];
  const upsert = useMutation(api.shop_accounts.upsert);
  const setVerified = useMutation(api.shop_accounts.setVerified);
  const remove = useMutation(api.shop_accounts.remove);

  const canWrite = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin';

  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('All');
  const [showModal, setShowModal] = useState(false);
  const [modal, setModal] = useState<ModalState>(EMPTY_MODAL);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = platformFilter === 'All'
    ? entries
    : entries.filter((e) => e.platform === platformFilter);

  function openAdd() {
    setModal(EMPTY_MODAL);
    setSaveError(null);
    setShowModal(true);
  }

  function openEdit(e: typeof entries[0]) {
    setModal({
      id: e.id as Id<'shop_accounts'>,
      creatorId: e.creatorId as Id<'creators'>,
      platform: e.platform as Platform,
      shopName: e.shopName ?? '',
      adAccountName: e.adAccountName ?? '',
      shopUrl: e.shopUrl,
      notes: e.notes ?? '',
    });
    setSaveError(null);
    setShowModal(true);
  }

  async function handleSave() {
    if (!modal.creatorId || !modal.shopUrl.trim()) {
      setSaveError('Creator and Shop URL are required.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await upsert({
        id: modal.id,
        creatorId: modal.creatorId as Id<'creators'>,
        platform: modal.platform,
        shopName: modal.shopName.trim() || undefined,
        adAccountName: modal.adAccountName.trim() || undefined,
        shopUrl: modal.shopUrl.trim(),
        notes: modal.notes.trim() || undefined,
      });
      setShowModal(false);
      showToast(modal.id ? 'Entry updated.' : 'Shop entry added.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVerifyToggle(id: string, current: boolean) {
    try {
      await setVerified({ id: id as Id<'shop_accounts'>, verified: !current });
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await remove({ id: id as Id<'shop_accounts'> });
      showToast('Entry removed.');
    } catch {}
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(['All', ...PLATFORMS] as PlatformFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                platformFilter === p
                  ? 'bg-emerald-500 text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {canWrite && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 h-9 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <th className="px-5 py-3 min-w-[160px]">Creator</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3">Shop Name</th>
                <th className="px-5 py-3">Ad Account Name</th>
                <th className="px-5 py-3">Shop URL</th>
                <th className="px-5 py-3 text-center">Verified</th>
                <th className="px-5 py-3">Notes</th>
                {canWrite && <th className="px-5 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="px-5 py-16 text-center">
                    <ShoppingBag className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm font-medium">
                      {platformFilter === 'All' ? 'No shop entries yet.' : `No ${platformFilter} entries yet.`}
                    </p>
                    {canWrite && (
                      <button
                        onClick={openAdd}
                        className="mt-3 text-emerald-500 text-xs font-bold hover:text-emerald-400 transition-colors"
                      >
                        Add the first entry
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-800/30 transition-all group">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-zinc-100">{e.creatorName}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${PLATFORM_STYLE[e.platform as Platform]}`}>
                        {PLATFORM_ICON[e.platform as Platform]}
                        {e.platform}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-zinc-300 font-medium">{e.shopName || <span className="text-zinc-600">—</span>}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-zinc-400">{e.adAccountName || <span className="text-zinc-600">—</span>}</p>
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={e.shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors truncate max-w-[200px]"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{e.shopUrl.replace(/^https?:\/\//, '')}</span>
                      </a>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {canWrite ? (
                        <button
                          onClick={() => handleVerifyToggle(e.id, e.verified)}
                          title={e.verified ? 'Mark unverified' : 'Mark verified'}
                          className="mx-auto flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-zinc-700"
                        >
                          {e.verified
                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                            : <AlertCircle className="w-4 h-4 text-zinc-600" />}
                        </button>
                      ) : (
                        <span className="flex justify-center">
                          {e.verified
                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                            : <AlertCircle className="w-4 h-4 text-zinc-600" />}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-zinc-500 max-w-[160px] truncate">{e.notes || <span className="text-zinc-700">—</span>}</p>
                    </td>
                    {canWrite && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(e)}
                            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/20">
          <p className="text-xs text-zinc-600 font-medium">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            {platformFilter !== 'All' && ` · ${platformFilter} only`}
          </p>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <ShoppingBag className="w-4 h-4 text-black" />
                  </div>
                  {modal.id ? 'Edit Shop Entry' : 'Add Shop Entry'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Creator */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Creator</label>
                  <select
                    value={modal.creatorId}
                    onChange={(e) => setModal((m) => ({ ...m, creatorId: e.target.value as Id<'creators'> }))}
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                  >
                    <option value="">Select creator...</option>
                    {creators.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Platform</label>
                  <div className="flex gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setModal((m) => ({ ...m, platform: p }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          modal.platform === p
                            ? 'bg-emerald-500 text-black border-emerald-500'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {PLATFORM_ICON[p]}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shop Name */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Shop Name</label>
                  <input
                    type="text"
                    value={modal.shopName}
                    onChange={(e) => setModal((m) => ({ ...m, shopName: e.target.value }))}
                    placeholder="e.g. KingKai Official Store"
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-zinc-700"
                  />
                </div>

                {/* Ad Account Name */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Ad Account Name</label>
                  <input
                    type="text"
                    value={modal.adAccountName}
                    onChange={(e) => setModal((m) => ({ ...m, adAccountName: e.target.value }))}
                    placeholder="e.g. KingKai Marketing"
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-zinc-700"
                  />
                </div>

                {/* Shop URL */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Shop URL <span className="text-red-400 ml-1">REQ</span>
                  </label>
                  <input
                    type="url"
                    value={modal.shopUrl}
                    onChange={(e) => setModal((m) => ({ ...m, shopUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-zinc-700"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Notes</label>
                  <textarea
                    value={modal.notes}
                    onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))}
                    placeholder="Verified on 2025-01-01, confirmed correct account..."
                    rows={2}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none placeholder:text-zinc-700"
                  />
                </div>

                {saveError && (
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 font-medium">{saveError}</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 h-10 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-7 h-10 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] uppercase tracking-widest disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : modal.id ? 'Update' : 'Add Entry'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl border bg-zinc-900 border-emerald-500/30 text-emerald-400 shadow-2xl text-sm font-bold"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
