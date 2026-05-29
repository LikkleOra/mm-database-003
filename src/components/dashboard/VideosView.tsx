/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, FormEvent } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator } from '../../types';
import {
  Play, Eye, DollarSign, MoreVertical, ExternalLink, Search, ChevronDown,
  Video, Plus, X, AlertCircle, RefreshCw, BarChart2, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ['All', 'TikTok', 'Instagram', 'YouTube', 'Facebook', 'Twitter', 'Threads'] as const;
type VideoPlatform = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook';
type SnapshotLabel = '24h' | '7d' | '30d' | 'custom';

const CONTENT_TYPE_TABS = [
  { id: 'all',          label: 'All' },
  { id: 'talking_head', label: 'Talking Head' },
  { id: 'ai_content',   label: 'AI Content' },
  { id: 'slides',       label: 'Slides' },
] as const;

const STATUS_TABS = [
  { id: 'all',      label: 'All' },
  { id: 'pending',  label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const;

const SNAPSHOT_LABELS: { id: SnapshotLabel; label: string }[] = [
  { id: '24h',    label: '24 Hours' },
  { id: '7d',     label: '7 Days' },
  { id: '30d',    label: '30 Days' },
  { id: 'custom', label: 'Custom' },
];

const METRIC_FIELDS: { key: string; label: string; note?: string }[] = [
  { key: 'views',                label: 'Views' },
  { key: 'likes',                label: 'Likes' },
  { key: 'comments',             label: 'Comments' },
  { key: 'shares',               label: 'Shares' },
  { key: 'saves',                label: 'Saves' },
  { key: 'watchTime',            label: 'Watch Time (s)',     note: 'seconds' },
  { key: 'averageWatchDuration', label: 'Avg Watch (s)',      note: 'seconds' },
  { key: 'completionRate',       label: 'Completion Rate (%)', note: '0–100' },
  { key: 'clicks',               label: 'Clicks' },
  { key: 'orders',               label: 'Orders' },
  { key: 'revenue',              label: 'Revenue ($)' },
];

const PLATFORM_COLORS: Record<string, string> = {
  TikTok:    'bg-pink-500/10 border-pink-500/20 text-pink-400',
  Instagram: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  YouTube:   'bg-red-500/10 border-red-500/20 text-red-400',
  Facebook:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
  Twitter:   'bg-sky-500/10 border-sky-500/20 text-sky-400',
  Threads:   'bg-zinc-700/30 border-zinc-600/30 text-zinc-400',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  talking_head: 'Talking Head',
  ai_content:   'AI Content',
  slides:       'Slides',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | undefined) {
  if (n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getStatusBadgeClass(status: string) {
  if (status === 'pending')    return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
  if (status === 'approved')   return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (status === 'rejected')   return 'bg-red-500/10 border-red-500/20 text-red-400';
  if (status === 'done')       return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (status === 'processing') return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
  return 'bg-zinc-800 border-zinc-700 text-zinc-500';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VideosViewProps {
  userRole: 'admin' | 'manager' | 'viewer';
  creators: Creator[];
  activeCampaign: 'Afina' | 'Sigma';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VideosView({ userRole, creators, activeCampaign }: VideosViewProps) {
  const videosData       = useQuery(api.videos.list);
  const analyticsCount   = useQuery(api.analytics.counts);
  const pendingSnapshots = useQuery(api.analytics.listPending);
  const submissionsData  = useQuery(api.submissions.list, {});
  const createVideo      = useMutation(api.videos.create);
  const createSnapshot   = useMutation(api.analytics.create);
  const reviewSnapshot   = useMutation(api.analytics.review);
  const refreshVideo     = useAction(api.youtube.refreshVideo);
  const logVideoByUrl    = useAction(api.youtube.logVideoByUrl);

  const isLoading = videosData === undefined;
  const allItems  = videosData ?? [];
  const allSubmissions = submissionsData ?? [];
  const pendingCount = analyticsCount?.pending ?? 0;

  const canWrite = userRole === 'admin' || userRole === 'manager';

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<'content' | 'analytics'>('content');

  // ── Content tab filters ──
  const [search,            setSearch]            = useState('');
  const [platform,          setPlatform]          = useState<string>('All');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [statusFilter,      setStatusFilter]      = useState<string>('all');
  const [showPlatformMenu,  setShowPlatformMenu]  = useState(false);

  // ── Log Video modal ──
  const [showLogModal,  setShowLogModal]  = useState(false);
  const [isLogging,     setIsLogging]     = useState(false);
  const [logError,      setLogError]      = useState<string | null>(null);
  const [logFieldErrors, setLogFieldErrors] = useState<{ title?: string; views?: string; creatorId?: string }>({});
  const [logPlatform,   setLogPlatform]   = useState<VideoPlatform>('TikTok');

  // ── YouTube refresh ──
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // ── Analytics submit form ──
  const [snapSubmissionId,   setSnapSubmissionId]   = useState('');
  const [snapLabel,          setSnapLabel]          = useState<SnapshotLabel>('7d');
  const [snapDate,           setSnapDate]           = useState('');
  const [snapDriveLink,      setSnapDriveLink]      = useState('');
  const [snapMetrics,        setSnapMetrics]        = useState<Record<string, string>>({});
  const [isSubmittingSnap,   setIsSubmittingSnap]   = useState(false);
  const [snapError,          setSnapError]          = useState<string | null>(null);
  const [snapSuccess,        setSnapSuccess]        = useState(false);
  const [subSearch,          setSubSearch]          = useState('');

  // ── Analytics review modal ──
  const [reviewTarget,    setReviewTarget]    = useState<string | null>(null);
  const [reviewDecision,  setReviewDecision]  = useState<'approved' | 'rejected'>('approved');
  const [reviewNote,      setReviewNote]      = useState('');
  const [isReviewing,     setIsReviewing]     = useState(false);
  const [reviewError,     setReviewError]     = useState<string | null>(null);

  // ── Content tab filtering ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter((item) => {
      if (item.sourceType === 'submission' && item.campaign && item.campaign !== activeCampaign) return false;
      const matchesSearch  = !q || item.title.toLowerCase().includes(q) || item.creatorName.toLowerCase().includes(q);
      const matchesPlatform    = platform === 'All' || item.platform === platform;
      const matchesContentType = contentTypeFilter === 'all' || item.contentType === contentTypeFilter;
      const matchesStatus      = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesPlatform && matchesContentType && matchesStatus;
    });
  }, [allItems, search, platform, contentTypeFilter, statusFilter, activeCampaign]);

  // ── Submission search for analytics form ──
  const filteredSubmissions = useMemo(() => {
    const q = subSearch.toLowerCase();
    return allSubmissions
      .filter((s) => {
        if (!q) return true;
        return s.creatorName.toLowerCase().includes(q) || s.contentUrl.toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [allSubmissions, subSearch]);

  // ── Handlers ──

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
    const formData   = new FormData(e.currentTarget);
    const creatorId  = (formData.get('creatorId') as string) ?? '';
    const revenueRaw = (formData.get('revenue') as string ?? '').trim();
    const errors: typeof logFieldErrors = {};
    if (!creatorId) errors.creatorId = 'Please select a creator.';

    if (logPlatform === 'YouTube') {
      const videoUrl = (formData.get('videoUrl') as string ?? '').trim();
      if (!videoUrl) { setLogError('YouTube URL is required.'); return; }
      setLogFieldErrors({}); setLogError(null); setIsLogging(true);
      try {
        await logVideoByUrl({ creatorId: creatorId as Id<'creators'>, videoUrl });
        setShowLogModal(false); setLogPlatform('TikTok');
      } catch (err) {
        setLogError(err instanceof Error ? err.message : 'Failed to log video.');
      } finally { setIsLogging(false); }
      return;
    }

    const title    = (formData.get('title') as string) ?? '';
    const viewsRaw = parseInt((formData.get('views') as string) ?? '0', 10);
    const thumbnailUrl = (formData.get('thumbnailUrl') as string ?? '').trim();
    if (title.trim().length < 2) errors.title = 'Title must be at least 2 characters.';
    if (isNaN(viewsRaw) || viewsRaw < 0) errors.views = 'Views must be a valid number.';
    if (Object.keys(errors).length > 0) { setLogFieldErrors(errors); return; }
    setLogFieldErrors({}); setLogError(null); setIsLogging(true);
    try {
      await createVideo({
        creatorId: creatorId as Id<'creators'>,
        platform: logPlatform,
        title: title.trim(),
        views: viewsRaw,
        revenue: revenueRaw ? parseFloat(revenueRaw) : undefined,
        thumbnailUrl: thumbnailUrl || undefined,
      });
      setShowLogModal(false); setLogPlatform('TikTok');
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log video. Please try again.');
    } finally { setIsLogging(false); }
  };

  async function handleSubmitSnapshot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmittingSnap || !snapSubmissionId) return;
    setIsSubmittingSnap(true);
    setSnapError(null);
    try {
      const metrics: Record<string, number> = {};
      for (const field of METRIC_FIELDS) {
        const raw = snapMetrics[field.key]?.trim();
        if (raw) metrics[field.key] = parseFloat(raw);
      }
      await createSnapshot({
        submissionId: snapSubmissionId as Id<'submissions'>,
        snapshotLabel: snapLabel,
        snapshotDate: snapDate,
        proofDriveLink: snapDriveLink.trim(),
        ...metrics,
      });
      setSnapSuccess(true);
      setSnapSubmissionId('');
      setSnapLabel('7d');
      setSnapDate('');
      setSnapDriveLink('');
      setSnapMetrics({});
      setSubSearch('');
      setTimeout(() => setSnapSuccess(false), 3000);
    } catch (err) {
      setSnapError(err instanceof Error ? err.message : 'Failed to submit analytics.');
    } finally {
      setIsSubmittingSnap(false);
    }
  }

  async function handleReview() {
    if (isReviewing || !reviewTarget) return;
    setIsReviewing(true);
    setReviewError(null);
    try {
      await reviewSnapshot({
        snapshotId: reviewTarget as Id<'video_analytics_snapshots'>,
        status: reviewDecision,
        reviewNote: reviewNote.trim() || undefined,
      });
      setReviewTarget(null);
      setReviewNote('');
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  const reviewingSnapshot = (pendingSnapshots ?? []).find((s) => s.id === reviewTarget);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Content Explorer</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              {isLoading ? 'Loading...' : `${filtered.length} items`}
            </p>
          </div>
        </div>
        {canWrite && !isLoading && activeTab === 'content' && (
          <button
            onClick={() => { setLogError(null); setLogFieldErrors({}); setLogPlatform('TikTok'); setShowLogModal(true); }}
            className="flex items-center gap-2 h-9 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Video
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-5 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
            activeTab === 'content' ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'text-zinc-500 hover:text-zinc-100'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Content
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
            activeTab === 'analytics' ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'text-zinc-500 hover:text-zinc-100'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Analytics
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── CONTENT TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'content' && (
        <>
          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
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
                  platform !== 'All' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {platform}<ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showPlatformMenu && (
                <div className="absolute left-0 top-12 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-10 overflow-hidden">
                  {PLATFORMS.map((p) => (
                    <button key={p} onClick={() => { setPlatform(p); setShowPlatformMenu(false); }}
                      className={`w-full px-4 py-2.5 text-xs font-bold text-left uppercase tracking-widest transition-colors ${platform === p ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content type + status filter rows */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1">
              {CONTENT_TYPE_TABS.map((tab) => (
                <button key={tab.id} onClick={() => setContentTypeFilter(tab.id)}
                  className={`px-3 h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    contentTypeFilter === tab.id ? 'bg-lime-300/10 border-lime-300/30 text-lime-300' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-zinc-800" />
            <div className="flex items-center gap-1">
              {STATUS_TABS.map((tab) => (
                <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    statusFilter === tab.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-video bg-zinc-800" /><div className="p-5 space-y-3"><div className="h-4 bg-zinc-800 rounded w-3/4" /><div className="h-3 bg-zinc-800 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && allItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4"><Video className="w-7 h-7 text-zinc-600" /></div>
              <h3 className="text-lg font-bold text-zinc-400 tracking-tight">No content yet</h3>
              <p className="text-zinc-600 text-sm mt-2 max-w-sm font-medium">
                {canWrite ? 'Use "Log Video" to add the first entry.' : 'Content will appear here once creators submit posts.'}
              </p>
            </div>
          )}

          {/* No filter results */}
          {!isLoading && allItems.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-zinc-500 text-sm font-medium">No content matches your filters.</p>
              <button onClick={() => { setSearch(''); setPlatform('All'); setContentTypeFilter('all'); setStatusFilter('all'); }} className="mt-2 text-emerald-500 text-xs font-bold hover:text-emerald-400">Clear filters</button>
            </div>
          )}

          {/* Content grid */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  key={item.id}
                  className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-zinc-700 transition-all"
                >
                  <div className="relative aspect-video bg-zinc-950 flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Video className="w-10 h-10 text-zinc-700" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]"><Play className="w-6 h-6 fill-current" /></div>
                    </div>
                    <div className={`absolute top-3 left-3 px-2 py-1 rounded-md text-[9px] font-bold border uppercase tracking-widest ${PLATFORM_COLORS[item.platform] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{item.platform}</div>
                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${getStatusBadgeClass(item.status)}`}>{item.status}</div>
                    {item.contentType && (
                      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md text-[9px] font-bold bg-lime-300/20 border border-lime-300/30 text-lime-300 uppercase tracking-widest">
                        {CONTENT_TYPE_LABELS[item.contentType]}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                        <p className="text-xs text-zinc-500 font-medium">by {item.creatorName}</p>
                      </div>
                      <button className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 shrink-0"><MoreVertical className="w-4 h-4" /></button>
                    </div>

                    {/* Approved analytics overlay */}
                    {item.sourceType === 'submission' && (item as any).analyticsViews !== undefined && (
                      <div className="mb-3 px-3 py-2 bg-lime-300/5 border border-lime-300/10 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-lime-300 shrink-0" />
                        <span className="text-[10px] text-lime-300 font-bold">
                          {fmt((item as any).analyticsViews)} views
                          {(item as any).analyticsLikes !== undefined && ` · ${fmt((item as any).analyticsLikes)} likes`}
                          {(item as any).analyticsSnapshotLabel && <span className="text-lime-300/50 font-medium"> ({(item as any).analyticsSnapshotLabel})</span>}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 border-t border-zinc-800 pt-3">
                      <div className="flex items-center gap-4">
                        {item.views > 0 && (
                          <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-zinc-500" /><span className="text-[10px] font-bold text-zinc-500">{item.views.toLocaleString()}</span></div>
                        )}
                        {item.revenue > 0 && (
                          <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-500">${item.revenue.toLocaleString()}</span></div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.platform === 'YouTube' && item.sourceType === 'video' && canWrite && (
                          <button onClick={() => handleRefresh(item.id)} disabled={refreshingId === item.id}
                            className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40" title="Refresh YouTube stats">
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === item.id ? 'animate-spin text-red-400' : ''}`} />
                          </button>
                        )}
                        {item.contentUrl && (
                          <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-100"><ExternalLink className="w-3.5 h-3.5" /></a>
                        )}
                      </div>
                    </div>
                    {refreshError && refreshingId === null && item.platform === 'YouTube' && (
                      <p className="text-[9px] text-red-400 font-bold mt-1">{refreshError}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ANALYTICS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">

          {/* Submit Analytics form — admin/manager only */}
          {canWrite && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/60 flex items-center gap-3">
                <div className="w-9 h-9 bg-lime-300/10 border border-lime-300/20 rounded-xl flex items-center justify-center">
                  <BarChart2 className="w-4.5 h-4.5 text-lime-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 tracking-tight">Submit Analytics Snapshot</h3>
                  <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Log performance numbers for an existing submission. Drive proof required.</p>
                </div>
                {snapSuccess && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-lime-300" />
                    <span className="text-[11px] text-lime-300 font-bold uppercase tracking-widest">Submitted</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmitSnapshot} className="p-6 space-y-5">
                {/* Submission picker */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Select Submission</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text" value={subSearch} onChange={(e) => setSubSearch(e.target.value)}
                      placeholder="Search by creator or URL…"
                      className="w-full h-10 pl-9 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-lime-300/40 transition-colors"
                    />
                  </div>
                  <select
                    value={snapSubmissionId} onChange={(e) => setSnapSubmissionId(e.target.value)} required
                    className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-300/20 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Choose a submission…</option>
                    {filteredSubmissions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.creatorName} — {s.platform} — {s.contentUrl.slice(0, 50)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Snapshot label + date */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Snapshot Window</label>
                    <div className="flex gap-2 flex-wrap">
                      {SNAPSHOT_LABELS.map((l) => (
                        <button key={l.id} type="button" onClick={() => setSnapLabel(l.id)}
                          className={`px-3 h-8 rounded-lg text-[10px] font-bold border tracking-wide transition-all ${
                            snapLabel === l.id ? 'bg-lime-300/10 border-lime-300/40 text-lime-300' : 'bg-transparent border-zinc-800 text-zinc-600 hover:text-zinc-300'
                          }`}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Snapshot Date</label>
                    <input
                      type="date" value={snapDate} onChange={(e) => setSnapDate(e.target.value)} required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-300/20 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Metrics grid */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Metrics — leave blank if unavailable</label>
                  <div className="grid grid-cols-3 gap-3">
                    {METRIC_FIELDS.map((field) => (
                      <div key={field.key}>
                        <label className="block text-[10px] text-zinc-600 font-medium mb-1 px-1">{field.label}</label>
                        <input
                          type="number" min="0" step={field.key === 'revenue' ? '0.01' : '1'}
                          value={snapMetrics[field.key] ?? ''}
                          onChange={(e) => setSnapMetrics((m) => ({ ...m, [field.key]: e.target.value }))}
                          placeholder="—"
                          className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-lime-300/30 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proof Drive link */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Proof Drive Link <span className="text-lime-300">*</span></label>
                  <input
                    type="url" value={snapDriveLink} onChange={(e) => setSnapDriveLink(e.target.value)} required
                    placeholder="https://drive.google.com/..."
                    className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-300/20 transition-all"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1 px-1">Screenshot or screen recording of the platform analytics screen.</p>
                </div>

                {snapError && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-400 font-bold">{snapError}</p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={isSubmittingSnap || !snapSubmissionId}
                    className="px-8 h-11 bg-lime-300 text-zinc-950 text-[11px] font-bold rounded-xl hover:bg-lime-200 transition-all shadow-[0_0_20px_rgba(163,230,53,0.2)] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed">
                    {isSubmittingSnap ? 'Submitting…' : 'Submit Snapshot'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Analytics Review Queue */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-zinc-100 tracking-tight">Review Queue</h3>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  {pendingCount} pending
                </span>
              )}
            </div>

            {pendingSnapshots === undefined && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />)}
              </div>
            )}

            {pendingSnapshots !== undefined && pendingSnapshots.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-center">
                <CheckCircle className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-sm font-bold text-zinc-500">Queue is clear</p>
                <p className="text-xs text-zinc-600 mt-1">No analytics snapshots pending review.</p>
              </div>
            )}

            {pendingSnapshots !== undefined && pendingSnapshots.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/50">
                {pendingSnapshots.map((snap, idx) => (
                  <motion.div
                    key={snap.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                    className="flex items-start gap-4 p-4 hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${PLATFORM_COLORS[snap.platform] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                          {snap.platform}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase">
                          {snap.snapshotLabel}
                        </span>
                        {snap.contentType && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-lime-300/10 border border-lime-300/20 text-lime-300 uppercase">
                            {CONTENT_TYPE_LABELS[snap.contentType]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-zinc-100">{snap.creatorName}</p>
                      <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
                        {snap.views !== undefined && <span><Eye className="inline w-3 h-3 mr-1" />{fmt(snap.views)} views</span>}
                        {snap.likes !== undefined && <span>♥ {fmt(snap.likes)} likes</span>}
                        {snap.orders !== undefined && <span>🛒 {fmt(snap.orders)} orders</span>}
                      </div>
                      <a href={snap.contentUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-500 hover:text-emerald-400 font-medium truncate max-w-xs">
                        <ExternalLink className="w-3 h-3 shrink-0" />{snap.contentUrl}
                      </a>
                      <a href={snap.proofDriveLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-lime-300/70 hover:text-lime-300 font-medium transition-colors ml-4">
                        <ExternalLink className="w-3 h-3 shrink-0" />Drive proof
                      </a>
                      <p className="text-[9px] text-zinc-600">{timeAgo(snap.submittedAt)} · {snap.snapshotDate}</p>
                    </div>

                    {canWrite && (
                      <div className="flex items-center gap-2 shrink-0 mt-1">
                        <button onClick={() => { setReviewTarget(snap.id); setReviewDecision('approved'); setReviewNote(''); setReviewError(null); }}
                          className="flex items-center gap-1.5 h-8 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-all uppercase tracking-widest">
                          <CheckCircle className="w-3.5 h-3.5" />Approve
                        </button>
                        <button onClick={() => { setReviewTarget(snap.id); setReviewDecision('rejected'); setReviewNote(''); setReviewError(null); }}
                          className="flex items-center gap-1.5 h-8 px-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest">
                          <XCircle className="w-3.5 h-3.5" />Reject
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOG VIDEO MODAL ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogModal(false)} className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <form onSubmit={handleLogVideo} noValidate>
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]"><Video className="w-5 h-5 text-black" /></div>
                    Log Video Entry
                  </h3>
                  <button type="button" onClick={() => setShowLogModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"><X className="w-6 h-6 text-zinc-500" /></button>
                </div>
                <div className="p-8 space-y-5">
                  <div>
                    <label htmlFor="log-creator" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Creator</label>
                    <select id="log-creator" name="creatorId" onChange={() => logFieldErrors.creatorId && setLogFieldErrors((e) => ({ ...e, creatorId: undefined }))} defaultValue=""
                      className={`w-full h-12 px-4 bg-zinc-900 border rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${logFieldErrors.creatorId ? 'border-red-500/50 focus:ring-red-500/20' : 'border-zinc-800 focus:ring-emerald-500/20'}`}>
                      <option value="" disabled>Select a creator…</option>
                      {creators.filter((c) => c.isActive).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                    {logFieldErrors.creatorId && <p className="mt-1.5 px-1 text-[10px] font-bold text-red-400">{logFieldErrors.creatorId}</p>}
                  </div>
                  <div>
                    <label htmlFor="log-platform" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Platform</label>
                    <select id="log-platform" name="platform" value={logPlatform} onChange={(e) => setLogPlatform(e.target.value as VideoPlatform)}
                      className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer">
                      <option value="TikTok">TikTok</option><option value="Instagram">Instagram</option><option value="YouTube">YouTube</option><option value="Facebook">Facebook</option>
                    </select>
                  </div>
                  {logPlatform === 'YouTube' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">YouTube URL</label>
                      <input name="videoUrl" type="url" placeholder="https://youtube.com/watch?v=..." className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all placeholder:text-zinc-700" />
                      <p className="mt-1.5 px-1 text-[10px] text-zinc-600 font-medium">Title, views, and thumbnail are fetched automatically.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="log-views" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Views</label>
                          <input id="log-views" name="views" type="number" min="0" defaultValue="0" onChange={() => logFieldErrors.views && setLogFieldErrors((e) => ({ ...e, views: undefined }))}
                            className={`w-full h-12 px-4 bg-zinc-900 border rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 transition-all ${logFieldErrors.views ? 'border-red-500/50 focus:ring-red-500/20' : 'border-zinc-800 focus:ring-emerald-500/20'}`} />
                          {logFieldErrors.views && <p className="mt-1.5 px-1 text-[10px] font-bold text-red-400">{logFieldErrors.views}</p>}
                        </div>
                        <div>
                          <label htmlFor="log-revenue" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Revenue ($) — optional</label>
                          <input id="log-revenue" name="revenue" type="number" min="0" step="0.01" placeholder="0.00" className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="log-title" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Video Title</label>
                        <input id="log-title" name="title" type="text" onChange={() => logFieldErrors.title && setLogFieldErrors((e) => ({ ...e, title: undefined }))} placeholder="e.g. Product review — Summer Collection"
                          className={`w-full h-12 px-4 bg-zinc-900 border rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 transition-all placeholder:text-zinc-700 ${logFieldErrors.title ? 'border-red-500/50 focus:ring-red-500/20' : 'border-zinc-800 focus:ring-emerald-500/20'}`} />
                        {logFieldErrors.title && <p className="mt-1.5 px-1 text-[10px] font-bold text-red-400">{logFieldErrors.title}</p>}
                      </div>
                      <div>
                        <label htmlFor="log-thumbnail" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Thumbnail URL — optional</label>
                        <input id="log-thumbnail" name="thumbnailUrl" type="url" placeholder="https://..." className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700" />
                      </div>
                    </>
                  )}
                  {logPlatform === 'YouTube' && (
                    <div>
                      <label htmlFor="log-revenue-yt" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Revenue ($) — optional</label>
                      <input id="log-revenue-yt" name="revenue" type="number" min="0" step="0.01" placeholder="0.00" className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700" />
                    </div>
                  )}
                  {logError && (
                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><p className="text-[10px] text-red-400 font-bold">{logError}</p>
                    </div>
                  )}
                </div>
                <div className="p-8 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-4">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-6 h-12 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">Cancel</button>
                  <button type="submit" disabled={isLogging} className="px-8 h-12 bg-emerald-500 text-black text-[10px] font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLogging ? 'Saving...' : 'Log Video'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REVIEW MODAL ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {reviewTarget && reviewingSnapshot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReviewTarget(null)} className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${reviewDecision === 'approved' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                    {reviewDecision === 'approved' ? <CheckCircle className="w-5 h-5 text-black" /> : <XCircle className="w-5 h-5 text-white" />}
                  </div>
                  Review Analytics Snapshot
                </h3>
                <button type="button" onClick={() => setReviewTarget(null)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"><X className="w-6 h-6 text-zinc-500" /></button>
              </div>
              <div className="p-8 space-y-5">
                {/* Context */}
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${PLATFORM_COLORS[reviewingSnapshot.platform]}`}>{reviewingSnapshot.platform}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase">{reviewingSnapshot.snapshotLabel}</span>
                    <span className="text-sm font-bold text-zinc-100">{reviewingSnapshot.creatorName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                    {reviewingSnapshot.views !== undefined && <span>{fmt(reviewingSnapshot.views)} views</span>}
                    {reviewingSnapshot.likes !== undefined && <span>{fmt(reviewingSnapshot.likes)} likes</span>}
                    {reviewingSnapshot.orders !== undefined && <span>{fmt(reviewingSnapshot.orders)} orders</span>}
                  </div>
                  <a href={reviewingSnapshot.proofDriveLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-lime-300/70 hover:text-lime-300 font-medium">
                    <ExternalLink className="w-3 h-3 shrink-0" />View Drive Proof
                  </a>
                </div>

                {/* Decision */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Decision</label>
                  <div className="flex gap-3">
                    {(['approved', 'rejected'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setReviewDecision(s)}
                        className={`flex-1 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          reviewDecision === s
                            ? s === 'approved' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-100'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review note */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Note (optional)</label>
                  <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2}
                    placeholder="Any feedback or reason for rejection…"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none placeholder:text-zinc-700" />
                </div>

                {reviewError && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><p className="text-[10px] text-red-400 font-bold">{reviewError}</p>
                  </div>
                )}
              </div>
              <div className="p-8 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-4">
                <button type="button" onClick={() => setReviewTarget(null)} className="px-6 h-12 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={handleReview} disabled={isReviewing}
                  className={`px-8 h-12 text-[10px] font-bold rounded-2xl uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    reviewDecision === 'approved' ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-red-500 text-white hover:bg-red-400'
                  }`}>
                  {isReviewing ? 'Saving…' : reviewDecision === 'approved' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
