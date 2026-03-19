import React from 'react';
import { Calendar, AlertTriangle, TrendingUp, FileText, Clock, User } from 'lucide-react';
import { Person } from '../../types';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'arrest' | 'conviction' | 'death' | 'flight' | 'testimony' | 'document' | 'meeting';
  people: string[];
  significance: 'high' | 'medium' | 'low';
  sources: string[];
}

interface TimelineVisualizationProps {
  people: Person[];
}

const timelineEvents: TimelineEvent[] = [
  {
    id: '1',
    date: '1997-01-05',
    title: 'Trump Flies on Epstein Plane',
    description:
      "Donald Trump travels on Jeffrey Epstein's private jet from Palm Beach to Newark. Flight logs confirm this single documented flight.",
    type: 'flight',
    people: ['Donald Trump', 'Jeffrey Epstein'],
    significance: 'medium',
    sources: ['EpsteinFlightLogs.pdf', 'HOUSE_OVERSIGHT_010486.txt'],
  },
  {
    id: '2',
    date: '2001-2003',
    title: "Clinton's Multiple Flights",
    description:
      'Bill Clinton takes 26 flights on Epstein\'s "Lolita Express" to various international destinations including Africa and Asia.',
    type: 'flight',
    people: ['Bill Clinton', 'Jeffrey Epstein'],
    significance: 'medium',
    sources: ['FlightLogsClinton.pdf', 'HOUSE_OVERSIGHT_012690.txt'],
  },
  {
    id: '3',
    date: '2001',
    title: 'Prince Andrew Photo Scandal',
    description:
      "Infamous photograph taken showing Prince Andrew with Virginia Roberts (age 17) in Ghislaine Maxwell's London apartment.",
    type: 'document',
    people: ['Prince Andrew', 'Virginia Roberts Giuffre', 'Ghislaine Maxwell'],
    significance: 'high',
    sources: ['AndrewPhoto.jpg', 'GiuffreTestimony.pdf'],
  },
  {
    id: '4',
    date: '2005',
    title: 'First Police Investigation',
    description:
      'Palm Beach Police begin investigating Epstein for sexual assault of minors. Multiple victims come forward.',
    type: 'arrest',
    people: ['Jeffrey Epstein'],
    significance: 'high',
    sources: ['PalmBeachPoliceReport.pdf', 'VictimStatements2005.txt'],
  },
  {
    id: '5',
    date: '2008-06',
    title: "Epstein's Sweetheart Deal",
    description:
      'Epstein pleads guilty to state charges, serves 13 months in county jail with work release. Controversial plea deal negotiated.',
    type: 'conviction',
    people: ['Jeffrey Epstein', 'Alexander Acosta'],
    significance: 'high',
    sources: ['PleaAgreement2008.pdf', 'AcostaEmails.txt'],
  },
  {
    id: '6',
    date: '2015',
    title: 'Giuffre Files Civil Suit',
    description:
      'Virginia Roberts Giuffre files civil lawsuit against Ghislaine Maxwell, alleging sex trafficking and defamation.',
    type: 'testimony',
    people: ['Virginia Roberts Giuffre', 'Ghislaine Maxwell'],
    significance: 'high',
    sources: ['GiuffreVMaxwell2015.pdf', 'CourtFilings2015.txt'],
  },
  {
    id: '7',
    date: '2018-03-21',
    title: 'Blackmail Email Exchange',
    description:
      'Mark Epstein emails Jeffrey: "Ask him if Putin has the photos of Trump blowing Bubba?" - suggesting knowledge of compromising material.',
    type: 'document',
    people: ['Mark Epstein', 'Jeffrey Epstein', 'Donald Trump'],
    significance: 'high',
    sources: ['HOUSE_OVERSIGHT_030716.txt'],
  },
  {
    id: '8',
    date: '2019-07-06',
    title: 'Epstein Arrested Again',
    description:
      'FBI arrests Epstein at Teterboro Airport on sex trafficking charges. Federal indictment unsealed in New York.',
    type: 'arrest',
    people: ['Jeffrey Epstein'],
    significance: 'high',
    sources: ['FBIArrestReport.pdf', 'FederalIndictment2019.pdf'],
  },
  {
    id: '9',
    date: '2019-08-10',
    title: 'Epstein Found Dead',
    description:
      'Jeffrey Epstein found dead in his Manhattan jail cell. Officially ruled suicide, but conspiracy theories persist.',
    type: 'death',
    people: ['Jeffrey Epstein'],
    significance: 'high',
    sources: ['DeathCertificate.pdf', 'AutopsyReport.pdf', 'PrisonLogs.txt'],
  },
  {
    id: '10',
    date: '2020-07-02',
    title: 'Maxwell Arrested',
    description:
      "FBI arrests Ghislaine Maxwell in New Hampshire on charges related to Epstein's sex trafficking operation.",
    type: 'arrest',
    people: ['Ghislaine Maxwell'],
    significance: 'high',
    sources: ['MaxwellArrestReport.pdf', 'FederalIndictmentMaxwell.pdf'],
  },
  {
    id: '11',
    date: '2021-12-29',
    title: 'Maxwell Convicted',
    description:
      'Ghislaine Maxwell convicted on 5 of 6 counts including sex trafficking of minors. Sentenced to 20 years in prison.',
    type: 'conviction',
    people: ['Ghislaine Maxwell'],
    significance: 'high',
    sources: ['VerdictForm.pdf', 'SentencingMemo.pdf', 'CourtTranscripts.txt'],
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'flight':
      return <TrendingUp className="h-4 w-4" />;
    case 'arrest':
      return <AlertTriangle className="h-4 w-4" />;
    case 'conviction':
      return <FileText className="h-4 w-4" />;
    case 'death':
      return <Clock className="h-4 w-4" />;
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'testimony':
      return <User className="h-4 w-4" />;
    case 'meeting':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'flight':
      return 'bg-[var(--accent)]';
    case 'arrest':
      return 'bg-red-500';
    case 'conviction':
      return 'bg-orange-500';
    case 'death':
      return 'bg-[var(--glass-bg-highlight)]';
    case 'document':
      return 'bg-green-500';
    case 'testimony':
      return 'bg-purple-500';
    case 'meeting':
      return 'bg-yellow-500';
    default:
      return 'bg-[var(--glass-bg-highlight)]';
  }
};

const getSignificanceColor = (significance: string) => {
  switch (significance) {
    case 'high':
      return 'border-red-400 bg-red-900/20';
    case 'medium':
      return 'border-yellow-400 bg-yellow-900/20';
    case 'low':
      return 'border-green-400 bg-green-900/20';
    default:
      return 'border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/20';
  }
};

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  people: _people,
}) => {
  const sortedEvents = [...timelineEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-900/50 to-red-700/50 p-6 rounded-[var(--radius-xl)] border border-red-500/20">
          <div className="text-3xl font-bold text-[var(--text-primary)]">
            {timelineEvents.length}
          </div>
          <div className="text-red-200">Key Events</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-700/50 p-6 rounded-[var(--radius-xl)] border border-[var(--accent)]/20">
          <div className="text-3xl font-bold text-[var(--text-primary)]">
            {timelineEvents.filter((e) => e.significance === 'high').length}
          </div>
          <div className="text-blue-200">High Significance</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-700/50 p-6 rounded-[var(--radius-xl)] border border-purple-500/20">
          <div className="text-3xl font-bold text-[var(--text-primary)]">
            {new Set(timelineEvents.flatMap((e) => e.people)).size}
          </div>
          <div className="text-purple-200">People Involved</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-green-700/50 p-6 rounded-[var(--radius-xl)] border border-green-500/20">
          <div className="text-3xl font-bold text-[var(--text-primary)]">
            {Math.round(
              (Date.now() - new Date('1997-01-01').getTime()) / (1000 * 60 * 60 * 24 * 365),
            )}
          </div>
          <div className="text-green-200">Years Covered</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-6 rounded-[var(--radius-xl)]">
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
          Chronological Timeline
        </h3>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[var(--glass-border)]"></div>

          {/* Events */}
          <div className="space-y-8">
            {sortedEvents.map((event, _index) => (
              <div key={event.id} className="relative flex items-start">
                {/* Timeline dot */}
                <div
                  className={`absolute left-6 w-4 h-4 rounded-full ${getTypeColor(event.type)} border-2 border-[var(--app-bg)] z-10`}
                ></div>

                {/* Event card */}
                <div
                  className={`ml-16 flex-1 rounded-[var(--radius-lg)] border p-6 ${getSignificanceColor(event.significance)} backdrop-blur-sm`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-[var(--radius-md)] ${getTypeColor(event.type)} text-[var(--text-primary)] shadow-sm`}
                      >
                        {getTypeIcon(event.type)}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[var(--text-primary)]">
                          {event.title}
                        </h4>
                        <p className="text-sm text-[var(--text-secondary)]">{event.date}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        event.significance === 'high'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : event.significance === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }`}
                    >
                      {event.significance.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[var(--text-secondary)] mb-4">{event.description}</p>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                        People Involved:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {event.people.map((person) => (
                          <span
                            key={person}
                            className="px-3 py-1 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] text-[var(--text-secondary)] rounded-full text-sm"
                          >
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                        Sources:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {event.sources.map((source) => (
                          <span
                            key={source}
                            className="px-2 py-1 bg-[var(--app-bg)]/50 border border-[var(--glass-border)] text-[var(--text-secondary)] rounded text-xs font-mono"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Type Legend */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-6 rounded-[var(--radius-xl)]">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Event Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'flight', label: 'Flights', color: 'bg-[var(--accent)]' },
            { type: 'arrest', label: 'Arrests', color: 'bg-red-500' },
            { type: 'conviction', label: 'Convictions', color: 'bg-orange-500' },
            { type: 'death', label: 'Deaths', color: 'bg-[var(--glass-bg-highlight)]' },
            { type: 'document', label: 'Documents', color: 'bg-green-500' },
            { type: 'testimony', label: 'Testimonies', color: 'bg-purple-500' },
            { type: 'meeting', label: 'Meetings', color: 'bg-yellow-500' },
          ].map((item) => (
            <div key={item.type} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${item.color}`}></div>
              <span className="text-[var(--text-secondary)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-6 rounded-[var(--radius-xl)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none"></div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 relative z-10">
          Key Timeline Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-[var(--accent)]">Flight Patterns</h4>
            <ul className="space-y-2 text-[var(--text-secondary)]">
              <li>• Trump: 1 documented flight (1997)</li>
              <li>• Clinton: 26 flights (2001-2003)</li>
              <li>• Multiple international destinations</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-red-400">Legal Timeline</h4>
            <ul className="space-y-2 text-[var(--text-secondary)]">
              <li>• First investigation: 2005</li>
              <li>• Initial conviction: 2008</li>
              <li>• Final arrest: 2019</li>
              <li>• Maxwell conviction: 2021</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
