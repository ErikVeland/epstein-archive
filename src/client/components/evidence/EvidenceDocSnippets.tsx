import DOMPurify from 'isomorphic-dompurify';
import { FileText, Info, File } from 'lucide-react';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';

interface DocSnippet {
  id: number;
  title: string;
  redFlagRating: number;
  snippet?: string;
}

interface EvidenceDocSnippetsProps {
  snippets: DocSnippet[];
  searchTerm: string;
}

export function EvidenceDocSnippets({ snippets, searchTerm }: EvidenceDocSnippetsProps) {
  if (snippets.length === 0) {
    return null;
  }

  return (
    <Surface variant="glass" className="overflow-hidden border-white/5">
      <Box className="bg-gradient-to-r from-white/5 to-transparent px-4 py-3 border-b border-white/5">
        <Flex align="center" gap={8}>
          <FileText size={18} className="text-[var(--accent)]" />
          <LqText variant="h3" weight="bold">
            Matched Documents
          </LqText>
          <LqText variant="small" color="muted" className="ml-1 opacity-50">
            ({snippets.length})
          </LqText>
        </Flex>
      </Box>

      <Box className="p-4 space-y-4">
        <Flex align="start" gap={8} className="opacity-50 mb-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          <LqText variant="xs">Documents containing &quot;{searchTerm}&quot;</LqText>
        </Flex>

        {snippets.map((d) => (
          <Surface
            key={d.id}
            variant="glass"
            className="p-4 bg-white/[0.02] border-white/5 transition-all hover:border-white/10"
          >
            <Flex justify="between" align="start" className="mb-3">
              <LqText variant="small" weight="bold" color="accent" className="truncate pr-4">
                {d.title}
              </LqText>
              <Box
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  d.redFlagRating >= 4
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : d.redFlagRating >= 2
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                RISK: {d.redFlagRating}
              </Box>
            </Flex>

            {d.snippet && (
              <Box
                className="text-xs p-3 rounded bg-black/20 border-l-2 border-[var(--accent)]/50 mb-3 font-mono leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(d.snippet, {
                    ALLOWED_TAGS: ['mark'],
                    ALLOWED_ATTR: ['class'],
                  }),
                }}
              />
            )}

            <Flex align="center" gap={12} className="opacity-40">
              <Flex align="center" gap={6}>
                <File size={12} />
                <LqText variant="xs" weight="medium">
                  {(d.title || '').split('.').pop()?.toUpperCase() || 'FILE'}
                </LqText>
              </Flex>
            </Flex>
          </Surface>
        ))}
      </Box>
    </Surface>
  );
}
