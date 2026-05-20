// ============================================================================
// TYPES — interfaces, classes, and enums used across the ingest pipeline
// ============================================================================

export interface ErrorSummary {
  type: string;
  count: number;
  lastMessage: string;
  lastTimestamp: number;
}

export interface IngestAuditLog {
  documentId?: number;
  documentPath?: string;
  action: string;
  outcome: 'success' | 'warning' | 'error';
  details?: string;
  timestamp: number;
}

export interface CollectionConfig {
  name: string;
  rootPath: string;
  description: string;
  enabled: boolean;
}

export interface UnredactionResult {
  pdfPath: string;
  unredactedSpans?: any[]; // Raw JSON from script
}

export interface EmailMetadata {
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  messageId?: string;
  error?: string;
  [key: string]: unknown;
}

export interface PipelineAudit {
  recordError(type: string, message: string): void;
  log(action: IngestAuditLog): void;
  printErrorSummary(): void;
  getErrorCounts(): Record<string, number>;
  getRecentLogs(count?: number): IngestAuditLog[];
}

export class PipelineAuditImpl implements PipelineAudit {
  private errors: Map<string, ErrorSummary> = new Map();
  private auditLog: IngestAuditLog[] = [];
  private maxLogSize = 1000;
  private maxErrorSize = 100;

  recordError(type: string, message: string) {
    const existing = this.errors.get(type);
    if (existing) {
      existing.count++;
      existing.lastMessage = message;
      existing.lastTimestamp = Date.now();
    } else {
      if (this.errors.size < this.maxErrorSize) {
        this.errors.set(type, {
          type,
          count: 1,
          lastMessage: message,
          lastTimestamp: Date.now(),
        });
      }
    }
  }

  log(action: IngestAuditLog) {
    this.auditLog.push(action);
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }
  }

  printErrorSummary() {
    if (this.errors.size === 0) {
      console.log('\n✅ No errors recorded during pipeline run.');
      return;
    }

    console.log('\n⚠️  Pipeline Error Summary:');
    const sorted = Array.from(this.errors.values()).sort((a, b) => b.count - a.count);
    for (const err of sorted) {
      console.log(`   [${err.type}] ${err.count}x - Last: ${err.lastMessage.slice(0, 80)}`);
    }
  }

  getErrorCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [type, summary] of this.errors) {
      counts[type] = summary.count;
    }
    return counts;
  }

  getRecentLogs(count = 10): IngestAuditLog[] {
    return this.auditLog.slice(-count);
  }
}
