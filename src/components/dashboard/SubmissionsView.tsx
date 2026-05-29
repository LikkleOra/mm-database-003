import { useState, FormEvent } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator } from '../../types';
import {
  Inbox, CheckCircle, XCircle, Clock, ExternalLink,
  Plus, X, AlertCircle, Tag, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CONTENT_TAGS = [
  'Rage Bait', 'Storytelling', 'Shock Hook', 'Luxury Flex',
  'Curiosity', 'Authority', 'Tutorial', 'Review', 'Unboxing', 'Trending Audio',
];

const PLATFORM_COLORS: Record<string, string> = {
  TikTok:    'bg-pink-500/10 border-pink-500/20 text-pink-400',
  Instagram: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  YouTube:   'bg-red-500/10 border-red-500/20 text-red-400',
  Facebook:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
  Twitter:   'bg-sky-500/10 border-sky-500/20 text-sky-400',
  Threads:   'bg-zinc-700/30 border-zinc-600/30 text-zinc-400',
};

const STATUS_TABS = [
  { id: undefined, label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const;

type StatusFilter = 'pending' | 'approved' | 'rejected' | undefined;

interface Props {
  userRole: 'admin' | 'manager' | 'viewer';
  creators: Creator[];
  activeCreatorIds: Set<string>;
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

export function SubmissionsView({ userRole, creators, activeCreatorIds }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const submissionsData = useQuery(api.submissions.list, { status: statusFilter });
  const countsData = useQuery(api.submissions.counts);
  const createSubmission = useMutation(api.submissions.create);
  const reviewSubmission = useMutation(api.submissions.review);

  const canWrite = userRole === 'admin' || userRole === 'manager';
  const canReview = userRole === 'admin' || userRole === 'manager';

  const isLoading = submissionsData === undefined;
  const submissions = (submissionsData ?? []).filter((s) => activeCreatorIds.has(s.creatorId));
  const counts = countsData ?? { pending: 0, approved: 0, rejected: 0 };

  // Submit modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    const fd = new FormData(e.currentTarget);
    const creatorId = fd.get('creatorId') as string;
    const platform = fd.get('platform') as 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Twitter' | 'Threads';
    const contentUrl = (fd.get('contentUrl') as string).trim();
    const campaignRaw = (fd.get('campaign') as string).trim();
    const campaign = (campaignRaw === 'Afina' || campaignRaw === 'Sigma') ? campaignRaw : undefined;
    const contentTypeRaw = (fd.get('contentType') as string).trim();
    const contentType = (['talking_head', 'ai_content', 'slides'].includes(contentTypeRaw) ? contentTypeRaw : undefined) as 'talking_head' | 'ai_content' | 'slides' | undefined;
    const affiliateLink = (fd.get('affiliateLink') as string).trim() || undefined;
    const notes = (fd.get('notes') as string).trim() || undefined;

    if (!creatorId || !contentUrl) {
      setSubmitError('Creator and content URL are required.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await createSubmission({ creatorId: creatorId as Id<'creators'>, platform, contentUrl, campaign, contentType, affiliateLink, notes });
      setShowSubmitModal(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReview() {
    if (isReviewing || !reviewTarget) return;
    setIsReviewing(true);
    setReviewError(null);
    try {
      await reviewSubmission({
        submissionId: reviewTarget as Id<'submissions'>,
        status: reviewStatus,
        reviewNote: reviewNote.trim() || undefined,
        contentTags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setReviewTarget(null);
      setReviewNote('');
      setSelectedTags([]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  function openReview(id: string, defaultStatus: 'approved' | 'rejected' = 'approved') {
    setReviewTarget(id);
    setReviewStatus(defaultStatus);
    setReviewNote('');
    setSelectedTags([]);
    setReviewError(null);
  }

  const reviewingSubmission = submissions.find((s) => s.id === reviewTarget);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Submissions</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              {counts.pending > 0 ? `${counts.pending} pending review` : 'Review queue'}
            </p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => { setSubmitError(null); setShowSubmitModal(true); }}
            className="flex items-center gap-2 h-9 px-4 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" />
            New Submission
          </button>
        )}
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Approved', value: counts.approved, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-2xl p-5 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{s.label}</p>
            </div>
            <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={String(tab.id)}
            onClick={() => setStatusFilter(tab.id as StatusFilter)}
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
      {!isLoading && submissions.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-center">
          <Inbox className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm font-bold text-zinc-500">No submissions</p>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            {canWrite ? 'Use "New Submission" to add the first entry.' : 'Submissions will appear here once creators post content.'}
          </p>
        </div>
      )}

      {/* Submissions list */}
      {!isLoading && submissions.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-zinc-800/50">
            {submissions.map((sub, idx) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(idx, 20) * 0.03 }}
                className="flex items-start gap-4 p-4 hover:bg-zinc-800/20 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${PLATFORM_COLORS[sub.platform] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                      {sub.platform}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                      sub.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                      sub.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {sub.status}
                    </span>
                    {(sub as any).contentType && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-lime-300/10 border border-lime-300/20 text-lime-300 uppercase tracking-widest">
                        {(sub as any).contentType === 'talking_head' ? 'Talking Head' : (sub as any).contentType === 'ai_content' ? 'AI Content' : 'Slides'}
                      </span>
                    )}
                    {sub.contentTags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-zinc-100">{sub.creatorName}
                    <span className="ml-2 text-[10px] text-zinc-600 font-medium">{sub.creatorTier}</span>
                  </p>
                  <a
                    href={sub.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 font-medium truncate max-w-sm"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {sub.contentUrl}
                  </a>
                  {(sub as any).datePosted && (
                    <p className="text-[10px] text-zinc-500 font-medium">
                      Posted: <span className="text-zinc-400">{(sub as any).datePosted}</span>
                    </p>
                  )}
                  {(sub as any).driveLink && (
                    <a
                      href={(sub as any).driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-lime-300/70 hover:text-lime-300 font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Drive footage
                    </a>
                  )}
                  {sub.campaign && (
                    <p className="text-[10px] text-zinc-500 font-medium">Campaign: <span className="text-zinc-400">{sub.campaign}</span></p>
                  )}
                  {sub.notes && (
                    <p className="text-[10px] text-zinc-500 italic">&ldquo;{sub.notes}&rdquo;</p>
                  )}
                  {sub.reviewNote && (
                    <p className="text-[10px] text-zinc-500 font-medium">Review note: <span className="text-zinc-400">{sub.reviewNote}</span></p>
                  )}
                  <p className="text-[9px] text-zinc-600 font-medium">{timeAgo(sub.submittedAt)}</p>
                </div>

                {canReview && sub.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0 mt-1">
                    <button
                      onClick={() => openReview(sub.id, 'approved')}
                      className="flex items-center gap-1.5 h-8 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-all uppercase tracking-widest"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => openReview(sub.id, 'rejected')}
                      className="flex items-center gap-1.5 h-8 px-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* New Submission Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSubmitModal(false)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <form onSubmit={handleSubmit} noValidate>
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <Inbox className="w-5 h-5 text-black" />
                    </div>
                    Log Submission
                  </h3>
                  <button type="button" onClick={() => setShowSubmitModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-zinc-500" />
                  </button>
                </div>
                <div className="p-8 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Creator</label>
                      <select name="creatorId" defaultValue="" className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer">
                        <option value="" disabled>Select…</option>
                        {creators.filter((c) => c.isActive).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Platform</label>
                      <select name="platform" defaultValue="TikTok" className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer">
                        <option value="TikTok">TikTok</option>
                        <option value="Instagram">Instagram</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Twitter">Twitter / X</option>
                        <option value="Threads">Threads</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Content URL</label>
                    <input name="contentUrl" type="url" placeholder="https://..." className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700" />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Campaign (optional)</label>
                      <select name="campaign" defaultValue="" className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer">
                        <option value="">— none —</option>
                        <option value="Afina">Afina</option>
                        <option value="Sigma">Sigma</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Affiliate Link (optional)</label>
                      <input name="affiliateLink" type="url" placeholder="https://..." className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Content Type (optional)</label>
                    <select name="contentType" defaultValue="" className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer">
                      <option value="">— unset —</option>
                      <option value="talking_head">Talking Head</option>
                      <option value="ai_content">AI Content</option>
                      <option value="slides">Slides</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Notes (optional)</label>
                    <textarea name="notes" rows={2} placeholder="Any context about this submission…" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none placeholder:text-zinc-700" />
                  </div>
                  {submitError && (
                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-400 font-bold">{submitError}</p>
                    </div>
                  )}
                </div>
                <div className="p-8 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-4">
                  <button type="button" onClick={() => setShowSubmitModal(false)} className="px-6 h-12 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-8 h-12 bg-emerald-500 text-black text-[10px] font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest disabled:opacity-50">
                    {isSubmitting ? 'Submitting…' : 'Log Submission'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewTarget && reviewingSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setReviewTarget(null)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${reviewStatus === 'approved' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                    {reviewStatus === 'approved' ? <CheckCircle className="w-5 h-5 text-black" /> : <XCircle className="w-5 h-5 text-white" />}
                  </div>
                  Review Submission
                </h3>
                <button type="button" onClick={() => setReviewTarget(null)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <div className="p-8 space-y-5">
                {/* Context */}
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${PLATFORM_COLORS[reviewingSubmission.platform]}`}>{reviewingSubmission.platform}</span>
                    <span className="text-sm font-bold text-zinc-100">{reviewingSubmission.creatorName}</span>
                  </div>
                  <a href={reviewingSubmission.contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 font-medium truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {reviewingSubmission.contentUrl}
                  </a>
                </div>

                {/* Decision toggle */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Decision</label>
                  <div className="flex gap-3">
                    {(['approved', 'rejected'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setReviewStatus(s)}
                        className={`flex-1 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          reviewStatus === s
                            ? s === 'approved'
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                              : 'bg-red-500/20 border-red-500/50 text-red-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-100'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content tags */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> Content Pattern Tags (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TAGS.map((tag) => (
                      <button key={tag} type="button"
                        onClick={() => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-100'
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review note */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Feedback Note (optional)</label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    placeholder="Add feedback for the creator or internal notes…"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none placeholder:text-zinc-700"
                  />
                </div>

                {reviewError && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-400 font-bold">{reviewError}</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-4">
                <button type="button" onClick={() => setReviewTarget(null)} className="px-6 h-12 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">Cancel</button>
                <button
                  onClick={handleReview}
                  disabled={isReviewing}
                  className={`px-8 h-12 text-[10px] font-bold rounded-2xl transition-all uppercase tracking-widest disabled:opacity-50 ${
                    reviewStatus === 'approved'
                      ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-red-500 text-white hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                  }`}>
                  {isReviewing ? 'Saving…' : reviewStatus === 'approved' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
