/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Creator } from '../../types';
import {
  MessageSquare, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronDown, Link,
} from 'lucide-react';
import { motion } from 'motion/react';

const PLATFORM_COLORS: Record<string, string> = {
  TikTok:    'bg-pink-500/10 border-pink-500/20 text-pink-400',
  YouTube:   'bg-red-500/10 border-red-500/20 text-red-400',
  Instagram: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  Facebook:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
};

interface DiscordTrackingViewProps {
  creators: Creator[];
  userRole: 'admin' | 'manager' | 'viewer';
}

export function DiscordTrackingView({ creators, userRole }: DiscordTrackingViewProps) {
  const events = useQuery(api.discord.listEvents);
  const assignSubmission = useMutation(api.discord.assignSubmission);

  const isLoading = events === undefined;
  const canWrite = userRole === 'admin' || userRole === 'manager';

  // Assign-modal state
  const [assigningEventId, setAssigningEventId] = useState<string | null>(null);
  const [assignCreatorId, setAssignCreatorId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const submissions = (events ?? []).filter((e) => e.type === 'video_submission');
  const matched   = submissions.filter((e) => e.payload?.matched === true).length;
  const unmatched = submissions.filter((e) => e.payload?.matched === false).length;

  async function handleAssign(eventId: string) {
    if (!assignCreatorId || isAssigning) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      await assignSubmission({
        eventId:   eventId as Id<'discord_events'>,
        creatorId: assignCreatorId as Id<'creators'>,
      });
      setAssigningEventId(null);
      setAssignCreatorId('');
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign.');
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Discord Tracking</h2>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
            Bot-captured video submissions from creator channels
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Submissions', value: isLoading ? '—' : submissions.length, color: 'text-zinc-100' },
          { label: 'Matched to Creator', value: isLoading ? '—' : matched, color: 'text-emerald-400' },
          { label: 'Unmatched / Review', value: isLoading ? '—' : unmatched, color: 'text-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Submissions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-center">
          <MessageSquare className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm font-bold text-zinc-500">No submissions yet</p>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs font-medium">
            Once the bot is running and a creator posts a video link in the submission channel, it will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-zinc-800/50">
            {submissions.map((event, idx) => {
              const p = event.payload as Record<string, unknown>;
              const isMatched   = p?.matched === true;
              const platform    = (p?.platform as string) ?? 'Unknown';
              const username    = (p?.discordUsername as string) ?? event.discordUserId;
              const videoUrl    = (p?.videoUrl as string) ?? null;
              const creatorName = (p?.creatorName as string) ?? null;
              const isExpanded  = assigningEventId === event.id;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx, 15) * 0.03 }}
                  className="p-4 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Status icon + creator info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {isMatched
                        ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        : <XCircle className="w-5 h-5 text-orange-400 shrink-0" />
                      }
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-zinc-200">@{username}</p>
                          {creatorName && isMatched && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              {creatorName}
                            </span>
                          )}
                        </div>
                        {videoUrl && (
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium truncate max-w-xs flex items-center gap-1 mt-0.5"
                          >
                            <Link className="w-3 h-3 shrink-0" />
                            {videoUrl}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right-side badges + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {platform !== 'Unknown' && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${PLATFORM_COLORS[platform] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                          {platform}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${
                        isMatched
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                      }`}>
                        {isMatched ? 'Matched' : 'Unmatched'}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      {/* Assign button — unmatched + admin/manager only */}
                      {!isMatched && canWrite && (
                        <button
                          onClick={() => {
                            setAssigningEventId(isExpanded ? null : event.id);
                            setAssignError(null);
                            setAssignCreatorId('');
                          }}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                            isExpanded
                              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-100'
                          }`}
                        >
                          Assign
                          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline assign panel */}
                  {isExpanded && (
                    <div className="mt-3 ml-8 flex items-center gap-3 flex-wrap">
                      <select
                        value={assignCreatorId}
                        onChange={(e) => setAssignCreatorId(e.target.value)}
                        className="h-9 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select creator…</option>
                        {creators.filter((c) => c.isActive).map((c) => (
                          <option key={c.id} value={c.id}>{c.name} (@{c.discordHandle})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(event.id)}
                        disabled={!assignCreatorId || isAssigning}
                        className="h-9 px-4 bg-indigo-500 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-400 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAssigning ? 'Assigning…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setAssigningEventId(null)}
                        className="h-9 px-3 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      {assignError && (
                        <p className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {assignError}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Setup checklist — always visible */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Bot Setup Checklist</p>
        <div className="space-y-3">
          {[
            { step: 'Discord Developer Portal → your app → Bot → enable "Message Content Intent"', done: false },
            { step: 'OAuth2 → URL Generator → scope: bot → permissions: Send Messages, Read Messages, Add Reactions → invite bot to server', done: false },
            { step: 'Right-click your #content-submissions channel → Copy Channel ID → paste into bot .env as DISCORD_SUBMISSION_CHANNEL_ID', done: false },
            { step: 'Generate a random BOT_SECRET and add it to both: bot .env AND Convex dashboard Environment Variables', done: false },
            { step: 'Add CONVEX_SITE_URL to bot .env (found in Convex dashboard → Settings → URL, ends in .convex.site)', done: false },
            { step: 'Run bot locally: cd discord-bot && npm install && npm run dev', done: false },
            { step: 'Creator Discord usernames must exactly match their discordHandle in the database', done: false },
            { step: 'Deploy bot to Railway: push repo → railway.app → New Project → Deploy from GitHub → set env vars', done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed">{item.step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
