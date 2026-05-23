import React, { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Upload, FileText, CheckCircle, AlertCircle, X,
  ChevronRight, Users, RefreshCw, Link as LinkIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import Papa from 'papaparse';

// ── Types ─────────────────────────────────────────────────────────────────────

type Platform = 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook';
type ImportMode = 'creators' | 'submissions';
type Step = 'upload' | 'preview' | 'done';

interface ParsedCreator {
  discordHandle: string;
  name: string;
  profile: {
    realName?: string;
    email?: string;
    phone?: string;
    location?: string;
    niche?: string;
    contentFormat?: string;
    toneVibe?: string;
    postingFrequency?: string;
  };
  accounts: { platform: Platform; handle: string; url: string }[];
  _row: number;
}

interface ParsedSubmission {
  creatorDiscordHandle: string;
  contentUrl: string;
  platform: Platform;
  notes?: string;
  _row: number;
  _error?: string;
}

// ── File parsing helpers ──────────────────────────────────────────────────────

async function fileToRows(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      complete: (result) => resolve(result.data as string[][]),
      error: (err) => reject(err),
      skipEmptyLines: false,
    });
  });
}

// ── Creator parsing ───────────────────────────────────────────────────────────

function extractHandle(url: string, platform: Platform): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (platform === 'YouTube' || platform === 'TikTok' || platform === 'Instagram') {
      const seg = parts.find((p) => p.startsWith('@')) ?? parts[parts.length - 1] ?? '';
      return seg.startsWith('@') ? seg : `@${seg}`;
    }
    return parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}

function urlToAccount(url: string, platform: Platform) {
  const clean = url.trim();
  if (!clean || clean === '-') return null;
  return { platform, handle: extractHandle(clean, platform), url: clean };
}

function parseCreatorRows(rows: string[][]): ParsedCreator[] {
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const lower = rows[i].map((c) => String(c).toLowerCase().trim());
    if (lower.some((c) => c.includes('creator name'))) {
      headerIdx = i;
      headers = lower;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const col = (name: string) => headers.findIndex((h) => h.includes(name));
  const colCreatorName   = col('creator name');
  const colRealName      = col('real name');
  const colEmail         = col('email');
  const colPhone         = col('phone');
  const colLocation      = col('location');
  const colYouTube       = col('youtube');
  const colInstagram     = col('instagram');
  const colTikTok        = col('tiktok');
  const colFacebook      = col('facebook');
  const colNiche         = col('niche') !== -1 ? col('niche') : col('primary');
  const colFormat        = col('format') !== -1 ? col('format') : col('content format');
  const colTone          = col('tone');
  const colFrequency     = col('frequency') !== -1 ? col('frequency') : col('posting');

  const results: ParsedCreator[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols.some((c) => String(c).trim())) continue;

    const raw = (idx: number) => (idx >= 0 ? String(cols[idx] ?? '').trim() : '');
    const rawHandle = raw(colCreatorName);
    if (!rawHandle) continue;

    const discordHandle = rawHandle.startsWith('@') ? rawHandle.slice(1) : rawHandle;
    const realName = raw(colRealName);

    const accounts: ParsedCreator['accounts'] = [];
    const addAcc = (url: string, p: Platform) => { const a = urlToAccount(url, p); if (a) accounts.push(a); };
    addAcc(raw(colYouTube), 'YouTube');
    addAcc(raw(colInstagram), 'Instagram');
    addAcc(raw(colTikTok), 'TikTok');
    addAcc(raw(colFacebook), 'Facebook');

    results.push({
      discordHandle,
      name: realName || discordHandle,
      profile: {
        realName: realName || undefined,
        email: raw(colEmail) || undefined,
        phone: raw(colPhone) || undefined,
        location: raw(colLocation) || undefined,
        niche: raw(colNiche) || undefined,
        contentFormat: raw(colFormat) || undefined,
        toneVibe: raw(colTone) || undefined,
        postingFrequency: raw(colFrequency) || undefined,
      },
      accounts,
      _row: i + 1,
    });
  }

  return results;
}

// ── Submission parsing ────────────────────────────────────────────────────────

const PLATFORM_PATTERNS: [Platform, RegExp][] = [
  ['YouTube',   /youtube\.com|youtu\.be/i],
  ['TikTok',    /tiktok\.com/i],
  ['Instagram', /instagram\.com/i],
  ['Facebook',  /facebook\.com|fb\.com/i],
];

function detectPlatform(url: string): Platform | null {
  for (const [p, re] of PLATFORM_PATTERNS) {
    if (re.test(url)) return p;
  }
  return null;
}

function parseSubmissionRows(rows: string[][]): ParsedSubmission[] {
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const lower = rows[i].map((c) => String(c).toLowerCase().trim());
    if (lower.some((c) => c.includes('link') || c.includes('url') || c.includes('content'))) {
      headerIdx = i;
      headers = lower;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const col = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));
  const colLink     = col(['link', 'url', 'content url', 'video']);
  const colCreator  = col(['creator', 'discord', 'handle', 'username']);
  const colPlatform = col(['platform']);
  const colNotes    = col(['notes', 'description', 'comment']);

  if (colLink === -1 || colCreator === -1) return [];

  const results: ParsedSubmission[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols.some((c) => String(c).trim())) continue;

    const raw = (idx: number) => (idx >= 0 ? String(cols[idx] ?? '').trim() : '');
    const contentUrl = raw(colLink);
    let handle = raw(colCreator);
    if (!contentUrl || !handle) continue;

    handle = handle.startsWith('@') ? handle.slice(1) : handle;

    // Determine platform: from explicit column, then auto-detect from URL
    let platform: Platform | null = null;
    if (colPlatform !== -1) {
      const rawPlatform = raw(colPlatform);
      const platformMap: Record<string, Platform> = {
        youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook',
        yt: 'YouTube', tt: 'TikTok', ig: 'Instagram', fb: 'Facebook',
      };
      platform = platformMap[rawPlatform.toLowerCase()] ?? null;
    }
    if (!platform) platform = detectPlatform(contentUrl);

    if (!platform) {
      results.push({ creatorDiscordHandle: handle, contentUrl, platform: 'TikTok', notes: raw(colNotes) || undefined, _row: i + 1, _error: 'Unknown platform — defaulted to TikTok' });
    } else {
      results.push({ creatorDiscordHandle: handle, contentUrl, platform, notes: raw(colNotes) || undefined, _row: i + 1 });
    }
  }

  return results;
}

// ── Profile cleaner ───────────────────────────────────────────────────────────

function cleanProfile(p: ParsedCreator['profile']): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v && typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ACCEPT = '.csv';

export function ImportView({ campaign }: { campaign: 'Afina' | 'Sigma' }) {
  const bulkImportCreators    = useMutation(api.creators.bulkImport);
  const bulkImportSubmissions = useMutation(api.submissions.bulkImport);

  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode]               = useState<ImportMode>('creators');
  const [step, setStep]               = useState<Step>('upload');
  const [fileName, setFileName]       = useState('');
  const [parseError, setParseError]   = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [parsedCreators,    setParsedCreators]    = useState<ParsedCreator[]>([]);
  const [parsedSubmissions, setParsedSubmissions] = useState<ParsedSubmission[]>([]);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors?: string[] } | null>(null);

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      setParseError('Please upload a .csv file. Export from Google Sheets or Excel as CSV first.');
      return;
    }
    setParseError(null);
    setFileName(file.name);

    try {
      const rows = await fileToRows(file);

      if (mode === 'creators') {
        const data = parseCreatorRows(rows);
        if (data.length === 0) {
          setParseError('Could not find a "Creator Name" column. Ensure the sheet has the right headers.');
          return;
        }
        setParsedCreators(data);
      } else {
        const data = parseSubmissionRows(rows);
        if (data.length === 0) {
          setParseError('Could not find Link/Creator columns. Expected headers like "Link", "Creator", "Platform".');
          return;
        }
        setParsedSubmissions(data);
      }
      setStep('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file.');
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (isImporting) return;
    setIsImporting(true);
    setImportError(null);
    try {
      if (mode === 'creators') {
        const payload = parsedCreators.map(({ discordHandle, name, profile, accounts }) => ({
          discordHandle, name, profile: cleanProfile(profile), accounts,
        }));
        const result = await bulkImportCreators({ campaign, creators: payload });
        setImportResult(result);
      } else {
        const payload = parsedSubmissions.map(({ creatorDiscordHandle, contentUrl, platform, notes }) => ({
          creatorDiscordHandle, contentUrl, platform, notes,
        }));
        const result = await bulkImportSubmissions({ campaign, submissions: payload });
        setImportResult(result);
      }
      setStep('done');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setStep('upload');
    setFileName('');
    setParsedCreators([]);
    setParsedSubmissions([]);
    setParseError(null);
    setImportResult(null);
    setImportError(null);
  }

  function switchMode(m: ImportMode) {
    setMode(m);
    reset();
  }

  const count = mode === 'creators' ? parsedCreators.length : parsedSubmissions.length;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Upload className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Bulk Import</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              CSV · Excel · Google Sheets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            Importing into: {campaign}
          </span>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {(['creators', 'submissions'] as ImportMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex items-center gap-2 px-5 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              mode === m
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-zinc-500 hover:text-zinc-100'
            }`}
          >
            {m === 'creators' ? <Users className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
            {m === 'creators' ? 'Creator Roster' : 'Video Submissions'}
          </button>
        ))}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['upload', 'preview', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              step === s ? 'bg-emerald-500 text-black' :
              (step === 'preview' && s === 'upload') || step === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-zinc-800 text-zinc-600'
            }`}>
              {i + 1}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${step === s ? 'text-zinc-100' : 'text-zinc-600'}`}>
              {s === 'upload' ? 'Upload File' : s === 'preview' ? 'Preview & Confirm' : 'Done'}
            </span>
            {i < 2 && <ChevronRight className="w-3 h-3 text-zinc-700" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Instructions */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {mode === 'creators' ? 'Expected columns (Creator Roster)' : 'Expected columns (Video Submissions)'}
            </p>
            {mode === 'creators' ? (
              <p className="text-xs text-zinc-400 font-medium">
                <span className="text-emerald-400 font-bold">Creator Name</span> · Real Name · Email · Phone · Location · YouTube · Instagram · TikTok · Facebook · Niche · Content Format · Tone · Posting Frequency
              </p>
            ) : (
              <p className="text-xs text-zinc-400 font-medium">
                <span className="text-emerald-400 font-bold">Link</span> (video URL) ·{' '}
                <span className="text-emerald-400 font-bold">Creator</span> (Discord handle) ·{' '}
                Platform · Notes
              </p>
            )}
            <p className="text-[10px] text-zinc-600 font-medium mt-1">
              Accepts .csv — export from Google Sheets (File → Download → CSV) or Excel (Save As → CSV)
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 rounded-2xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group bg-zinc-900/20 hover:bg-emerald-500/5"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 group-hover:bg-emerald-500/10 border border-zinc-700 group-hover:border-emerald-500/30 flex items-center justify-center transition-all">
              <FileText className="w-6 h-6 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-300">Drop your file here or click to browse</p>
              <p className="text-xs text-zinc-600 mt-1 font-medium">CSV only — export from Google Sheets or Excel as CSV first</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {parseError && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 font-bold">{parseError}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold text-zinc-300">{fileName}</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                {count} {mode === 'creators' ? 'creators' : 'submissions'} found
              </span>
            </div>
            <button onClick={reset} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-colors">
              <X className="w-3.5 h-3.5" /> Change file
            </button>
          </div>

          {/* Preview table — Creators */}
          {mode === 'creators' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60">
                      {['Discord Handle', 'Name', 'Niche', 'Platforms', 'Posting'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {parsedCreators.slice(0, 50).map((c) => (
                      <tr key={c._row} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-emerald-400 whitespace-nowrap">@{c.discordHandle}</td>
                        <td className="px-4 py-2.5 text-zinc-200 whitespace-nowrap">{c.name}</td>
                        <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{c.profile.niche || '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {c.accounts.map((a) => (
                              <span key={a.platform} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase">
                                {a.platform.slice(0, 2)}
                              </span>
                            ))}
                            {c.accounts.length === 0 && <span className="text-zinc-600">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{c.profile.postingFrequency || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedCreators.length > 50 && (
                <div className="px-4 py-3 border-t border-zinc-800 text-center">
                  <p className="text-[10px] text-zinc-600 font-medium">Showing first 50 of {parsedCreators.length} creators</p>
                </div>
              )}
            </div>
          )}

          {/* Preview table — Submissions */}
          {mode === 'submissions' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60">
                      {['Creator Handle', 'Platform', 'Link', 'Notes', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {parsedSubmissions.slice(0, 50).map((s) => (
                      <tr key={s._row} className={`hover:bg-zinc-800/20 transition-colors ${s._error ? 'bg-yellow-500/5' : ''}`}>
                        <td className="px-4 py-2.5 font-bold text-emerald-400 whitespace-nowrap">@{s.creatorDiscordHandle}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase">{s.platform}</span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 max-w-[240px] truncate">{s.contentUrl}</td>
                        <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">{s.notes || '—'}</td>
                        <td className="px-4 py-2.5">
                          {s._error && (
                            <span className="text-[9px] text-yellow-500 font-bold">{s._error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedSubmissions.length > 50 && (
                <div className="px-4 py-3 border-t border-zinc-800 text-center">
                  <p className="text-[10px] text-zinc-600 font-medium">Showing first 50 of {parsedSubmissions.length} submissions</p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {mode === 'creators' ? (
                <>
                  <p className="text-xs font-bold text-zinc-300">Creators will be imported as <span className="text-yellow-400">Bronze tier</span> with 1% commission.</p>
                  <p className="text-xs text-zinc-500 font-medium">Duplicates (matched by Discord handle) are skipped. Tiers can be updated after import.</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-zinc-300">Submissions will be created with <span className="text-yellow-400">pending</span> status awaiting review.</p>
                  <p className="text-xs text-zinc-500 font-medium">Rows with unknown creator handles will be skipped. Make sure creators are already in the database.</p>
                </>
              )}
            </div>
          </div>

          {importError && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 font-bold">{importError}</p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button onClick={reset} className="px-6 h-11 text-[10px] font-bold text-zinc-500 hover:text-zinc-100 uppercase tracking-widest transition-all">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-8 h-11 bg-emerald-500 text-black text-[10px] font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest disabled:opacity-50"
            >
              {isImporting
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing…</>
                : mode === 'creators'
                  ? <><Users className="w-3.5 h-3.5" /> Import {count} Creators</>
                  : <><LinkIcon className="w-3.5 h-3.5" /> Import {count} Submissions</>
              }
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && importResult && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">Import Complete</h3>
            <p className="text-zinc-500 mt-2 font-medium">
              {mode === 'creators' ? 'Creator roster imported successfully.' : 'Submissions added to the review queue.'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-emerald-400">{importResult.created}</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Created</p>
            </div>
            <div className="w-px h-12 bg-zinc-800" />
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-zinc-500">{importResult.skipped}</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Skipped</p>
            </div>
          </div>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="w-full max-w-md p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-left space-y-1">
              <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-2">Skipped rows</p>
              {importResult.errors.slice(0, 10).map((e, i) => (
                <p key={i} className="text-xs text-zinc-500 font-medium">{e}</p>
              ))}
              {importResult.errors.length > 10 && (
                <p className="text-xs text-zinc-600 font-medium">…and {importResult.errors.length - 10} more</p>
              )}
            </div>
          )}
          <button
            onClick={reset}
            className="px-8 h-11 bg-zinc-800 text-zinc-100 text-[10px] font-bold rounded-xl hover:bg-zinc-700 transition-all uppercase tracking-widest"
          >
            Import Another File
          </button>
        </motion.div>
      )}
    </div>
  );
}
