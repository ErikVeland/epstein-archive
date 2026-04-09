export type EventType =
  | 'arrest'
  | 'conviction'
  | 'death'
  | 'flight'
  | 'testimony'
  | 'document'
  | 'meeting'
  | 'email'
  | 'legal'
  | 'financial'
  | 'incident'
  | 'other';
export type Significance = 'high' | 'medium' | 'low' | 'critical';

export interface BaseTimelineEvent {
  id: string;
  date: string | Date;
  title: string;
  description: string;
  type: EventType;
  significance: Significance;
  sources: string[];
}

export interface TimelineVisualizationEvent extends BaseTimelineEvent {
  people: string[];
}
