/**
 * Contact List Viewer Component
 *
 * Displays contact directories like Black Book
 */

import { useState, useMemo } from 'react';
import Icon from '@client/components/common/Icon';
import { EmptyCorpus } from '../common/EmptyCorpus';
import styles from './ContactListViewer.module.css';

import { Input } from '@client/design-system/lib';

interface ContactListViewerProps {
  evidence: {
    extractedText: string;
    title: string;
  };
}

interface Contact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  raw: string;
}

export function ContactListViewer({ evidence }: ContactListViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const contacts = useMemo(() => {
    const lines = evidence.extractedText.split('\n').filter((line) => line.trim());
    const contactList: Contact[] = [];

    // Simple parsing: group related lines as contacts
    let currentContact: Partial<Contact> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for name patterns (capitalized words)
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed) && !trimmed.includes('@')) {
        if (currentContact.name) {
          contactList.push(currentContact as Contact);
        }
        currentContact = {
          name: trimmed,
          raw: trimmed,
        };
      } else if (currentContact.name) {
        // Look for phone, email, or address
        if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(trimmed) || /\+\d+/.test(trimmed)) {
          currentContact.phone = trimmed;
        } else if (trimmed.includes('@')) {
          currentContact.email = trimmed;
        } else if (trimmed.length > 10) {
          currentContact.address = trimmed;
        }
        currentContact.raw += '\n' + trimmed;
      }
    }

    if (currentContact.name) {
      contactList.push(currentContact as Contact);
    }

    return contactList;
  }, [evidence.extractedText]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;

    const term = searchTerm.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) ||
        contact.phone?.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.address?.toLowerCase().includes(term),
    );
  }, [contacts, searchTerm]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{evidence.title}</h3>
        <p className={styles.subtitle}>{contacts.length} contacts found</p>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <div className={styles.searchInputWrapper}>
          <Icon name="Search" className={styles.searchIcon} />
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Contacts Grid */}
      <div className={styles.grid}>
        {filteredContacts.map((contact, index) => (
          <div key={index} className={styles.card}>
            <div className={styles.cardInner}>
              <Icon name="User" className={styles.userIcon} />
              <div className={styles.cardContent}>
                <h4 className={styles.contactName}>{contact.name}</h4>

                <div className={styles.contactDetails}>
                  {contact.phone && (
                    <div className={styles.contactDetailRow}>
                      <Icon name="Phone" className={styles.detailIcon} />
                      {contact.phone}
                    </div>
                  )}

                  {contact.email && (
                    <div className={styles.contactDetailRow}>
                      <Icon name="Mail" className={styles.detailIcon} />
                      {contact.email}
                    </div>
                  )}

                  {contact.address && (
                    <div className={styles.contactDetailRowAddress}>
                      <Icon name="MapPin" className={styles.detailIconAddress} />
                      <span className={styles.addressText}>{contact.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {contacts.length === 0 ? (
        <EmptyCorpus
          icon="Book"
          title="No Contacts Parsed"
          body="No contact entries could be extracted from this document. The text may be structured differently than expected, or OCR quality may be too low to parse individual entries."
        />
      ) : filteredContacts.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No contacts found matching &quot;{searchTerm}&quot;</p>
        </div>
      ) : null}
    </div>
  );
}
