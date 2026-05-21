/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Settings as SettingsIcon, Shield, Bell, Smartphone, ExternalLink, Users, Check, AlertCircle } from 'lucide-react';

type Role = 'admin' | 'manager' | 'viewer';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'System Super Admin',
  manager: 'Manager',
  viewer: 'Viewer (Read Only)',
};

const ROLE_OPTIONS: Role[] = ['admin', 'manager', 'viewer'];

export function SettingsView() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.me);
  const allUsers = useQuery(api.users.listAll);
  const updateRole = useMutation(api.users.updateRole);

  const displayName = user?.fullName || user?.firstName || 'Unknown';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const role = (currentUser?.role ?? 'viewer') as Role;
  const isAdmin = role === 'admin';

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.firstName?.[0]?.toUpperCase() ?? '?';

  // Per-user role-save state
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});

  function setPendingRole(userId: string, newRole: Role) {
    setPendingRoles((prev) => ({ ...prev, [userId]: newRole }));
    setSavedUserId(null);
    setRoleError(null);
  }

  async function handleSaveRole(userId: string) {
    const newRole = pendingRoles[userId];
    if (!newRole) return;
    setSavingUserId(userId);
    setRoleError(null);
    try {
      await updateRole({ userId: userId as Id<'users'>, role: newRole });
      setSavedUserId(userId);
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setTimeout(() => setSavedUserId(null), 2000);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">System Settings</h2>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Account and operational configuration</p>
        </div>
      </div>

      {/* Account */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-2">
          <h3 className="text-sm font-bold text-zinc-200">Account Configuration</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">Your identity and access level within the system.</p>
        </div>
        <div className="col-span-2">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={displayName} className="w-16 h-16 rounded-2xl object-cover border border-zinc-800" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-zinc-800 flex items-center justify-center text-xl font-bold text-emerald-400">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-zinc-200">{displayName}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{email}</p>
                <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest font-bold">
                  Managed by Clerk — edit profile at clerk.com
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Display Name</label>
                <div className="w-full h-10 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-300 flex items-center">
                  {displayName}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Access Role</label>
                <div className="w-full h-10 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-400 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  {ROLE_LABEL[role]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Management — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-zinc-800">
          <div className="col-span-1 space-y-2">
            <h3 className="text-sm font-bold text-zinc-200">Team Management</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">Manage role assignments for all system users.</p>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 mt-2">
              <Users className="w-3.5 h-3.5" />
              Admin access only
            </div>
          </div>
          <div className="col-span-2">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              {allUsers === undefined ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-zinc-800/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : allUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No team members found</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {allUsers.map((u) => {
                    const isSelf = u.clerkId === currentUser?.clerkId;
                    const pending = pendingRoles[u.id];
                    const effectiveRole = (pending ?? u.role) as Role;
                    const hasChange = !!pending;

                    return (
                      <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-200">
                              {u.name}
                              {isSelf && <span className="ml-2 text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">(You)</span>}
                            </p>
                            <p className="text-[10px] text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {savedUserId === u.id && (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <select
                            value={effectiveRole}
                            disabled={isSelf || savingUserId === u.id}
                            onChange={(e) => setPendingRole(u.id, e.target.value as Role)}
                            className={`h-8 px-3 border rounded-lg text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                              hasChange
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                            }`}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                            ))}
                          </select>
                          {hasChange && !isSelf && (
                            <button
                              onClick={() => handleSaveRole(u.id)}
                              disabled={savingUserId === u.id}
                              className="h-8 px-3 bg-emerald-500 text-black text-[10px] font-bold rounded-lg hover:bg-emerald-400 transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                              {savingUserId === u.id ? '…' : 'Save'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {roleError && (
                <div className="px-6 py-3 border-t border-zinc-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[10px] text-red-400 font-bold">{roleError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Keys */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-zinc-800">
        <div className="col-span-1 space-y-2">
          <h3 className="text-sm font-bold text-zinc-200">External API Keys</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">Platform integrations for content and GMV tracking.</p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 mt-2">
            <Smartphone className="w-3.5 h-3.5" />
            Configure in your Convex dashboard
          </div>
        </div>
        <div className="col-span-2">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
            {[
              { name: 'TikTok Shop API', connected: false },
              { name: 'Instagram Graph API', connected: false },
              { name: 'YouTube Data API V3', connected: false },
            ].map((apiItem, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-200">{apiItem.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono tracking-widest italic">Not configured</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-zinc-800 border-zinc-700 text-zinc-500">
                    Pending
                  </div>
                  <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-zinc-800">
        <div className="col-span-1 space-y-2">
          <h3 className="text-sm font-bold text-zinc-200">Notifications</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">System event alerts — coming in a future update.</p>
        </div>
        <div className="col-span-2">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
            <div className="space-y-4">
              {[
                { label: 'GMV Win Events', desc: 'Notify when a creator hits a daily GMV win threshold.' },
                { label: 'System Interventions', desc: 'Notify when a team member logs a high-impact adjustment.' },
                { label: 'Weekly Performance Digest', desc: 'Email a summary of tier shifts and ranking changes.' },
              ].map((pref, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-zinc-400">{pref.label}</p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{pref.desc}</p>
                  </div>
                  <div className="w-10 h-5 bg-zinc-800 border border-zinc-700 rounded-full relative cursor-not-allowed opacity-50" title="Coming soon">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-zinc-600 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center border-t border-zinc-800 pt-4">Notification preferences — Phase 8</p>
          </div>
        </div>
      </div>
    </div>
  );
}
