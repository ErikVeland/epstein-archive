import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  File,
  Folder,
  Eye,
  Download,
  Search,
  User,
  Mail,
  FileText,
  Image,
  FileSpreadsheet,
} from 'lucide-react';
import { CloseButton } from './common/CloseButton';
import { cn } from '../utils/cn';
import styles from './FileBrowser.module.css';
import { Flex, Surface, Stack, Grid, Box, LqText } from '../design-system/lib';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  category: string;
  size?: number;
  modified?: string;
  content?: string;
}

const FileBrowser: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Files', icon: Folder, colorClass: styles.iconDefault },
    { id: 'emails', name: 'Emails & Communications', icon: Mail, colorClass: styles.iconEmails },
    { id: 'documents', name: 'Legal Documents', icon: FileText, colorClass: styles.iconDocuments },
    { id: 'images', name: 'Images & Photos', icon: Image, colorClass: styles.iconImages },
    {
      id: 'flight_logs',
      name: 'Flight Records',
      icon: FileSpreadsheet,
      colorClass: styles.iconFlights,
    },
    { id: 'testimonies', name: 'Testimonies', icon: User, colorClass: styles.iconDefault },
    {
      id: 'financial',
      name: 'Financial Records',
      icon: FileSpreadsheet,
      colorClass: styles.iconFinancial,
    },
  ];

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    filterFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterFiles is stable and depends on filter state
  }, [files, selectedCategory, searchTerm]);

  const loadFiles = async () => {
    try {
      setLoadError(null);
      const response = await fetch('/api/documents?page=1&limit=500');
      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.status}`);
      }
      const payload = await response.json();
      const rows = Array.isArray(payload?.documents) ? payload.documents : [];

      const mapped: FileItem[] = rows.map((doc: Record<string, unknown>) => {
        const rawType = String(
          doc.evidenceType || doc.evidence_type || doc.fileType || '',
        ).toLowerCase();
        const category = rawType.includes('email')
          ? 'emails'
          : rawType.includes('flight')
            ? 'flight_logs'
            : rawType.includes('financial')
              ? 'financial'
              : rawType.includes('image') || rawType.includes('photo')
                ? 'images'
                : rawType.includes('deposition') || rawType.includes('testimony')
                  ? 'testimonies'
                  : 'documents';

        return {
          name: String(doc.title || doc.fileName || `Document ${doc.id}`),
          path: String(doc.filePath || doc.file_path || `/api/documents/${doc.id}/file`),
          type: 'file',
          category,
          size: Number(doc.fileSize || doc.file_size || 0),
          modified: String(doc.dateCreated || doc.date_created || ''),
        };
      });

      setFiles(mapped);
      setLoading(false);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
      setLoadError(error instanceof Error ? error.message : 'Unable to load files');
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = files;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((file) => file.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (file) =>
          file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.path.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredFiles(filtered);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file') {
      setSelectedFile(file);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') return Folder;

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return FileText;
      case 'txt':
        return FileText;
      case 'csv':
        return FileSpreadsheet;
      case 'jpg':
      case 'png':
        return Image;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" p={12}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </Flex>
    );
  }

  return (
    <Stack gap={6}>
      {/* Category Filter */}
      <Surface variant="glass" p={4}>
        <Box mb={4}>
          <LqText variant="h3" weight="semibold">
            Browse by Category
          </LqText>
        </Box>
        {loadError && <div className={styles.errorBanner}>{loadError}</div>}
        <div className={styles.categoryGrid}>
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive,
                )}
              >
                <Icon
                  className={cn('h-6 w-6', category.colorClass)}
                  style={{ marginBottom: 'var(--space-2)' }}
                />
                <span className="text-xs text-center font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </Surface>

      {/* Search */}
      <Surface variant="glass" p={4}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search files by name or content..."
            style={{ padding: 'var(--space-3) var(--space-4) var(--space-3) var(--space-10)' }}
            className="w-full bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Surface>

      {/* File List */}
      <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] overflow-hidden">
        <Surface variant="glass" p={4} style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <Flex align="center" justify="between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {selectedCategory === 'all'
                ? 'All Files'
                : categories.find((c) => c.id === selectedCategory)?.name}
            </h3>
            <span className="text-[var(--text-muted)] text-sm">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'}
            </span>
          </Flex>
        </Surface>

        <div className={styles.fileList}>
          {filteredFiles.map((file, index) => {
            const Icon = getFileIcon(file);
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleFileClick(file)}
                className={styles.fileItem}
                aria-label={`Preview file ${file.name}`}
              >
                <Flex align="center" justify="between">
                  <Flex align="center" gap={3}>
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                    <div>
                      <LqText weight="medium">{file.name}</LqText>
                      <LqText color="muted" variant="small">
                        {file.path}
                      </LqText>
                    </div>
                  </Flex>
                  <Flex align="center" gap={4}>
                    {file.size && (
                      <LqText color="muted" variant="small">
                        {formatFileSize(file.size)}
                      </LqText>
                    )}
                    {file.modified && (
                      <LqText color="muted" variant="small">
                        {file.modified}
                      </LqText>
                    )}
                    <Eye className="h-4 w-4 text-[var(--text-muted)]" />
                  </Flex>
                </Flex>
              </button>
            );
          })}
        </div>

        {filteredFiles.length === 0 && (
          <Surface p={8} style={{ textAlign: 'center' }}>
            <File
              className="h-12 w-12 text-[var(--text-muted)] mx-auto"
              style={{ marginBottom: 'var(--space-4)' }}
            />
            <Box mb={2}>
              <LqText variant="h4" weight="medium" color="secondary">
                No files found
              </LqText>
            </Box>
            <LqText color="muted">Try adjusting your search or category filter</LqText>
          </Surface>
        )}
      </div>

      {/* File Preview Modal */}
      {selectedFile &&
        createPortal(
          <Box
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'var(--glass-bg-strong)',
              backdropFilter: 'blur(8px)',
            }}
            className="flex items-center justify-center z-[var(--z-modal)]"
            p={4}
          >
            <Surface variant="glass" w="full" maxW="lg" maxH="80vh" style={{ overflow: 'hidden' }}>
              <Surface
                variant="glass"
                p={6}
                style={{ borderBottom: '1px solid var(--glass-border)' }}
              >
                <Flex align="center" justify="between">
                  <Flex align="center" gap={3}>
                    <File className="h-6 w-6 text-[var(--accent)]" />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {selectedFile.name}
                    </h3>
                  </Flex>
                  <Flex align="center" gap={3}>
                    <button
                      className={cn(
                        styles.controlButton,
                        'bg-[var(--accent)] hover:brightness-110 h-auto',
                      )}
                      style={{ padding: 'var(--space-2) var(--space-4)' }}
                    >
                      <Download className="h-4 w-4" />
                      <LqText weight="medium">Download</LqText>
                    </button>
                    <CloseButton
                      onClick={() => setSelectedFile(null)}
                      size="sm"
                      label="Close file preview"
                      className="border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/70 text-[var(--text-primary)]"
                    />
                  </Flex>
                </Flex>
              </Surface>
              <Box p={6} style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                <Stack gap={4}>
                  <Grid cols={2} gap={4}>
                    <div>
                      <span className="text-[var(--text-muted)] text-sm">Path:</span>
                      <p className="text-[var(--text-primary)]">{selectedFile.path}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] text-sm">Category:</span>
                      <p className="text-[var(--text-primary)] capitalize">
                        {selectedFile.category}
                      </p>
                    </div>
                    {selectedFile.size && (
                      <div>
                        <span className="text-[var(--text-muted)] text-sm">Size:</span>
                        <p className="text-[var(--text-primary)]">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    )}
                    {selectedFile.modified && (
                      <div>
                        <span className="text-[var(--text-muted)] text-sm">Modified:</span>
                        <p className="text-[var(--text-primary)]">{selectedFile.modified}</p>
                      </div>
                    )}
                  </Grid>
                  <Box pt={4} style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <Box mb={2}>
                      <LqText weight="medium">Content Preview</LqText>
                    </Box>
                    <Surface
                      variant="glass-strong"
                      p={4}
                      style={{ maxHeight: '16rem', overflowY: 'auto' }}
                    >
                      <pre className="text-[var(--text-secondary)] font-mono text-sm whitespace-pre-wrap">
                        {selectedFile.content || 'File content would be displayed here...'}
                      </pre>
                    </Surface>
                  </Box>
                </Stack>
              </Box>
            </Surface>
          </Box>,
          document.body,
        )}
    </Stack>
  );
};

export default FileBrowser;
