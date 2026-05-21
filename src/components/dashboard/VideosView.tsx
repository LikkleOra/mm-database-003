/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, FormEvent } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator } from '../../types';
import { Play, Eye, DollarSign, MoreVertical, ExternalLink, Search, ChevronDown, Video, Plus, X, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PLATFORMS = ['All', 'TikTok', 'Instagram', 'YouTube', 'Facebook'] as const;
type VideoPlatform = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook';

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
  Instagram: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  YouTube: 'bg-red-500/10 border-red-500/20 text-red-400',
  Facebook: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
};

interface VideosViewProps {
  userRole: 'admin' | 'manager' | 'viewer';
  creators: Creator[];
}

export function VideosView({ userRole, creators }: VideosViewProps) {
  const videosData = useQuery(api.videos.list);
  const createVideo = useMutation(api.videos.create);
  const refreshVideo = useAction(api.youtube.refreshVideo);
  const logVideoByUrl = useAction(api.youtube.logVideoByUrl);

  const isLoading = videosData === undefined;
  const videos = videosData ?? [];

  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<string>('All');
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);

  const [showLogModal, setShowLogModal] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logFieldErrors, setLogFieldErrors] = useState<{ title?: string; views?: string; creatorId?: string }>({});
  const [logPlatform, setLogPlatform] = useState<VideoPlatform>('TikTok');

  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const canWrite = userRole === 'admin' || userRole === 'manager';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return videos.filter((v) => {
      const matchesSearch = !q || v.title.toLowerCase().includes(q) || v.creatorName.toLowerCase().includes(q);
      const matchesPlatform = platform === 'All' || v.platform === platform;
      return matchesSearch && matchesPlatform;
    });
  }, [videos, search, platform]);

  async function handleRefresh(videoId: string) {
    if (refreshingId) return;
    setRefreshingId(videoId);
    setRefreshError(null);
    try {
      await refreshVideo({ videoId: videoId as Id<'videos'> });
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Refresh failed.');
    } finally {
      setRefreshingId(null);
    }
  }

  const handleLogVideo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLogging) return;

    const formData = new FormData(e.currentTarget);
    const creatorId = (formData.get('creatorId') as string) ?? '';
    const revenueRaw = (formData.get('revenue') as string ?? '').trim();

    const errors: typeof logFieldErrors = {};
    if (!creatorId) errors.creatorId = 'Please select a creator.';

    if (logPlatform === 'YouTube') {
      const videoUrl = (formData.get('videoUrl') as string ?? '').trim();
      if (!videoUrl) { setLogError('YouTube URL is required.'); return; }
      setLogFieldErrors({});
      setLogError(null);
      setIsLogging(true);
      try {
        await logVideoByUrl({ creatorId: creatorId as Id<'creators'>, videoUrl });
        setShowLogModal(false);
        setLogPlatform('TikTok');
      } catch (err) {
        setLogError(err instanceof Error ? err.message : 'Failed to log video.');
      } finally {
        setIsLogging(false);
      }
      return;
    }

    const title = (formData.get('title') as string) ?? '';
    const viewsRaw = parseInt((formData.get('views') as string) ?? '0', 10);
    const thumbnailUrl = (formData.get('thumbnailUrl') as string ?? '').trim();

    if (title.trim().length < 2) errors.title = 'Title must be at least 2 characters.';
    if (isNaN(viewsRaw) || viewsRaw < 0) errors.views = 'Views must be a valid number.';

    if (Object.keys(errors).length > 0) {
      setLogFieldErrors(errors);
      return;
    }
    setLogFieldErrors({});
    setLogError(null);
    setIsLogging(true);

    try {
      await createVideo({
        creatorId: creatorId as Id<'creators'>,
        platform: logPlatform,
        title: title.trim(),
        views: viewsRaw,
        revenue: revenueRaw ? parseFloat(revenueRaw) : undefined,
        thumbnailUrl: thumbnailUrl || undefined,
      });
      setShowLogModal(false);
      setLogPlatform('TikTok');
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log video. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Content Explorer</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              {isLoading ? 'Loading...' : `${videos.length} videos tracked`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canWrite && !isLoading && (
            <button
              onClick={() => { setLogError(null); setLogFieldErrors({}); setLogPlatform('TikTok'); setShowLogModal(true); }}
              className="flex items-center gap-2 h-9 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Video
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content..."
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-48 placeholder:text-zinc-600"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPlatformMenu((v) => !v)}
              className={`flex items-center gap-2 h-10 px-4 border rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                platform !== 'All'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {platform}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showPlatformMenu && (
              <div className="absolute right-0 top-12 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-10 overflow-hidden">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPlatform(p); setShowPlatformMenu(false); }}
                    className={`w-full px-4 py-2.5 text-xs font-bold text-left uppercase tracking-widest transition-colors ${
                      platform === p ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-zinc-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <Video className="w-7 h-7 text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold text-zinc-400 tracking-tight">No videos tracked yet</h3>
          <p className="text-zinc-600 text-sm mt-2 max-w-sm font-medium">
            {canWrite ? 'Use "Log Video" to add the first entry.' : 'Videos will appear here once content is submitted.'}
          </p>
        </div>
      )}

      {/* No filter results */}
      {!isLoading && videos.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="text-zinc-500 text-sm font-medium">No videos match your search or filter.</p>
          <button onClick={() => { setSearch(''); setPlatform('All'); }} className="mt-2 text-emerald-500 text-xs font-bold hover:text-emerald-400">
            Clear filters
          </button>
        </div>
      )}

      {/* Video grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((video, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={video.id}
              className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-zinc-700 transition-all"
            >
              <div className="relative aspect-video bg-zinc-950 flex items-center justify-center">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <Video className="w-10 h-10 text-zinc-700" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </div>
                <div className={`absolute top-3 left-3 px-2 py-1 rounded-md text-[9px] font-bold border uppercase tracking-widest ${PLATFORM_COLORS[video.platform] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {video.platform}
                </div>
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                  video.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  video.status === 'processing' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                  'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}>
                  {video.status}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">{video.title}</h3>
                    <p className="text-xs text-zinc-500 font-medium">by {video.creatorName}</p>
                  </div>
                  <button className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4 border-t border-zinc-800 pt-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] font-bold text-zinc-500">{video.views.toLocaleString()}</span>
                    </div>
                    {video.revenue > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-500">${video.revenue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {video.platform === 'YouTube' && canWrite && (
                      <button
                        onClick={() => handleRefresh(video.id)}
                        disabled={refreshingId === video.id}
                        className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Refresh YouTube stats"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === video.id ? 'animate-spin text-red-400' : ''}`} />
                      </button>
                    )}
                    <button className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-100">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {refreshError && refreshingId === null && video.platform === 'YouTube' && (
                  <p className="text-[9px] text-red-400 font-bold mt-1">{refreshError}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Log Video Modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <form onSubmit={handleLogVideo} noValidate>
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <Video className="w-5 h-5 text-black" />
                    </div>
                    Log Video Entry
                  </h3>
                  <button type="button" onClick={() => setShowLogModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-zinc-500" />
                  </button>
                </div>

                <div className="p-8 space-y-5">
                  <div>
                    <label htmlFor="log-creator" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Creator</label>
                    <select
                      id="log-creator" name="creatorId"
                      onChange={() => logFieldErrors.creatorId && setLogFieldErrors((e) => ({ ...e, creatorId: undefined }))}
                      defaultValue=""
                      className={`w-full h-12 px-4 bg-zinc-900 border rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                        logFieldErrors.creatorId ? 'border-red-500/50 focus:ring-red-500/20' : 'border-zinc-800 focus:ring-emerald-500/20'
                      }`}
                    >
                      <option value="" disabled>Select a creator…</option>
                      {creators.filter((c) => c.isActive).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {logFieldErrors.creatorId && <p className="mt-1.5 px-1 text-[10px] font-bold text-red-400">{logFieldErrors.creatorId}</p>}
                  </div>

                  <div>
                    <label htmlFor="log-platform" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Platform</label>
                    <select
                      id="log-platform" name="platform"
                      value={logPlatform}
                      onChange={(e) => setLogPlatform(e.target.value as VideoPlatform)}
                      className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="TikTok">TikTok</option>
                      <option value="Instagram">Instagram</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Facebook">Facebook</option>
                    </select>
                  </div>

                  {logPlatform === 'YouTube' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">YouTube URL</label>
                      <input
                        name="videoUrl" type="url"
                        placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                        className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all placeholder:text-zinc-700"
                      />
                      <p className="mt-1.5 px-1 text-[10px] text-zinc-600 font-medium">
                        Title, views, and thumbnail are fetched automatically from YouTube.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="log-views" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Views</label>
                          <input
                            id="log-views" name="views" type="number" min="0" defaultValue="0"
                            onChange={() => logFieldErrors.views && setLogFieldErrors((e) => ({ ...e, views: undefined }))}
                            className={`w-full h-12 px-4 bg-zinc-900 border rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 transition-all ${
                              logFieldErrors.views ? 'border-red-500/50 focus:ring-red-500/20' : 'border-zinc-800 focus:ring-emerald-500/20'
                            }`}
                          />
                          {logFieldErrors.views && <p className="mt-1.5 px-1 text-[10px] font-bold text-red-400">{logFieldErrors.views}</p>}
                        </div>
                        <div>
                          <label htmlFor="log-revenue" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Revenue ($) — optional</label>
                          <input
                            id="log-revenue" name="revenue" type="number" min="0" step="0.01" placeholder="0.00"
                            className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="log-title" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Video Title</label>
                        <input
                          id="log-title" name="title" type="text"
                          onChange={() => logFieldErrors.title && setLogFieldErrors((e) => ({ ...e, title: undefined }))}
                          placeholder="e.g. Product review — Summer Collection"
                          className={`w-full h-12 px-4 bg-zinc-900 border rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 transition-all placeholder:text-zinc-700 ${
                            logFieldErrors.title ? 'border-red-500/50 focus:ring-red-500/20' : 'border-zinc-800 focus:ring-emerald-500/20'
                          }`}
                        />
                        {logFieldErrors.title && <p className="mt-1.5 px-1 text-[10px] font-bold text-red-400">{logFieldErrors.title}</p>}
                      </div>
                      <div>
                        <label htmlFor="log-thumbnail" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Thumbnail URL — optional</label>
                        <input
                          id="log-thumbnail" name="thumbnailUrl" type="url" placeholder="https://..."
                          className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700"
                        />
                      </div>
                    </>
                  )}

                  {logPlatform === 'YouTube' && (
                    <div>
                      <label htmlFor="log-revenue-yt" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Revenue ($) — optional</label>
                      <input
                        id="log-revenue-yt" name="revenue" type="number" min="0" step="0.01" placeholder="0.00"
                        className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700"
                      />
                    </div>
                  )}

                  {logError && (
                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-400 font-bold">{logError}</p>
                    </div>
                  )}
                </div>

                <div className="p-8 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-4">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-6 h-12 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLogging}
                    className="px-8 h-12 bg-emerald-500 text-black text-[10px] font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLogging ? 'Saving...' : 'Log Video'}
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
