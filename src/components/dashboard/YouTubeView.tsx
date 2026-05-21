/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator } from '../../types';
import {
  Youtube, Eye, RefreshCw, Plus, X, AlertCircle, Video,
  TrendingUp, DollarSign, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface YouTubeViewProps {
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

export function YouTubeView({ userRole, creators }: YouTubeViewProps) {
  const videosData = useQuery(api.videos.list);
  const refreshVideo = useAction(api.youtube.refreshVideo);
  const refreshAllVideos = useAction(api.youtube.refreshAllVideos);
  const logVideoByUrl = useAction(api.youtube.logVideoByUrl);

  const isLoading = videosData === undefined;
  const ytVideos = (videosData ?? []).filter((v) => v.platform === 'YouTube');

  const canWrite = userRole === 'admin' || userRole === 'manager';

  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logCreatorId, setLogCreatorId] = useState('');
  const [logUrl, setLogUrl] = useState('');

  const totalViews = ytVideos.reduce((s, v) => s + v.views, 0);
  const totalRevenue = ytVideos.reduce((s, v) => s + (v.revenue ?? 0), 0);
  const avgViews = ytVideos.length > 0 ? Math.round(totalViews / ytVideos.length) : 0;

  async function handleRefresh(videoId: string) {
    if (refreshingId || isRefreshingAll) return;
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

  async function handleRefreshAll() {
    if (isRefreshingAll || refreshingId) return;
    setIsRefreshingAll(true);
    setRefreshError(null);
    try {
      await refreshAllVideos();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Refresh all failed.');
    } finally {
      setIsRefreshingAll(false);
    }
  }

  async function handleLogVideo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLogging || !logCreatorId || !logUrl.trim()) return;
    setIsLogging(true);
    setLogError(null);
    try {
      await logVideoByUrl({ creatorId: logCreatorId as Id<'creators'>, videoUrl: logUrl.trim() });
      setShowLogModal(false);
      setLogCreatorId('');
      setLogUrl('');
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log video.');
    } finally {
      setIsLogging(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Youtube className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">YouTube Analytics</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              {isLoading ? 'Loading...' : `${ytVideos.length} videos tracked`}
            </p>
          </div>
        </div>
        {canWrite && !isLoading && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll || !!refreshingId}
              className="flex items-center gap-2 h-9 px-4 bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-bold rounded-xl hover:text-zinc-100 hover:border-zinc-600 transition-all uppercase tracking-widest disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              {isRefreshingAll ? 'Refreshing…' : 'Refresh All'}
            </button>
            <button
              onClick={() => { setLogError(null); setLogCreatorId(''); setLogUrl(''); setShowLogModal(true); }}
              className="flex items-center gap-2 h-9 px-4 bg-red-500 text-white text-[10px] font-bold rounded-xl hover:bg-red-400 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] uppercase tracking-widest"
            >
              <Plus className="w-3.5 h-3.5" />
              Log YouTube Video
            </button>
          </div>
        )}
      </div>

      {/* API key notice */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Youtube className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest">YouTube Data API v3 Required</p>
          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
            Go to <span className="text-zinc-300 font-bold">console.cloud.google.com</span> → create a project → enable YouTube Data API v3 → create an API key →
            add <span className="text-zinc-300 font-mono font-bold">YOUTUBE_API_KEY</span> in Convex dashboard → Settings → Environment Variables.
            Stats auto-refresh every 6 hours via cron once configured.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Videos Tracked', value: isLoading ? '—' : ytVideos.length, icon: Video, color: 'text-zinc-100' },
          { label: 'Total Views', value: isLoading ? '—' : totalViews.toLocaleString(), icon: Eye, color: 'text-red-400' },
          { label: 'Avg Views / Video', value: isLoading ? '—' : avgViews.toLocaleString(), icon: TrendingUp, color: 'text-orange-400' },
          { label: 'Total Revenue', value: isLoading ? '—' : `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="w-3.5 h-3.5 text-zinc-600" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {refreshError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs font-bold text-red-400">{refreshError}</p>
        </div>
      )}

      {/* Video list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : ytVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-center">
          <Youtube className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm font-bold text-zinc-500">No YouTube videos yet</p>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs font-medium">
            Use "Log YouTube Video" to add one, or post a YouTube link in your Discord submission channel.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-zinc-800/50">
            {ytVideos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(idx, 20) * 0.03 }}
                className="flex items-center gap-4 p-4 hover:bg-zinc-800/20 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Youtube className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-100 truncate">{video.title}</p>
                  <p className="text-[10px] text-zinc-500 font-medium mt-0.5">by {video.creatorName}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Eye className="w-3 h-3 text-zinc-500" />
                      <span className="text-sm font-bold text-zinc-200 font-mono">{video.views.toLocaleString()}</span>
                    </div>
                    {video.statsRefreshedAt && (
                      <p className="text-[9px] text-zinc-600 font-medium mt-0.5">
                        updated {timeAgo(video.statsRefreshedAt)}
                      </p>
                    )}
                  </div>
                  {(video.revenue ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-400 font-mono">${video.revenue?.toLocaleString()}</span>
                    </div>
                  )}
                  {canWrite && (
                    <button
                      onClick={() => handleRefresh(video.id)}
                      disabled={refreshingId === video.id || isRefreshingAll}
                      className="p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-100 disabled:opacity-40"
                      title="Refresh stats from YouTube"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === video.id ? 'animate-spin text-red-400' : ''}`} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Log YouTube Video Modal */}
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
              className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <form onSubmit={handleLogVideo} noValidate>
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      <Youtube className="w-5 h-5 text-white" />
                    </div>
                    Log YouTube Video
                  </h3>
                  <button type="button" onClick={() => setShowLogModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-zinc-500" />
                  </button>
                </div>

                <div className="p-8 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Creator</label>
                    <select
                      value={logCreatorId}
                      onChange={(e) => setLogCreatorId(e.target.value)}
                      required
                      className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select a creator…</option>
                      {creators.filter((c) => c.isActive).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">YouTube URL</label>
                    <input
                      type="url"
                      value={logUrl}
                      onChange={(e) => setLogUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                      required
                      className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all placeholder:text-zinc-700"
                    />
                    <p className="mt-1.5 px-1 text-[10px] text-zinc-600 font-medium">
                      Title, views, and thumbnail are fetched automatically from YouTube.
                    </p>
                  </div>

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
                    disabled={isLogging || !logCreatorId || !logUrl.trim()}
                    className="px-8 h-12 bg-red-500 text-white text-[10px] font-bold rounded-2xl hover:bg-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLogging ? 'Fetching…' : 'Log Video'}
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
