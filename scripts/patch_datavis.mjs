import fs from 'fs';

const file = 'src/client/components/visualizations/DataVisualization.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Define strict AnalyticsData interface
const strictInterface = `interface AnalyticsData {
  totalEntities?: number;
  totalMentions?: number;
  averageRedFlagRating?: number;
  totalUniqueRoles?: number;
  roleDistribution?: Array<{ role?: string; count?: number }>;
  activeInvestigations?: number;
  likelihoodDistribution?: Array<{ level?: string; count?: number }>;
  redFlagDistribution?: Array<{ rating?: number | string; count?: number }>;
  riskByType?: Array<{ riskLevel?: number | string; count?: number }>;
  topEntities?: Array<any>;
  topConnectedEntities?: Array<any>;
}

interface DataVisualizationProps`;

code = code.replace(/interface DataVisualizationProps/, strictInterface);

// 2. Fix props
code = code.replace(/analyticsData\?\: any;/g, 'analyticsData?: AnalyticsData;');

// 3. Fix Tooltip
code = code.replace(/CustomTooltip = \(\{ active, payload, label \}\: any\) =>/g, "CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; fill?: string; name?: string; value: number }>; label?: string }) =>");
code = code.replace(/payload\.map\(\(entry\: any, index\: number\)/g, "payload.map((entry: { color?: string; fill?: string; name?: string; value: number }, index: number)");

// 4. Remove redundant 'any' in map/filter/reduce since AnalyticsData provides type context
code = code.replace(/\(d\: any\)/g, "(d)");
code = code.replace(/\(acc\: number, curr\: any\)/g, "(acc, curr)");
code = code.replace(/\(entry\: any/g, "(entry: Record<string, unknown>");
code = code.replace(/\(entry: Record<string, unknown>, index\: number\)/g, "(entry: any, index: number)"); // revert specific ones to not break inner loops, we'll patch them explicitly

// 5. Fix topEntities mapping
code = code.replace(/\.map\(\(p\: any\) => \(\{/g, ".map((p: any) => ({");

fs.writeFileSync(file, code);
console.log('Patched DataVisualization.tsx');
