import React, { Suspense } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
import { EvidenceModal } from './lazyRoutes';
import { DocumentModal } from './lazyRoutes';
import { ReleaseNotesPanel } from './lazyRoutes';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import { CommandPalette } from '../components/common/CommandPalette';
import { CreateEntityModal } from '../components/entities/CreateEntityModal';
import styles from '../App.module.css';
import type { DocRecord } from '../components/documents/DocumentModal';
import type { ParsedReleaseNote } from '../utils/releaseNotes';
import type { Person } from '../types';

type LocationLike = {
  pathname: string;
  search: string;
  state?: unknown;
};

export type ModalHostProps = {
  selectedPerson: Person | null;
  setSelectedPerson: (next: Person | null) => void;
  markClosingEntityModal: () => void;
  location: LocationLike;
  navigate: NavigateFunction;
  backLinkState: unknown;
  documentModalId: string | null;
  setDocumentModalId: (next: string | null) => void;
  selectedDocumentSearchTerm: string;
  documentModalInitial: DocRecord | null;
  setDocumentModalInitial: (next: DocRecord | null) => void;
  goBack: (fallbackPath: string) => void;
  showReleaseNotes: boolean;
  setShowReleaseNotes: (next: boolean) => void;
  parsedReleaseNotes: ParsedReleaseNote[];
  showKeyboardShortcuts: boolean;
  setShowKeyboardShortcuts: (next: boolean) => void;
  isCommandPaletteOpen: boolean;
  closeCommandPalette: () => void;
  showCreateEntityModal: boolean;
  setShowCreateEntityModal: (next: boolean) => void;
  queryClient: QueryClient;
};

export const ModalHost: React.FC<ModalHostProps> = (props) => {
  return (
    <>
      <Suspense
        fallback={
          <div className={`${styles.modalFallback} ${styles.modalFallbackBlur}`}>
            <div className={styles.largeSpinner}></div>
          </div>
        }
      >
        {props.selectedPerson && (
          <ScopedErrorBoundary>
            <EvidenceModal
              entityId={String(props.selectedPerson.id)}
              isOpen={!!props.selectedPerson}
              onClose={() => {
                props.markClosingEntityModal();
                props.setSelectedPerson(null);
                props.goBack('/people');
              }}
            />
          </ScopedErrorBoundary>
        )}
      </Suspense>

      <Suspense
        fallback={
          <div className={styles.modalFallback}>
            <div className={styles.smallSpinner} />
          </div>
        }
      >
        {props.documentModalId && (
          <ScopedErrorBoundary>
            <DocumentModal
              id={props.documentModalId}
              searchTerm={props.selectedDocumentSearchTerm}
              initialDoc={props.documentModalInitial ?? undefined}
              onClose={() => {
                props.setDocumentModalId('');
                props.setDocumentModalInitial(null);
                sessionStorage.setItem(
                  'nav-return:scroll',
                  String(window.scrollY || window.pageYOffset || 0),
                );
                props.goBack('/documents');
              }}
            />
          </ScopedErrorBoundary>
        )}
      </Suspense>

      <Suspense fallback={null}>
        <ReleaseNotesPanel
          isOpen={props.showReleaseNotes}
          onClose={() => props.setShowReleaseNotes(false)}
          releaseNotes={props.parsedReleaseNotes}
        />
      </Suspense>

      <KeyboardShortcutsModal
        isOpen={props.showKeyboardShortcuts}
        onClose={() => props.setShowKeyboardShortcuts(false)}
      />

      <Suspense fallback={null}>
        <CommandPalette isOpen={props.isCommandPaletteOpen} onClose={props.closeCommandPalette} />
      </Suspense>

      {props.showCreateEntityModal && (
        <CreateEntityModal
          onClose={() => props.setShowCreateEntityModal(false)}
          onSuccess={() => {
            props.setShowCreateEntityModal(false);
            void props.queryClient.invalidateQueries({ queryKey: ['entities'] });
            void props.queryClient.invalidateQueries({ queryKey: ['globalStats'] });
            void props.queryClient.invalidateQueries({ queryKey: ['initDataService'] });
          }}
        />
      )}
    </>
  );
};
