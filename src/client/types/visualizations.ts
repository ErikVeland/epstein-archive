export type TimelineEventType =
  | 'flight'
  | 'document'
  | 'arrest'
  | 'conviction'
  | 'testimony'
  | 'death'
  | (string & Record<never, never>);

export type TimelineSignificance =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | (string & Record<never, never>);

export interface TimelineVisualizationEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: TimelineEventType;
  people: string[];
  significance: TimelineSignificance;
  sources: string[];
}
