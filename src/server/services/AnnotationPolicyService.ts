import type { AuthRequest } from '../auth/middleware.js';

export type AnnotationWritePolicy = {
  scope: 'public' | 'forensic';
  reviewState: 'draft' | 'approved' | 'rejected';
  actorUserId: string | null;
  actorRole: string | null;
  authorLabel: string;
};

const FORENSIC_WRITER_ROLES = new Set(['admin', 'investigator']);

const toSafePublicHandle = (rawAuthor: string | null | undefined): string => {
  const cleaned = (rawAuthor || '').trim().slice(0, 32);
  return cleaned ? cleaned : 'anonymous';
};

export const AnnotationPolicyService = {
  decideWrite(req: AuthRequest): AnnotationWritePolicy {
    const user = req.user;
    const actorRole = user?.role || null;
    const actorUserId = user?.id || null;
    const isForensicWriter = Boolean(actorRole && FORENSIC_WRITER_ROLES.has(actorRole));

    if (isForensicWriter) {
      return {
        scope: 'forensic',
        reviewState: 'approved',
        actorUserId,
        actorRole,
        authorLabel: toSafePublicHandle(
          user?.username || (user?.id ? `user-${user.id.slice(0, 8)}` : null),
        ),
      };
    }

    return {
      scope: 'public',
      reviewState: 'draft',
      actorUserId,
      actorRole,
      authorLabel: toSafePublicHandle(
        user?.username || (user?.id ? `user-${user.id.slice(0, 8)}` : null),
      ),
    };
  },

  canReadForensic(req: AuthRequest): boolean {
    return req.user?.role === 'admin' || req.user?.role === 'investigator';
  },

  canReadDrafts(req: AuthRequest): boolean {
    return req.user?.role === 'admin';
  },
};
