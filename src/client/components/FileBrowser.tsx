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
    { id: 'all', name: 'All Files', icon: Folder, color: 'text-blue-400' },
    { id: 'emails', name: 'Emails & Communications', icon: Mail, color: 'text-green-400' },
    { id: 'documents', name: 'Legal Documents', icon: FileText, color: 'text-red-400' },
    { id: 'images', name: 'Images & Photos', icon: Image, color: 'text-purple-400' },
    { id: 'flight_logs', name: 'Flight Records', icon: FileSpreadsheet, color: 'text-yellow-400' },
    { id: 'testimonies', name: 'Testimonies', icon: User, color: 'text-cyan-400' },
    { id: 'financial', name: 'Financial Records', icon: FileSpreadsheet, color: 'text-orange-400' },
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

      const mapped: FileItem[] = rows.map((doc: any) => {
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">Browse by Category</h3>
        {loadError && (
          <div className="mb-4 text-sm text-rose-300 bg-rose-900/30 border border-rose-400/30 rounded px-3 py-2">
            {loadError}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Icon className="h-6 w-6 mb-2" />
                <span className="text-xs text-center font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files by name or content..."
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* File List */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {selectedCategory === 'all'
                ? 'All Files'
                : categories.find((c) => c.id === selectedCategory)?.name}
            </h3>
            <span className="text-gray-400 text-sm">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredFiles.map((file, index) => {
            const Icon = getFileIcon(file);
            return (
              <div
                key={index}
                onClick={() => handleFileClick(file)}
                className="p-4 hover:bg-gray-700 cursor-pointer transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-cyan-400" />
                    <div>
                      <h4 className="text-white font-medium">{file.name}</h4>
                      <p className="text-gray-400 text-sm">{file.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    {file.size && <span>{formatFileSize(file.size)}</span>}
                    {file.modified && <span>{file.modified}</span>}
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredFiles.length === 0 && (
          <div className="p-8 text-center">
            <File className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h4 className="text-gray-300 font-medium mb-2">No files found</h4>
            <p className="text-gray-500">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {selectedFile &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <File className="h-6 w-6 text-cyan-400" />
                    <h3 className="text-xl font-semibold text-white">{selectedFile.name}</h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition-colors">
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <CloseButton
                      onClick={() => setSelectedFile(null)}
                      size="sm"
                      label="Close file preview"
                      className="border-slate-600 bg-slate-900/70 text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Path:</span>
                      <p className="text-white">{selectedFile.path}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <p className="text-white capitalize">{selectedFile.category}</p>
                    </div>
                    {selectedFile.size && (
                      <div>
                        <span className="text-gray-400">Size:</span>
                        <p className="text-white">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    )}
                    {selectedFile.modified && (
                      <div>
                        <span className="text-gray-400">Modified:</span>
                        <p className="text-white">{selectedFile.modified}</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-white font-medium mb-2">Content Preview</h4>
                    <div className="bg-gray-900 p-4 rounded-lg text-gray-300 font-mono text-sm max-h-64 overflow-y-auto">
                      {selectedFile.content || 'File content would be displayed here...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default FileBrowser;
