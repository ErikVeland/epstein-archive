import { lazyWithRetry } from '../utils/lazyWithRetry';

export const PeoplePage = lazyWithRetry(
  () => import('../pages/PeoplePage').then((m) => ({ default: m.PeoplePage })),
  'PeoplePage',
);

export const DocumentsPage = lazyWithRetry(
  () => import('../pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
  'DocumentsPage',
);

export const RedactionsPage = lazyWithRetry(
  () => import('../pages/RedactionsPage').then((m) => ({ default: m.RedactionsPage })),
  'RedactionsPage',
);

export const TimelinePage = lazyWithRetry(
  () => import('../pages/TimelinePage').then((m) => ({ default: m.TimelinePage })),
  'TimelinePage',
);

export const FlightsPage = lazyWithRetry(
  () => import('../pages/FlightsPage').then((m) => ({ default: m.FlightsPage })),
  'FlightsPage',
);

export const FlightDetailPage = lazyWithRetry(
  () => import('../pages/FlightDetailPage').then((m) => ({ default: m.FlightDetailPage })),
  'FlightDetailPage',
);

export const ArticleDetailPage = lazyWithRetry(
  () => import('../pages/ArticleDetailPage').then((m) => ({ default: m.ArticleDetailPage })),
  'ArticleDetailPage',
);

export const PropertyPage = lazyWithRetry(
  () => import('../pages/PropertyPage').then((m) => ({ default: m.PropertyPage })),
  'PropertyPage',
);

export const EmailPage = lazyWithRetry(
  () => import('../pages/EmailPage').then((m) => ({ default: m.EmailPage })),
  'EmailPage',
);

export const CorroborationPage = lazyWithRetry(
  () => import('../pages/CorroborationPage').then((m) => ({ default: m.CorroborationPage })),
  'CorroborationPage',
);

export const LegalTrackerPage = lazyWithRetry(
  () => import('../pages/LegalTrackerPage').then((m) => ({ default: m.LegalTrackerPage })),
  'LegalTrackerPage',
);

export const ConnectionDossierPage = lazyWithRetry(
  () =>
    import('../pages/ConnectionDossierPage').then((m) => ({ default: m.ConnectionDossierPage })),
  'ConnectionDossierPage',
);

export const SurvivorTrackingPage = lazyWithRetry(
  () => import('../pages/SurvivorTrackingPage').then((m) => ({ default: m.SurvivorTrackingPage })),
  'SurvivorTrackingPage',
);

export const MediaPage = lazyWithRetry(
  () => import('../pages/MediaPage').then((m) => ({ default: m.MediaPage })),
  'MediaPage',
);

export const AnalyticsPage = lazyWithRetry(
  () => import('../pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
  'AnalyticsPage',
);

export const EvidenceModal = lazyWithRetry(
  () =>
    import('../components/common/EvidenceModal').then((module) => ({
      default: module.EvidenceModal,
    })),
  'EvidenceModal',
);

export const BlackBookViewer = lazyWithRetry(
  () =>
    import('../components/BlackBookViewer').then((module) => ({
      default: module.BlackBookViewer,
    })),
  'BlackBookViewer',
);

export const EvidenceSearch = lazyWithRetry(
  () =>
    import('../components/EvidenceSearch').then((module) => ({ default: module.EvidenceSearch })),
  'EvidenceSearch',
);

export const DocumentModal = lazyWithRetry(
  () =>
    import('../components/documents/DocumentModal').then((module) => ({
      default: module.DocumentModal,
    })),
  'DocumentModal',
);

export const InvestigationWorkspace = lazyWithRetry(
  () =>
    import('../features/investigation/InvestigationWorkspace').then((module) => ({
      default: module.InvestigationWorkspace,
    })),
  'InvestigationWorkspace',
);

export const ReleaseNotesPanel = lazyWithRetry(
  () =>
    import('../components/ReleaseNotesPanel').then((module) => ({
      default: module.ReleaseNotesPanel,
    })),
  'ReleaseNotesPanel',
);

export const AboutPage = lazyWithRetry(
  () => import('../components/pages/AboutPage').then((module) => ({ default: module.default })),
  'AboutPage',
);

export const FAQPage = lazyWithRetry(
  () => import('../components/pages/FAQPage').then((module) => ({ default: module.default })),
  'FAQPage',
);

export const LegalPage = lazyWithRetry(
  () => import('../components/pages/LegalPage').then((module) => ({ default: module.LegalPage })),
  'LegalPage',
);

export const GuidePage = lazyWithRetry(
  () => import('../components/pages/GuidePage').then((module) => ({ default: module.default })),
  'GuidePage',
);

export const TheEpsteinFilesPage = lazyWithRetry(
  () =>
    import('../pages/TheEpsteinFilesPage').then((module) => ({
      default: module.TheEpsteinFilesPage,
    })),
  'TheEpsteinFilesPage',
);

export const AdminDashboard = lazyWithRetry(
  () => import('../pages/AdminDashboard').then((module) => ({ default: module.AdminDashboard })),
  'AdminDashboard',
);

export const IntelligenceDashboard = lazyWithRetry(
  () =>
    import('../pages/IntelligenceDashboard').then((module) => ({
      default: module.IntelligenceDashboard,
    })),
  'IntelligenceDashboard',
);

export const EvidenceDetail = lazyWithRetry(
  () => import('../pages/EvidenceDetail').then((module) => ({ default: module.EvidenceDetail })),
  'EvidenceDetail',
);

export const ReviewDashboard = lazyWithRetry(
  () => import('../pages/ReviewDashboard').then((module) => ({ default: module.ReviewDashboard })),
  'ReviewDashboard',
);

export const FinancialPage = lazyWithRetry(
  () => import('../pages/FinancialPage').then((module) => ({ default: module.FinancialPage })),
  'FinancialPage',
);

export const ClaimDetailPage = lazyWithRetry(
  () => import('../pages/ClaimDetailPage').then((module) => ({ default: module.ClaimDetailPage })),
  'ClaimDetailPage',
);

export const FinancialTransactionDetailPage = lazyWithRetry(
  () =>
    import('../pages/FinancialTransactionDetailPage').then((module) => ({
      default: module.FinancialTransactionDetailPage,
    })),
  'FinancialTransactionDetailPage',
);

export const NetworkPage = lazyWithRetry(
  () => import('../pages/NetworkPage').then((m) => ({ default: m.NetworkPage })),
  'NetworkPage',
);
