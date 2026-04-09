import { useMatch, useLocation } from 'react-router-dom';

export type Tab =
  | 'people'
  | 'search'
  | 'documents'
  | 'media'
  | 'timeline'
  | 'flights'
  | 'properties'
  | 'investigations'
  | 'analytics'
  | 'blackbook'
  | 'about'
  | 'emails'
  | 'login'
  | 'evidence'
  | 'faq'
  | 'guide'
  | 'review'
  | 'admin'
  | 'landing';

export const tabLabels: Record<Tab, string> = {
  people: 'People',
  search: 'Search',
  documents: 'Documents',
  media: 'Media',
  timeline: 'Timeline',
  flights: 'Flights',
  properties: 'Properties',
  investigations: 'Investigations',
  analytics: 'Analytics',
  blackbook: 'Black Book',
  about: 'About',
  emails: 'Emails',
  login: 'Login',
  evidence: 'Evidence',
  faq: 'FAQ',
  guide: 'Guide',
  review: 'Review',
  admin: 'Admin',
  landing: 'The Epstein Files',
};

export const useAppNavigation = () => {
  const location = useLocation();

  const matchPeople = useMatch({ path: '/people', end: false });
  const matchEntity = useMatch({ path: '/entity/:id', end: false });
  const matchSearch = useMatch({ path: '/search', end: false });
  const matchDocuments = useMatch({ path: '/documents', end: false });
  const matchMedia = useMatch({ path: '/media', end: false });
  const matchTimeline = useMatch({ path: '/timeline', end: false });
  const matchFlights = useMatch({ path: '/flights', end: false });
  const matchProperties = useMatch({ path: '/properties', end: false });
  const matchInvestigations1 = useMatch({ path: '/investigations', end: false });
  const matchInvestigations2 = useMatch({ path: '/investigate', end: false });
  const matchInvestigations = matchInvestigations1 || matchInvestigations2;
  const matchAnalytics = useMatch({ path: '/analytics', end: false });
  const matchBlackbook = useMatch({ path: '/blackbook', end: false });
  const matchAbout1 = useMatch({ path: '/about', end: false });
  const matchAbout2 = useMatch({ path: '/privacy', end: false });
  const matchAbout3 = useMatch({ path: '/terms', end: false });
  const matchAbout = matchAbout1 || matchAbout2 || matchAbout3;
  const matchEmails = useMatch({ path: '/emails', end: false });
  const matchLogin = useMatch({ path: '/login', end: false });
  const matchAdmin = useMatch({ path: '/admin', end: false });
  const matchReview = useMatch({ path: '/review', end: false });
  const matchEvidence = useMatch({ path: '/evidence/:id', end: false });
  const matchFaq = useMatch({ path: '/faq', end: false });
  const matchGuide = useMatch({ path: '/guide', end: false });
  const matchLanding1 = useMatch({ path: '/the-epstein-files', end: false });
  const matchLanding2 = useMatch({ path: '/epstein-documents', end: false });
  const matchLanding3 = useMatch({ path: '/epstein-people', end: false });
  const matchLanding4 = useMatch({ path: '/epstein-media', end: false });
  const matchLanding5 = useMatch({ path: '/epstein-timeline', end: false });
  const matchLanding6 = useMatch({ path: '/epstein-flights', end: false });
  const matchLanding =
    matchLanding1 ||
    matchLanding2 ||
    matchLanding3 ||
    matchLanding4 ||
    matchLanding5 ||
    matchLanding6;

  const activeTab: Tab = (() => {
    if (matchSearch) return 'search';
    if (matchDocuments) return 'documents';
    if (matchMedia) return 'media';
    if (matchTimeline) return 'timeline';
    if (matchFlights) return 'flights';
    if (matchProperties) return 'properties';
    if (matchInvestigations) return 'investigations';
    if (matchAnalytics) return 'analytics';
    if (matchBlackbook) return 'blackbook';
    if (matchAbout) return 'about';
    if (matchEmails) return 'emails';
    if (matchLogin) return 'login';
    if (matchAdmin) return 'admin';
    if (matchReview) return 'review';
    if (matchEvidence) return 'evidence';
    if (matchFaq) return 'faq';
    if (matchGuide) return 'guide';
    if (matchLanding) return 'landing';
    if (matchEntity || matchPeople || location.pathname === '/') return 'people';
    return 'people';
  })();

  return {
    activeTab,
    tabLabels,
    location,
  };
};
