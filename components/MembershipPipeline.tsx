'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, RefreshCw, ChevronDown, Check, X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Types ── */
type AppStatus = 'pending' | 'approved' | 'rejected';

interface Application {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  date_of_birth: string | null;
  source: string | null;
  experience: string | null;
  motivation: string | null;
  status: AppStatus;
  created_at: string;
}

/* ── Helpers ── */
const STATUS_STYLES: Record<AppStatus, string> = {
  pending:  'border-amber-400/50 bg-amber-50 text-amber-700',
  approved: 'border-green-500/40 bg-green-50 text-green-700',
  rejected: 'border-[#e8d5d5] bg-[#fdf6f6] text-[#7a4a4a]/60',
};

const STATUS_ICONS: Record<AppStatus, React.ReactNode> = {
  pending:  <Clock size={10} />,
  approved: <Check size={10} />,
  rejected: <X size={10} />,
};

const STATUS_LABELS: Record<AppStatus, string> = {
  pending:  'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Application card ── */
function AppCard({
  app,
  onStatusChange,
}: {
  app: Application;
  onStatusChange: (id: string, status: AppStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState<AppStatus | null>(null);

  async function handleAction(status: AppStatus) {
    setUpdating(status);
    await onStatusChange(app.id, status);
    setUpdating(null);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-[#e8d5d5] overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#fdf6f6] transition-colors duration-150"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-[#731515]/8 flex items-center justify-center shrink-0 text-[#731515] text-sm font-medium" style={{ fontFamily: 'var(--font-syne)' }}>
          {app.name.charAt(0).toUpperCase()}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#1a0505] leading-snug" style={{ fontFamily: 'var(--font-syne)' }}>
            {app.name}
          </div>
          <div className="text-[11px] text-[#7a4a4a]/60 truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
            {app.email}
          </div>
        </div>

        {/* Meta */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {app.city && (
            <span className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
              {app.city}
            </span>
          )}
          <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
            {formatDate(app.created_at)}
          </span>
        </div>

        {/* Status badge */}
        <div className={`inline-flex items-center gap-1 text-[8px] tracking-[0.2em] px-2 py-1 border shrink-0 ${STATUS_STYLES[app.status]}`}>
          {STATUS_ICONS[app.status]}
          {STATUS_LABELS[app.status]}
        </div>

        {/* Chevron */}
        <ChevronDown
          size={14}
          className={`text-[#7a4a4a]/40 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[#e8d5d5] pt-4 flex flex-col gap-4">

              {/* Detail grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'EMAIL',        value: app.email },
                  { label: 'PHONE',        value: app.phone },
                  { label: 'CITY',         value: app.city },
                  { label: 'DATE OF BIRTH', value: app.date_of_birth },
                  { label: 'HOW THEY HEARD', value: app.source },
                  { label: 'SUBMITTED',    value: formatDate(app.created_at) },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">{label}</div>
                    <div className="text-xs text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>{value}</div>
                  </div>
                ) : null)}
              </div>

              {/* Long text fields */}
              {app.experience && (
                <div>
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1.5">WINE EXPERIENCE</div>
                  <p className="text-xs text-[#7a4a4a] leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {app.experience}
                  </p>
                </div>
              )}
              {app.motivation && (
                <div>
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1.5">MOTIVATION</div>
                  <p className="text-xs text-[#7a4a4a] leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {app.motivation}
                  </p>
                </div>
              )}

              {/* Action buttons — only for pending */}
              {app.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAction('approved')}
                    disabled={!!updating}
                    className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-4 py-2.5 bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <Check size={11} />
                    {updating === 'approved' ? 'APPROVING…' : 'APPROVE'}
                  </button>
                  <button
                    onClick={() => handleAction('rejected')}
                    disabled={!!updating}
                    className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-4 py-2.5 border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <X size={11} />
                    {updating === 'rejected' ? 'REJECTING…' : 'REJECT'}
                  </button>
                </div>
              )}

              {/* Undo button for approved/rejected */}
              {app.status !== 'pending' && (
                <div>
                  <button
                    onClick={() => handleAction('pending')}
                    disabled={!!updating}
                    className="text-[9px] tracking-[0.2em] text-[#7a4a4a]/50 hover:text-[#731515] disabled:opacity-40 transition-colors duration-200"
                  >
                    {updating === 'pending' ? 'RESETTING…' : '↩ RESET TO PENDING'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Filter tabs ── */
type Filter = 'all' | AppStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',      label: 'ALL' },
  { id: 'pending',  label: 'PENDING' },
  { id: 'approved', label: 'APPROVED' },
  { id: 'rejected', label: 'REJECTED' },
];

/* ── Main component ── */
export default function MembershipPipeline() {
  const [apps, setApps]         = useState<Application[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState<Filter>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load applications');
      setApps(json.applications ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id: string, status: AppStatus) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update');
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating application');
    }
  }

  const counts = {
    all:      apps.length,
    pending:  apps.filter((a) => a.status === 'pending').length,
    approved: apps.filter((a) => a.status === 'approved').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
  };

  const filtered = filter === 'all' ? apps : apps.filter((a) => a.status === filter);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center shrink-0">
            <Users size={15} className="text-[#731515]" />
          </div>
          <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">MEMBERSHIP PIPELINE</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
              {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all duration-200"
            aria-label="Refresh"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {(['pending', 'approved', 'rejected'] as AppStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`p-4 border text-left transition-colors duration-200 ${
              filter === s ? 'border-[#731515]/40 bg-[#731515]/5' : 'border-[#e8d5d5] bg-white hover:border-[#731515]/20'
            }`}
          >
            <div className="text-[8px] tracking-[0.3em] text-[#7a4a4a]/50 mb-1">
              {STATUS_LABELS[s]}
            </div>
            <div
              className={`text-2xl font-light ${
                s === 'pending' ? 'text-amber-700' : s === 'approved' ? 'text-green-700' : 'text-[#7a4a4a]/50'
              }`}
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {counts[s]}
            </div>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#e8d5d5]">
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`text-[9px] tracking-[0.2em] px-4 py-2.5 transition-colors duration-200 border-b-2 -mb-px ${
              filter === tab.id
                ? 'border-[#731515] text-[#731515]'
                : 'border-transparent text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
            }`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {tab.label}
            <span className="ml-1 opacity-50">({counts[tab.id]})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && apps.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
          Loading applications…
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-xs text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            No {filter === 'all' ? '' : filter} applications yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onStatusChange={handleStatusChange}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
