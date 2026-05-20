import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { ApiUnavailableScreen } from '../components/common/ApiUnavailableScreen';
import type { Person } from '../types';
import type { GlobalStatsPayload } from '../types/api';
import type { User } from '../types/auth';
import {
  AboutPage,
  AdminDashboard,
  AnalyticsPage,
  ArticleDetailPage,
  BlackBookViewer,
  ClaimDetailPage,
  ConnectionDossierPage,
  CorroborationPage,
  DocumentsPage,
  EmailPage,
  EvidenceDetail,
  EvidenceSearch,
  FAQPage,
  FinancialPage,
  FinancialTransactionDetailPage,
  FlightDetailPage,
  FlightsPage,
  GuidePage,
  IntelligenceDashboard,
  InvestigationWorkspace,
  LegalPage,
  LegalTrackerPage,
  MediaPage,
  NetworkPage,
  PeoplePage,
  PropertyPage,
  RedactionsPage,
  ReviewDashboard,
  SurvivorTrackingPage,
  TheEpsteinFilesPage,
  TimelinePage,
} from './lazyRoutes';
import { LoginPage } from '../pages/LoginPage';
import { Box } from '../design-system/lib';
import styles from '../App.module.css';

export type DataStats = {
  totalPeople: number;
  totalMentions: number;
  totalFiles: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
};

export type AppRoutesProps = {
  apiStatus: 'ok' | 'degraded' | 'down' | string;
  location: Pick<Location, 'pathname' | 'search' | 'state'>;
  dataStats: DataStats;
  selectedRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  onRiskLevelClick: (level: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onResetFilters: () => void;
  isAdmin: boolean;
  onAddSubject: () => void;
  entityType: string;
  onEntityTypeChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  searchTerm: string;
  onPersonClick: (person: Person) => void;
  analyticsData?: GlobalStatsPayload;
  analyticsLoading: boolean;
  analyticsError: string | null;
  onRetryAnalytics: () => void;
  onDocumentClick: (documentId: string) => void;
  selectedDocumentSearchTerm: string;
  onSelectedDocumentSearchTermChange: (next: string) => void;
  selectedDocumentId: string;
  currentUser: User | null;
};

const PeoplePageElement: React.FC<{
  props: Pick<
    AppRoutesProps,
    | 'dataStats'
    | 'selectedRiskLevel'
    | 'onRiskLevelClick'
    | 'onResetFilters'
    | 'isAdmin'
    | 'onAddSubject'
    | 'entityType'
    | 'onEntityTypeChange'
    | 'sortBy'
    | 'onSortByChange'
    | 'sortOrder'
    | 'onSortOrderToggle'
    | 'searchTerm'
    | 'onPersonClick'
  >;
}> = ({ props }) => (
  <PeoplePage
    dataStats={props.dataStats}
    selectedRiskLevel={props.selectedRiskLevel}
    onRiskLevelClick={props.onRiskLevelClick}
    onResetFilters={props.onResetFilters}
    isAdmin={props.isAdmin}
    onAddSubject={props.onAddSubject}
    entityType={props.entityType}
    onEntityTypeChange={props.onEntityTypeChange}
    sortBy={props.sortBy}
    onSortByChange={props.onSortByChange}
    sortOrder={props.sortOrder}
    onSortOrderToggle={props.onSortOrderToggle}
    searchTerm={props.searchTerm}
    onPersonClick={props.onPersonClick}
  />
);

export const AppRoutes: React.FC<AppRoutesProps> = (props) => {
  const isReadOnlyRoute =
    props.location.pathname === '/login' ||
    props.location.pathname.startsWith('/about') ||
    props.location.pathname.startsWith('/privacy') ||
    props.location.pathname.startsWith('/terms') ||
    props.location.pathname.startsWith('/faq') ||
    props.location.pathname.startsWith('/guide');

  if (props.apiStatus === 'down' && !isReadOnlyRoute) {
    return <ApiUnavailableScreen />;
  }

  const peopleProps = {
    dataStats: props.dataStats,
    selectedRiskLevel: props.selectedRiskLevel,
    onRiskLevelClick: props.onRiskLevelClick,
    onResetFilters: props.onResetFilters,
    isAdmin: props.isAdmin,
    onAddSubject: props.onAddSubject,
    entityType: props.entityType,
    onEntityTypeChange: props.onEntityTypeChange,
    sortBy: props.sortBy,
    onSortByChange: props.onSortByChange,
    sortOrder: props.sortOrder,
    onSortOrderToggle: props.onSortOrderToggle,
    searchTerm: props.searchTerm,
    onPersonClick: props.onPersonClick,
  };

  return (
    <Routes>
      <Route path="/" element={<PeoplePageElement props={peopleProps} />} />
      <Route path="/people" element={<PeoplePageElement props={peopleProps} />} />
      <Route path="/entity/:id" element={<PeoplePageElement props={peopleProps} />} />
      <Route
        path="/analytics"
        element={
          <AnalyticsPage
            analyticsData={props.analyticsData}
            loading={props.analyticsLoading}
            error={props.analyticsError}
            onRetry={props.onRetryAnalytics}
            onPersonSelect={props.onPersonClick}
          />
        }
      />
      <Route
        path="/search"
        element={
          <EvidenceSearch
            onPersonClick={props.onPersonClick}
            onDocumentClick={props.onDocumentClick}
          />
        }
      />
      <Route
        path="/documents/*"
        element={
          <DocumentsPage
            searchTerm={props.selectedDocumentSearchTerm}
            onSearchTermChange={props.onSelectedDocumentSearchTermChange}
            selectedDocumentId={props.selectedDocumentId}
          />
        }
      />
      <Route path="/redactions" element={<RedactionsPage />} />
      <Route path="/timeline/*" element={<TimelinePage />} />
      <Route path="/claims/corroborated" element={<CorroborationPage />} />
      <Route path="/connections" element={<ConnectionDossierPage />} />
      <Route path="/legal-proceedings" element={<LegalTrackerPage />} />
      <Route path="/survivors" element={<SurvivorTrackingPage />} />
      <Route path="/claims/:id" element={<ClaimDetailPage />} />
      <Route path="/financial/:id" element={<FinancialTransactionDetailPage />} />
      <Route path="/financial/*" element={<FinancialPage />} />
      <Route path="/flights/:id" element={<FlightDetailPage />} />
      <Route path="/flights/*" element={<FlightsPage />} />
      <Route path="/properties/*" element={<PropertyPage />} />
      <Route path="/emails/*" element={<EmailPage />} />
      <Route path="/media/article/:id" element={<ArticleDetailPage />} />
      <Route path="/media/*" element={<MediaPage />} />
      <Route path="/about/*" element={<AboutPage />} />
      <Route path="/privacy" element={<LegalPage mode="privacy" />} />
      <Route path="/terms" element={<LegalPage mode="terms" />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/guide" element={<GuidePage />} />
      <Route path="/the-epstein-files" element={<TheEpsteinFilesPage variant="overview" />} />
      <Route path="/epstein-documents" element={<TheEpsteinFilesPage variant="documents" />} />
      <Route path="/epstein-people" element={<TheEpsteinFilesPage variant="people" />} />
      <Route path="/epstein-media" element={<TheEpsteinFilesPage variant="media" />} />
      <Route path="/epstein-timeline" element={<TheEpsteinFilesPage variant="timeline" />} />
      <Route path="/epstein-flights" element={<TheEpsteinFilesPage variant="flights" />} />
      <Route path="/network" element={<NetworkPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/intelligence" element={<IntelligenceDashboard />} />
      <Route path="/evidence/:id" element={<EvidenceDetail />} />
      <Route
        path="/review/*"
        element={
          <Suspense
            fallback={<LoadingIndicator isLoading={true} label="Loading Review Dashboard..." />}
          >
            <ReviewDashboard />
          </Suspense>
        }
      />
      <Route
        path="/investigations/*"
        element={
          <ScopedErrorBoundary>
            <InvestigationWorkspace
              investigationId={(() => {
                const parts = props.location.pathname.split('/');
                return parts[1] === 'investigations' && parts[2] ? parts[2] : undefined;
              })()}
              currentUser={
                props.currentUser
                  ? {
                      id: props.currentUser.id,
                      name: props.currentUser.username,
                      email: props.currentUser.email || 'investigator@example.com',
                      role: props.isAdmin ? 'lead' : 'analyst',
                      permissions: ['read', 'write', ...(props.isAdmin ? ['admin'] : [])],
                      joinedAt: new Date(),
                      expertise: ['investigative journalism', 'data analysis'],
                    }
                  : {
                      id: 'guest',
                      name: 'Guest',
                      email: 'guest@example.com',
                      role: 'analyst',
                      permissions: ['read'],
                      joinedAt: new Date(),
                      expertise: [],
                    }
              }
            />
          </ScopedErrorBoundary>
        }
      />
      <Route
        path="/blackbook/*"
        element={
          <Box mt={6}>
            <Suspense
              fallback={
                <div className={styles.centerLoader}>
                  <div className={styles.largeSpinner}></div>
                </div>
              }
            >
              <BlackBookViewer />
            </Suspense>
          </Box>
        }
      />
      <Route path="*" element={<PeoplePageElement props={peopleProps} />} />
    </Routes>
  );
};
