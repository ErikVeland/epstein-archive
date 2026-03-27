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
import { cn, Surface } from '@design-system';
import './FileBrowser.css';

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
    { id: 'all', name: 'All Files', icon: Folder, color: 'text-[var(--accent)]' },
    {
      id: 'emails',
      name: 'Emails & Communications',
      icon: Mail,
      color: 'text-[var(--accent-success)]',
    },
    {
      id: 'documents',
      name: 'Legal Documents',
      icon: FileText,
      color: 'text-[var(--accent-danger)]',
    },
    { id: 'images', name: 'Images & Photos', icon: Image, color: 'text-[var(--accent-info)]' },
    {
      id: 'flight_logs',
      name: 'Flight Records',
      icon: FileSpreadsheet,
      color: 'text-[var(--accent-warning)]',
    },
    { id: 'testimonies', name: 'Testimonies', icon: User, color: 'text-[var(--accent)]' },
    {
      id: 'financial',
      name: 'Financial Records',
      icon: FileSpreadsheet,
      color: 'text-[var(--accent-warning)]',
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
      <div className="stack-x v-center h-center" style={{ height: '16rem' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="stack-y gap-6">
      {/* Category Filter */}
      <div className="glass-panel p-4 rounded-[var(--radius-xl)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Browse by Category
        </h3>
        {loadError && (
          <div className="status-banner status-banner-danger mb-4 rounded-[var(--radius-lg)] px-3 py-2 text-sm">
            {loadError}
          </div>
        )}
        <div className="file-browser-grid">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'category-card',
                  selectedCategory === category.id
                    ? 'soft-glass-accent text-[var(--text-primary)] shadow-[var(--glass-shadow)]'
                    : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]',
                )}
              >
                <Icon className="h-6 w-6 no-shrink mb-2" />
                <span className="text-xs text-center font-medium capitalize">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel p-4 rounded-[var(--radius-xl)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search files by name or content..."
            className="control full-width text-left pl-10 pr-4 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* File List */}
      <div className="glass-panel rounded-[var(--radius-xl)] overflow-hidden">
        <div className="p-4 border-b border-[var(--glass-border)]">
          <div className="stack-x v-center h-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {selectedCategory === 'all'
                ? 'All Files'
                : categories.find((c) => c.id === selectedCategory)?.name}
            </h3>
            <span className="text-[var(--text-muted)] text-sm">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        <div className="stack-y">
          {filteredFiles.map((file, index) => {
            const Icon = getFileIcon(file);
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleFileClick(file)}
                className="file-list-item bg-transparent"
                aria-label={`Preview file ${file.name}`}
              >
                <div className="stack-x v-center h-between full-width">
                  <div className="stack-x v-center gap-3">
                    <Icon className="h-5 w-5 text-[var(--accent)] no-shrink" />
                    <div>
                      <h4 className="text-[var(--text-primary)] font-medium">{file.name}</h4>
                      <p className="text-[var(--text-muted)] text-sm truncate max-w-[300px]">
                        {file.path}
                      </p>
                    </div>
                  </div>
                  <div className="stack-x v-center gap-4 text-sm text-[var(--text-muted)]">
                    {file.size && <span>{formatFileSize(file.size)}</span>}
                    {file.modified && <span>{file.modified}</span>}
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filteredFiles.length === 0 && (
          <div className="p-8 text-center">
            <File className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h4 className="text-[var(--text-secondary)] font-medium mb-2">No files found</h4>
            <p className="text-[var(--text-muted)]">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>

      {selectedFile &&
        createPortal(
          <div className="file-preview-overlay bg-[var(--glass-bg-strong)] backdrop-blur-sm z-[9999]">
            <Surface variant="elevated" className="file-preview-modal">
              <div className="p-6 border-b border-[var(--glass-border)] no-shrink">
                <div className="stack-x v-center h-between">
                  <div className="stack-x v-center gap-3">
                    <File className="h-6 w-6 text-[var(--accent)] no-shrink" />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                      {selectedFile.name}
                    </h3>
                  </div>
                  <div className="stack-x v-center gap-3 no-shrink">
                    <button className="control bg-[var(--accent)] text-[var(--text-primary)]">
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <CloseButton
                      onClick={() => setSelectedFile(null)}
                      size="sm"
                      label="Close file preview"
                      className="border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/70 text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>
              <div className="file-preview-content flex-fill">
                <div className="stack-y gap-4">
                  <div className="file-preview-info text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Path:</span>
                      <p className="text-[var(--text-primary)]">{selectedFile.path}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Category:</span>
                      <p className="text-[var(--text-primary)] capitalize">
                        {selectedFile.category}
                      </p>
                    </div>
                    {selectedFile.size && (
                      <div>
                        <span className="text-[var(--text-muted)]">Size:</span>
                        <p className="text-[var(--text-primary)]">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    )}
                    {selectedFile.modified && (
                      <div>
                        <span className="text-[var(--text-muted)]">Modified:</span>
                        <p className="text-[var(--text-primary)]">{selectedFile.modified}</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[var(--glass-border)] pt-4">
                    <h4 className="text-[var(--text-primary)] font-medium mb-2">Content Preview</h4>
                    <pre className="bg-[var(--glass-bg-strong)] p-4 rounded-[var(--radius-lg)] text-[var(--text-secondary)] font-mono text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">
                      {selectedFile.content || 'File content would be displayed here...'}
                    </pre>
                  </div>
                </div>
              </div>
            </Surface>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default FileBrowser;
