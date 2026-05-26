import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { CheckCircle, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Platform = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Twitter' | 'Threads';

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'TikTok',    label: 'TikTok' },
  { id: 'Instagram', label: 'Instagram' },
  { id: 'YouTube',   label: 'YouTube' },
  { id: 'Facebook',  label: 'Facebook' },
  { id: 'Twitter',   label: 'Twitter / X' },
  { id: 'Threads',   label: 'Threads' },
];

// ── Field definitions (mirrors FormFieldsRef.jsx) ─────────────────────────────

interface FieldDef {
  id: number;
  key: string;
  label: string;
  type: string;
  required: boolean;
  icon: string;
  placeholder?: string;
  note: string;
}

const FIELDS: FieldDef[] = [
  {
    id: 1, key: 'creatorId', label: 'Creator Name', type: 'SEARCH',
    required: true, icon: '◈',
    note: 'Select the creator this post belongs to.',
  },
  {
    id: 2, key: 'platform', label: 'Platform', type: 'MULTIPLE CHOICE',
    required: true, icon: '◉',
    note: 'Pick the platform where this specific post lives.',
  },
  {
    id: 3, key: 'contentUrl', label: 'Post Link', type: 'URL',
    required: true, icon: '◎',
    placeholder: 'https://instagram.com/reel/...',
    note: 'Direct link to the post. Not the profile — the actual post.',
  },
  {
    id: 4, key: 'datePosted', label: 'Date Posted', type: 'DATE',
    required: true, icon: '◷',
    placeholder: 'YYYY-MM-DD',
    note: 'The date it went live — not today\'s date if logging late.',
  },
  {
    id: 5, key: 'driveLink', label: 'Raw Footage (Drive Link)', type: 'URL',
    required: false, icon: '◫',
    placeholder: 'https://drive.google.com/...',
    note: 'Link to their Drive folder with the raw clip. Optional but encouraged.',
  },
  {
    id: 6, key: 'notes', label: 'Notes', type: 'PARAGRAPH',
    required: false, icon: '◌',
    placeholder: 'First collab, boosted post, tried a new hook...',
    note: 'Anything the admin should know. Context that won\'t show in the numbers.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function SubmitLinkView({ campaign }: { campaign: 'Afina' | 'Sigma' }) {
  const creators = useQuery(api.creators.list, { campaign }) ?? [];
  const createSubmission = useMutation(api.submissions.create);

  // Form state
  const [selectedCreatorId, setSelectedCreatorId] = useState<Id<'creators'> | null>(null);
  const [creatorSearch, setCreatorSearch]           = useState('');
  const [showDropdown, setShowDropdown]             = useState(false);
  const [platform, setPlatform]                     = useState<Platform | null>(null);
  const [contentUrl, setContentUrl]                 = useState('');
  const [datePosted, setDatePosted]                 = useState('');
  const [driveLink, setDriveLink]                   = useState('');
  const [notes, setNotes]                           = useState('');

  // UI state
  const [activeField, setActiveField] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);

  const filteredCreators = creatorSearch.trim()
    ? creators.filter((c) =>
        c.name.toLowerCase().includes(creatorSearch.toLowerCase()) ||
        c.discordHandle.toLowerCase().includes(creatorSearch.toLowerCase())
      )
    : creators.slice(0, 8);

  const isValid = !!selectedCreatorId && !!platform && contentUrl.trim() && datePosted.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !selectedCreatorId || !platform) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createSubmission({
        creatorId: selectedCreatorId,
        platform,
        contentUrl: contentUrl.trim(),
        datePosted: datePosted || undefined,
        driveLink: driveLink.trim() || undefined,
        notes: notes.trim() || undefined,
        campaign,
      });
      setSuccessCount((n) => n + 1);
      setSelectedCreatorId(null);
      setCreatorSearch('');
      setPlatform(null);
      setContentUrl('');
      setDatePosted('');
      setDriveLink('');
      setNotes('');
      setActiveField(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Field value display helper ─────────────────────────────────────────────

  function fieldHasValue(key: string): boolean {
    switch (key) {
      case 'creatorId':   return !!selectedCreatorId;
      case 'platform':    return !!platform;
      case 'contentUrl':  return !!contentUrl.trim();
      case 'datePosted':  return !!datePosted.trim();
      case 'driveLink':   return !!driveLink.trim();
      case 'notes':       return !!notes.trim();
      default: return false;
    }
  }

  // ── Render each field's input ───────────────────────────────────────────────

  function renderFieldInput(field: FieldDef) {
    switch (field.key) {

      case 'creatorId':
        if (selectedCreator) {
          return (
            <div className="flex items-center gap-3 h-10 px-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="w-6 h-6 rounded bg-lime-300/10 border border-lime-300/20 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-lime-300">{selectedCreator.name[0]?.toUpperCase()}</span>
              </div>
              <span className="text-sm text-zinc-100 font-medium flex-1">{selectedCreator.name}</span>
              <span className="text-[10px] text-zinc-600 font-medium">@{selectedCreator.discordHandle}</span>
              <button
                type="button"
                onClick={() => { setSelectedCreatorId(null); setCreatorSearch(''); }}
                className="text-zinc-600 hover:text-zinc-300 transition-colors ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
        return (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="text"
                value={creatorSearch}
                onChange={(e) => { setCreatorSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name or @handle…"
                className="w-full h-10 pl-9 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-lime-300/40 transition-colors"
              />
            </div>
            <AnimatePresence>
              {showDropdown && filteredCreators.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-10 top-full mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
                >
                  {filteredCreators.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => {
                        setSelectedCreatorId(c.id as Id<'creators'>);
                        setCreatorSearch('');
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 transition-colors text-left"
                    >
                      <span className="text-sm text-zinc-200 font-medium">{c.name}</span>
                      <span className="text-[10px] text-zinc-600">@{c.discordHandle}</span>
                      <span className="ml-auto text-[9px] text-zinc-700 uppercase tracking-widest">{c.tier}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'platform':
        return (
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`px-3 h-8 rounded-lg text-[11px] font-bold border tracking-wide transition-all ${
                  platform === p.id
                    ? 'bg-lime-300/10 border-lime-300/40 text-lime-300'
                    : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        );

      case 'contentUrl':
        return (
          <input
            type="url"
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
            placeholder={field.placeholder}
            className="w-full h-10 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-lime-300/40 transition-colors font-medium"
          />
        );

      case 'datePosted':
        return (
          <input
            type="date"
            value={datePosted}
            onChange={(e) => setDatePosted(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full h-10 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-lime-300/40 transition-colors font-medium [color-scheme:dark]"
          />
        );

      case 'driveLink':
        return (
          <input
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder={field.placeholder}
            className="w-full h-10 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-lime-300/40 transition-colors font-medium"
          />
        );

      case 'notes':
        return (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-lime-300/40 transition-colors font-medium resize-none"
          />
        );

      default: return null;
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div style={{ maxWidth: 680, marginBottom: 48 }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] tracking-[0.3em] text-zinc-600 uppercase font-medium">Creator Performance Hub</span>
          <div className="flex-1 h-px bg-zinc-900" />
          {successCount > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-lime-300" />
              <span className="text-[10px] text-lime-300 font-bold tracking-widest uppercase">{successCount} logged</span>
            </div>
          )}
        </div>
        <h2 className="text-3xl font-normal tracking-tight text-zinc-100 leading-tight mt-4 mb-3">
          Log a<br />
          <span className="text-lime-300">Submission</span>
        </h2>
        <p className="text-[13px] text-zinc-600 leading-relaxed max-w-sm">
          Six fields. Under two minutes. Log every post, every time.
          This is the only thing standing between the work and the data.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-0.5 mb-8">
          {FIELDS.map((field) => {
            const isActive = activeField === field.id;
            const hasValue = fieldHasValue(field.key);

            return (
              <div
                key={field.id}
                onClick={() => setActiveField(isActive ? null : field.id)}
                className={`relative border rounded-sm cursor-pointer transition-all duration-150 overflow-hidden ${
                  isActive
                    ? 'bg-zinc-900/60 border-zinc-800'
                    : 'bg-transparent border-zinc-900 hover:border-zinc-800'
                }`}
              >
                {/* Left accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 bg-lime-300 transition-all duration-200 ${
                    isActive ? 'w-[3px]' : 'w-0'
                  }`}
                />

                {/* Field header */}
                <div className="flex items-start justify-between gap-4 px-6 py-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Number */}
                    <span className="text-[11px] text-zinc-700 tabular-nums shrink-0 font-medium">
                      0{field.id}
                    </span>
                    {/* Icon */}
                    <span className={`text-lg leading-none shrink-0 transition-colors duration-150 ${
                      isActive ? 'text-lime-300' : 'text-zinc-700'
                    }`}>
                      {field.icon}
                    </span>
                    {/* Label */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[15px] transition-colors duration-150 ${
                        isActive ? 'text-zinc-100' : hasValue ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-[9px] text-lime-300 tracking-[0.15em] uppercase font-bold">REQ</span>
                      )}
                      {hasValue && !isActive && (
                        <span className="text-[9px] text-lime-300/60 tracking-[0.1em] uppercase">✓</span>
                      )}
                    </div>
                  </div>
                  {/* Type badge */}
                  <span className="text-[10px] text-zinc-700 tracking-[0.1em] uppercase whitespace-nowrap shrink-0 pt-0.5">
                    {field.type}
                  </span>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-6 pb-5 pt-1 pl-[calc(24px+11px+16px+20px)]">
                        {renderFieldInput(field)}
                        <p className="text-[12px] text-zinc-600 leading-relaxed mt-3">
                          {field.note}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-900">
          <span className="text-[11px] text-zinc-700 tracking-[0.1em] uppercase">
            4 REQUIRED · 2 OPTIONAL
          </span>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={`flex items-center gap-2 px-8 h-11 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${
              isValid && !isSubmitting
                ? 'bg-lime-300 text-zinc-950 hover:bg-lime-200 shadow-[0_0_24px_rgba(163,230,53,0.25)]'
                : 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <><span className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-zinc-950 rounded-full animate-spin" /> Logging…</>
            ) : (
              'Log Submission'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
