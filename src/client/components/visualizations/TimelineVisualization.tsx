import React from 'react';
import Icon from '@client/components/common/Icon';
import { Person } from '@client/types';
import { TimelineVisualizationEvent } from '@client/types/visualizations';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import styles from './TimelineVisualization.module.css';

interface TimelineVisualizationProps {
  people: Person[];
}

const timelineEvents: TimelineVisualizationEvent[] = [
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
      return <Icon name="TrendingUp" className={styles.eventTypeIcon} />;
    case 'arrest':
      return <Icon name="AlertTriangle" className={styles.eventTypeIcon} />;
    case 'conviction':
      return <Icon name="FileText" className={styles.eventTypeIcon} />;
    case 'death':
      return <Icon name="Clock" className={styles.eventTypeIcon} />;
    case 'document':
      return <Icon name="FileText" className={styles.eventTypeIcon} />;
    case 'testimony':
      return <Icon name="User" className={styles.eventTypeIcon} />;
    case 'meeting':
      return <Icon name="Calendar" className={styles.eventTypeIcon} />;
    default:
      return <Icon name="Calendar" className={styles.eventTypeIcon} />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'flight':
      return styles.typeFlight;
    case 'arrest':
      return styles.typeArrest;
    case 'conviction':
      return styles.typeConviction;
    case 'death':
      return styles.typeDeath;
    case 'document':
      return styles.typeDocument;
    case 'testimony':
      return styles.typeTestimony;
    case 'meeting':
      return styles.typeMeeting;
    default:
      return styles.typeDeath;
  }
};

const getSignificanceColor = (significance: string) => {
  switch (significance) {
    case 'high':
      return styles.significanceHigh;
    case 'medium':
      return styles.significanceMedium;
    case 'low':
      return styles.significanceLow;
    default:
      return styles.significanceLow;
  }
};

const getSignificanceBadgeClass = (significance: string) => {
  if (significance === 'high') return styles.sigHigh;
  if (significance === 'medium') return styles.sigMedium;
  return styles.sigLow;
};

const YEARS_COVERED = Math.round(
  (Date.now() - new Date('1997-01-01').getTime()) / (1000 * 60 * 60 * 24 * 365),
);

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  people: _people,
}) => {
  const sortedEvents = [...timelineEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className={styles.root}>
      <ScopedErrorBoundary
        fallback={
          <div className={styles.errorCard}>
            <p className={styles.errorTitle}>Timeline Error</p>
            <p>Failed to render the timeline visualization.</p>
          </div>
        }
      >
        {/* Header Stats */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statsCard} ${styles.statsCardRed}`}>
            <div className={styles.statsValue}>{timelineEvents.length}</div>
            <div className={styles.statsLabelRed}>Key Events</div>
          </div>
          <div className={`${styles.statsCard} ${styles.statsCardBlue}`}>
            <div className={styles.statsValue}>
              {timelineEvents.filter((e) => e.significance === 'high').length}
            </div>
            <div className={styles.statsLabelBlue}>High Significance</div>
          </div>
          <div className={`${styles.statsCard} ${styles.statsCardPurple}`}>
            <div className={styles.statsValue}>
              {new Set(timelineEvents.flatMap((e) => e.people)).size}
            </div>
            <div className={styles.statsLabelPurple}>People Involved</div>
          </div>
          <div className={`${styles.statsCard} ${styles.statsCardGreen}`}>
            <div className={styles.statsValue}>{YEARS_COVERED}</div>
            <div className={styles.statsLabelGreen}>Years Covered</div>
          </div>
        </div>

        {/* Timeline */}
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Chronological Timeline</h3>
          <div className={styles.timelineWrap}>
            {/* Timeline line */}
            <div className={styles.timelineLine}></div>

            {/* Events */}
            <div className={styles.timelineList}>
              {sortedEvents.map((event, _index) => (
                <div key={event.id} className={styles.timelineItem}>
                  {/* Timeline dot */}
                  <div className={`${styles.timelineDot} ${getTypeColor(event.type)}`}></div>

                  {/* Event card */}
                  <div
                    className={`${styles.eventCard} ${getSignificanceColor(event.significance)}`}
                  >
                    <div className={styles.eventHeader}>
                      <div className={styles.eventTitleRow}>
                        <div className={`${styles.eventTypeBadge} ${getTypeColor(event.type)}`}>
                          {getTypeIcon(event.type)}
                        </div>
                        <div>
                          <h4 className={styles.eventTitle}>{event.title}</h4>
                          <p className={styles.eventDate}>
                            {typeof event.date === 'string' ? event.date : String(event.date)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`${styles.significanceBadge} ${getSignificanceBadgeClass(event.significance)}`}
                      >
                        {event.significance.toUpperCase()}
                      </span>
                    </div>

                    <p className={styles.eventDescription}>{event.description}</p>

                    <div className={styles.eventSectionList}>
                      <div>
                        <h5 className={styles.eventSectionTitle}>People Involved:</h5>
                        <div className={styles.pillRow}>
                          {event.people.map((person: string) => (
                            <span key={person} className={styles.personPill}>
                              {person}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className={styles.eventSectionTitle}>Sources:</h5>
                        <div className={styles.pillRow}>
                          {event.sources.map((source: string) => (
                            <span key={source} className={styles.sourcePill}>
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
        <div className={styles.panel}>
          <h3 className={styles.panelTitleSm}>Event Types</h3>
          <div className={styles.legendGrid}>
            {[
              { type: 'flight', label: 'Flights', color: styles.typeFlight },
              { type: 'arrest', label: 'Arrests', color: styles.typeArrest },
              { type: 'conviction', label: 'Convictions', color: styles.typeConviction },
              { type: 'death', label: 'Deaths', color: styles.typeDeath },
              { type: 'document', label: 'Documents', color: styles.typeDocument },
              { type: 'testimony', label: 'Testimonies', color: styles.typeTestimony },
              { type: 'meeting', label: 'Meetings', color: styles.typeMeeting },
            ].map((item) => (
              <div key={item.type} className={styles.legendItem}>
                <div className={`${styles.legendSwatch} ${item.color}`}></div>
                <span className={styles.legendLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className={`${styles.panel} ${styles.insightsPanel}`}>
          <div className={styles.insightsGlow}></div>
          <div className={styles.insightsContent}>
            <h3 className={styles.panelTitleSm}>Key Timeline Insights</h3>
            <div className={styles.insightsGrid}>
              <div className={styles.insightGroup}>
                <h4 className={styles.insightTitleAccent}>Flight Patterns</h4>
                <ul className={styles.insightList}>
                  <li>• Trump: 1 documented flight (1997)</li>
                  <li>• Clinton: 26 flights (2001-2003)</li>
                  <li>• Multiple international destinations</li>
                </ul>
              </div>
              <div className={styles.insightGroup}>
                <h4 className={styles.insightTitleDanger}>Legal Timeline</h4>
                <ul className={styles.insightList}>
                  <li>• First investigation: 2005</li>
                  <li>• Initial conviction: 2008</li>
                  <li>• Final arrest: 2019</li>
                  <li>• Maxwell conviction: 2021</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </ScopedErrorBoundary>
    </div>
  );
};
