import { User, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { Person } from '../../types';
import { RedFlagIndex } from '../visualizations/RedFlagIndex';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';

interface SearchResult {
  person: Person;
  matchingContexts: Person['contexts'];
  matchingPassages: NonNullable<Person['significantPassages']>;
  score: number;
}

interface EvidenceResultCardProps {
  result: SearchResult;
  onPersonClick: (person: Person) => void;
}

export function EvidenceResultCard({ result, onPersonClick }: EvidenceResultCardProps) {
  return (
    <Surface
      variant="glass"
      className="overflow-hidden border-white/5 transition-all hover:border-white/20"
    >
      {/* Person Header */}
      <Box className="bg-gradient-to-r from-white/5 to-transparent px-4 py-3 border-b border-white/5">
        <button
          onClick={() => onPersonClick(result.person)}
          className="group block text-left w-full mb-2"
          title="Click to view full profile"
        >
          <LqText
            variant="h3"
            weight="bold"
            className="group-hover:text-[var(--accent)] transition-colors truncate"
          >
            {result.person.name}
          </LqText>
        </button>

        <Flex direction="column" justify="between" gap={8} className="md:flex-row md:items-center">
          <Flex align="center" gap={8} className="flex-wrap">
            <User size={16} className="text-[var(--accent)] hidden md:block" />
            <Box
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                result.person.likelihoodScore === 'HIGH'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : result.person.likelihoodScore === 'MEDIUM'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}
            >
              <LqText variant="xs" weight="bold">
                {result.person.likelihoodScore}
              </LqText>
            </Box>
            {result.person.redFlagRating !== undefined && (
              <RedFlagIndex
                value={result.person.redFlagRating}
                size="sm"
                variant="combined"
                showTextLabel={false}
              />
            )}
          </Flex>

          <Flex align="center" gap={12}>
            <Flex align="center" gap={4} className="text-white/40">
              <LqText variant="xs" color="muted">
                {result.person.mentions?.toLocaleString()} mentions
              </LqText>
              <Box className="w-1 h-1 rounded-full bg-white/20" />
              <LqText variant="xs" color="muted">
                {result.person.files} files
              </LqText>
            </Flex>
            <AddToInvestigationButton
              item={{
                id: result.person.id?.toString() || '',
                title: result.person.name,
                description: result.person.role || 'Person of interest',
                type: 'entity',
                sourceId: result.person.id?.toString() || '',
              }}
              variant="quick"
              className="hover:bg-white/10"
            />
          </Flex>
        </Flex>
      </Box>

      {/* Evidence Types */}
      <Box className="p-4 border-b border-white/5">
        <Flex gap={8} className="flex-wrap">
          {result.person.evidenceTypes.map((type, i) => (
            <Box
              key={i}
              className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] text-white/60 font-medium uppercase tracking-wider"
            >
              {type.replace('_', ' ')}
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Matching Contexts */}
      {result.matchingContexts.length > 0 && (
        <Box className="p-4 border-b border-white/5 bg-white/[0.01]">
          <Flex align="center" gap={8} className="mb-3">
            <FileText size={14} className="text-white/40" />
            <LqText variant="small" weight="bold" color="muted">
              CONTEXTS ({result.matchingContexts.length})
            </LqText>
          </Flex>

          <Box className="space-y-3">
            {result.matchingContexts.map((context, i) => (
              <Surface key={i} variant="glass" className="p-3 bg-white/2 space-y-2">
                <LqText
                  variant="small"
                  color="primary"
                  className="leading-relaxed italic opacity-90"
                >
                  &quot;{context.context}&quot;
                </LqText>
                <Flex align="center" gap={8} className="opacity-40">
                  <FileText size={12} className="shrink-0" />
                  <LqText variant="xs" className="truncate">
                    {context.file}
                  </LqText>
                  {context.date !== 'Unknown' && (
                    <>
                      <Box className="w-1 h-1 rounded-full bg-white/40" />
                      <Calendar size={12} />
                      <LqText variant="xs">{context.date}</LqText>
                    </>
                  )}
                </Flex>
              </Surface>
            ))}
          </Box>
        </Box>
      )}

      {/* Matching Red Flag Passages */}
      {result.matchingPassages.length > 0 && (
        <Box className="p-4 bg-red-500/[0.03]">
          <Flex align="center" gap={8} className="mb-3">
            <AlertTriangle size={14} className="text-red-400" />
            <LqText variant="small" weight="bold" className="text-red-400 uppercase tracking-wider">
              KEY PASSAGES ({result.matchingPassages.length})
            </LqText>
          </Flex>

          <Box className="space-y-3">
            {result.matchingPassages.map((passage, i) => (
              <Surface
                key={i}
                variant="glass"
                className="p-3 bg-red-500/5 border-red-500/10 space-y-2"
              >
                <LqText variant="small" className="text-red-100 leading-relaxed font-medium">
                  &quot;{passage.passage}&quot;
                </LqText>
                <Flex align="center" gap={8}>
                  <Box className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/20 rounded text-[9px] font-bold text-red-300 uppercase">
                    {passage.keyword}
                  </Box>
                  <Box className="w-1 h-1 rounded-full bg-red-500/20" />
                  <LqText variant="xs" className="text-red-400/60 truncate">
                    {passage.filename}
                  </LqText>
                </Flex>
              </Surface>
            ))}
          </Box>
        </Box>
      )}
    </Surface>
  );
}
