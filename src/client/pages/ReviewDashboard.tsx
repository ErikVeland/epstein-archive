import { useEffect, useState, useCallback } from 'react';
import { Shield, Check, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MentionQueueItem {
  id: number;
  entity_name: string;
  document_id: number;
  file_name: string;
  mention_context: string;
  confidence_score: number;
  signal_score: number;
}

interface ClaimQueueItem {
  id: number;
  subject_entity_id: number;
  predicate: string;
  object_text: string;
  confidence: number;
  signal_score: number;
  file_name: string;
}

export function ReviewDashboard() {
  const [activeTab, setActiveTab] = useState<'mentions' | 'claims'>('mentions');
  const [mentions, setMentions] = useState<MentionQueueItem[]>([]);
  const [claims, setClaims] = useState<ClaimQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'mentions') {
        const res = await fetch('/api/review/mentions/queue?limit=50');
        setMentions(await res.json());
      } else {
        const res = await fetch('/api/review/claims/queue?limit=50');
        setClaims(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const verifyItem = async (id: number, type: 'mentions' | 'claims') => {
    try {
      await fetch(`/api/review/${type}/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Remove from list
      if (type === 'mentions') setMentions((p) => p.filter((x) => x.id !== id));
      else setClaims((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const rejectItem = async (id: number, type: 'mentions' | 'claims') => {
    const reason = prompt('Reason for rejection?');
    if (!reason) return;
    try {
      await fetch(`/api/review/${type}/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      if (type === 'mentions') setMentions((p) => p.filter((x) => x.id !== id));
      else setClaims((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen app-backdrop p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-[2.5rem] leading-none font-display font-light tracking-tight text-[var(--accent)] flex items-center gap-4 mb-3">
              <Shield className="h-8 w-8 text-[var(--accent)] opacity-80" strokeWidth={1} />
              Active Learning Review
            </h1>
            <p className="text-lg text-[var(--text-muted)] font-light tracking-wide">
              Verify high-signal extractions to train the system.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 mb-6 px-2">
          <button
            onClick={() => setActiveTab('mentions')}
            className={`pb-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 relative ${activeTab === 'mentions' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            Entity Mentions
            {activeTab === 'mentions' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`pb-3 text-sm font-semibold tracking-wider uppercase transition-all duration-300 relative ${activeTab === 'claims' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            Claims & Facts
            {activeTab === 'claims' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
            )}
          </button>
        </div>

        <div className="bg-[var(--glass-bg)]/30 backdrop-blur-xl rounded-[var(--radius-xl)] shadow-[var(--glass-shadow-soft)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[var(--text-muted)]">Loading queue...</div>
          ) : (
            <div className="divide-y divide-[var(--glass-border)]">
              {activeTab === 'mentions' &&
                mentions.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 flex items-start gap-4 hover:bg-[var(--glass-bg-strong)] transition-all duration-300 group hover:translate-x-1 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-bold text-lg text-[var(--text-primary)]">
                          {item.entity_name}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${item.confidence_score > 0.8 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}
                        >
                          Conf: {(item.confidence_score * 100).toFixed(0)}%
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
                          Signal: {(item.signal_score * 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] mb-4 font-mono leading-relaxed bg-black/20 p-4 rounded-lg shadow-inner">
                        "...{item.mention_context}..."
                      </p>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium tracking-wide">
                        Source:{' '}
                        <span className="text-[var(--text-secondary)]">{item.file_name}</span>
                        <Link
                          to={`/evidence/${item.document_id}`}
                          className="ml-2 hover:text-[var(--accent)] transition-colors inline-block hover:-translate-y-0.5 transform"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => verifyItem(item.id, 'mentions')}
                        className="p-2.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_15px_rgba(34,197,94,0.4)] transition-all transform hover:scale-110"
                        title="Verify"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => rejectItem(item.id, 'mentions')}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_15px_rgba(239,68,68,0.4)] transition-all transform hover:scale-110"
                        title="Reject"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

              {activeTab === 'claims' &&
                claims.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 flex items-start gap-4 hover:bg-[var(--glass-bg-strong)] transition-all duration-300 group hover:translate-x-1 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-bold text-lg text-[var(--accent)] font-mono uppercase tracking-[0.1em]">
                          {item.predicate}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${item.confidence > 0.8 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}
                        >
                          Conf: {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[1.1rem] text-[var(--text-primary)] mb-5 font-light tracking-wide leading-relaxed">
                        <span className="font-medium text-[var(--text-secondary)] tracking-tight">
                          Subject (ID {item.subject_entity_id})
                        </span>{' '}
                        <span className="opacity-70 mx-1">
                          {item.predicate.toLowerCase().replace(/_/g, ' ')}
                        </span>{' '}
                        <span className="font-medium bg-[var(--accent)]/10 border border-[var(--accent)]/20 shadow-[var(--glass-shadow-soft)] text-[var(--accent)] px-2 py-0.5 rounded-md inline-block -translate-y-px">
                          {item.object_text}
                        </span>
                      </p>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium tracking-wide">
                        Source:{' '}
                        <span className="text-[var(--text-secondary)]">{item.file_name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => verifyItem(item.id, 'claims')}
                        className="p-2.5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_15px_rgba(34,197,94,0.4)] transition-all transform hover:scale-110"
                        title="Verify"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => rejectItem(item.id, 'claims')}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_5px_15px_rgba(239,68,68,0.4)] transition-all transform hover:scale-110"
                        title="Reject"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

              {(activeTab === 'mentions' ? mentions : claims).length === 0 && (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center shadow-[var(--glass-shadow-soft)] mb-6 text-[var(--accent)]">
                    <Check className="w-8 h-8 opacity-70" />
                  </div>
                  <h3 className="text-xl font-display text-[var(--text-primary)] mb-2">
                    Queue is Empty
                  </h3>
                  <p className="text-[var(--text-muted)] max-w-sm">
                    All pending items for this queue have been verified or rejected. Great work.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
