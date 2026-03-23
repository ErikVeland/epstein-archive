import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Eye, Clock } from 'lucide-react';

interface ReviewItem {
  id: string;
  type: string;
  subjectId: string;
  ingestRunId: string;
  status: 'pending' | 'reviewed' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  payloadJson: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  notes?: string;
  createdAt: string;
}

export const ReviewQueuePanel: React.FC = () => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/admin/review-queue');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDecision = async (id: string, decision: 'reviewed' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/review-queue/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, notes: reviewNote }),
      });
      if (res.ok) {
        setItems(items.filter((item) => item.id !== id));
        setSelectedId(null);
        setReviewNote('');
      }
    } catch (err) {
      console.error('Decision failed:', err);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-[var(--text-muted)] animate-pulse">Loading forensics queue...</div>
    );

  return (
    <div className="bg-[var(--glass-bg-strong)]/50 backdrop-blur-md border border-[var(--glass-border)] rounded-[var(--radius-xl)] overflow-hidden">
      <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Agentic Review Queue
          </h2>
        </div>
        <span className="bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full text-xs font-mono">
          {items.length} PENDING
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
        {/* List Pane */}
        <div className="border-r border-[var(--glass-border)] overflow-y-auto max-h-[600px]">
          {items.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] flex flex-col items-center gap-2">
              <CheckCircle className="w-10 h-10 opacity-20" />
              <p>Queue Clear. All agentic transformations vetted.</p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full p-4 border-b border-[var(--glass-border)] text-left transition-colors hover:bg-[var(--glass-bg)]/50 ${
                  selectedId === item.id
                    ? 'bg-[var(--accent)]/10 border-l-4 border-l-indigo-500'
                    : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono text-[var(--text-muted)] uppercase">
                    {item.type}
                  </span>
                  {item.priority === 'high' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {item.subjectId}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail Pane */}
        <div className="md:col-span-2 p-6 overflow-y-auto max-h-[600px] bg-[var(--glass-bg-strong)]/30">
          {selectedId ? (
            (() => {
              const item = items.find((i) => i.id === selectedId);
              if (!item) return null;
              return (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">
                        {item.type.replace('_', ' ').toUpperCase()}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] font-mono mt-1">
                        ID: {item.id}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Baseline (Before)
                      </label>
                      <pre className="bg-slate-950 p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] text-xs font-mono text-[var(--text-muted)] overflow-x-auto">
                        {JSON.stringify(item.payloadJson.before, null, 2)}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">
                        Agentic Output (After)
                      </label>
                      <pre className="bg-slate-950 p-4 rounded-[var(--radius-lg)] border border-indigo-900/30 text-xs font-mono text-indigo-100 overflow-x-auto shadow-inner shadow-indigo-500/5">
                        {JSON.stringify(item.payloadJson.after, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-[var(--glass-bg)]/20 p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">
                      Automated Evidence Notes
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)] italic">"{item.notes}"</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                    <textarea
                      placeholder="Add forensic review notes..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="w-full bg-slate-950 border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-3 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors h-24"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision(item.id, 'reviewed')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-[var(--text-primary)] py-2 rounded-[var(--radius-lg)] font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-5 h-5" />
                        VET & COMMIT
                      </button>
                      <button
                        onClick={() => handleDecision(item.id, 'rejected')}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-[var(--text-primary)] py-2 rounded-[var(--radius-lg)] font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                        REJECT & PURGE
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)] flex-col gap-3 opacity-50">
              <Eye className="w-12 h-12" />
              <p>Select an item to begin forensic review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
