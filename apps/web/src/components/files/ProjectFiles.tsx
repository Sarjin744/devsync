'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatRelative } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  File as GenericFileIcon,
  Plus,
  Search,
  ArrowUpDown,
  Edit2,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectFileItem {
  id: string;
  fileName: string;
  originalName: string;
  storageKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  size: number;
  url: string;
  projectId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
}

export function ProjectFiles({
  projectId,
  canManage = false,
}: {
  projectId: string;
  canManage?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [isDragging, setIsDragging] = useState(false);

  // Upload Progress
  const [uploadQueue, setUploadQueue] = useState<
    { name: string; progress: number; isComplete: boolean; isError?: boolean }[]
  >([]);

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<ProjectFileItem | null>(null);

  // Rename Modal
  const [renamingFile, setRenamingFile] = useState<ProjectFileItem | null>(null);
  const [newFileName, setNewFileName] = useState('');

  // 1. Fetch files for project
  const { data, isLoading } = useQuery<{
    files: ProjectFileItem[];
    pagination?: { total: number };
  }>({
    queryKey: ['project-files', projectId, sort, search],
    queryFn: async () => {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await apiClient.get(
        `/api/projects/${projectId}/files?sort=${sort}${searchParam}`,
      );
      const payload = res.data.data;
      return {
        files: payload?.files || payload || [],
        pagination: payload?.pagination || res.data.pagination,
      };
    },
  });

  const files = data?.files ?? [];

  // 2. Real-Time Socket.IO event listeners
  useEffect(() => {
    if (!user) return;
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('devsync_access_token') || ''
        : '';
    const socket = getSocket(token);

    if (!socket.connected) socket.connect();

    socket.emit('project:join', { projectId });

    const handleFileNew = (newFile: ProjectFileItem) => {
      queryClient.setQueryData(
        ['project-files', projectId, sort, search],
        (old: { files: ProjectFileItem[] } | undefined) => {
          if (!old) return { files: [newFile] };
          if (old.files.some((f) => f.id === newFile.id)) return old;
          return { ...old, files: [newFile, ...old.files] };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
    };

    const handleFileUpdated = (updatedFile: ProjectFileItem) => {
      queryClient.setQueryData(
        ['project-files', projectId, sort, search],
        (old: { files: ProjectFileItem[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            files: old.files.map((f) => (f.id === updatedFile.id ? updatedFile : f)),
          };
        },
      );
    };

    const handleFileDeleted = (data: { fileId: string }) => {
      queryClient.setQueryData(
        ['project-files', projectId, sort, search],
        (old: { files: ProjectFileItem[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            files: old.files.filter((f) => f.id !== data.fileId),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
    };

    socket.on('file:new', handleFileNew);
    socket.on('file:updated', handleFileUpdated);
    socket.on('file:deleted', handleFileDeleted);

    return () => {
      socket.off('file:new', handleFileNew);
      socket.off('file:updated', handleFileUpdated);
      socket.off('file:deleted', handleFileDeleted);
    };
  }, [projectId, sort, search, user, queryClient]);

  // 3. Upload Mutation
  const uploadSingleFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds 25MB maximum limit`);
      return;
    }

    setUploadQueue((prev) => [...prev, { name: file.name, progress: 10, isComplete: false }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post(`/api/projects/${projectId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.name === file.name ? { ...item, progress: Math.min(percent, 95) } : item,
              ),
            );
          }
        },
      });

      setUploadQueue((prev) =>
        prev.map((item) =>
          item.name === file.name ? { ...item, progress: 100, isComplete: true } : item,
        ),
      );

      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
      toast.success(`Uploaded "${file.name}"`);

      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((item) => item.name !== file.name));
      }, 3000);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to upload file';
      toast.error(errorMsg);
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.name === file.name ? { ...item, isError: true, isComplete: true } : item,
        ),
      );
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach((f) => uploadSingleFile(f));
  };

  // 4. Rename Mutation
  const renameMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      const res = await apiClient.patch(`/api/files/${fileId}`, { originalName: newName });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
      toast.success('File renamed successfully');
      setRenamingFile(null);
      setNewFileName('');
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to rename file';
      toast.error(errorMsg);
    },
  });

  // 5. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiClient.delete(`/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
      toast.success('File deleted');
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to delete file';
      toast.error(errorMsg);
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon size={20} className="text-blue-600" />;
    if (mime === 'application/pdf') return <FileText size={20} className="text-rose-600" />;
    if (mime.includes('spreadsheet') || mime.includes('excel'))
      return <FileSpreadsheet size={20} className="text-emerald-600" />;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed'))
      return <FileArchive size={20} className="text-amber-600" />;
    if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript'))
      return <FileCode size={20} className="text-indigo-600" />;
    return <GenericFileIcon size={20} className="text-gray-500" />;
  };

  const isPreviewable = (mime: string) => {
    return mime.startsWith('image/') || mime === 'application/pdf' || mime === 'text/plain';
  };

  return (
    <div className="space-y-6">
      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFilesSelected(e.dataTransfer.files);
        }}
        className={`bg-white rounded-2xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Upload size={24} />
        </div>
        <h4 className="font-bold text-gray-900 text-sm">
          Upload project documents, mockups, and assets
        </h4>
        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
          Drag and drop files here, or browse from your device. Max file size: 25MB.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
        >
          <Plus size={14} /> Choose Files
        </button>

        {/* Upload Progress List */}
        {uploadQueue.length > 0 && (
          <div className="mt-6 space-y-2 max-w-md mx-auto text-left">
            {uploadQueue.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-50 border border-gray-100 p-3 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                  <span className="truncate max-w-[240px]">{item.name}</span>
                  <span>{item.isError ? 'Error' : `${item.progress}%`}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      item.isError
                        ? 'bg-rose-500'
                        : item.isComplete
                        ? 'bg-emerald-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter & Sort Bar */}
      <div className="bg-white p-4 px-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={15} className="text-gray-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700 cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A-Z)</option>
            <option value="size">Size (Largest)</option>
          </select>
        </div>
      </div>

      {/* File List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-sm text-gray-900">
            Files ({files.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <FileText size={22} />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">
              {search ? 'No files match your search' : 'No files uploaded yet'}
            </h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              {search
                ? 'Try searching for a different keyword or file name.'
                : 'Share project specifications, designs, or documentation with your team.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {files.map((file) => {
              const displayName = file.originalName || file.fileName;
              const isOwner = file.uploadedById === user?.id || canManage;

              return (
                <div
                  key={file.id}
                  className="p-4 px-6 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-gray-900 truncate">
                        {displayName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-medium">
                        <span>{formatFileSize(file.fileSize || file.size)}</span>
                        <span>•</span>
                        <span>Uploaded by {file.uploadedBy.name}</span>
                        <span>•</span>
                        <span>{formatRelative(file.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Preview Button (Images & PDFs) */}
                    {isPreviewable(file.mimeType) && (
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                    )}

                    {/* Direct Download */}
                    <a
                      href={`${
                        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                      }/api/files/${file.id}/download`}
                      download={displayName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                      title="Download"
                    >
                      <Download size={16} />
                    </a>

                    {/* Rename Button */}
                    {isOwner && (
                      <button
                        onClick={() => {
                          setRenamingFile(file);
                          setNewFileName(displayName);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                        title="Rename"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}

                    {/* Delete Button */}
                    {isOwner && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${displayName}"?`)) {
                            deleteMutation.mutate(file.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── PREVIEW MODAL ────────────────────────────────────────── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-sm text-gray-900 truncate">
                  {previewFile.originalName || previewFile.fileName}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatFileSize(previewFile.fileSize || previewFile.size)} • Uploaded by{' '}
                  {previewFile.uploadedBy.name}
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto py-6 flex items-center justify-center bg-gray-50 rounded-xl mt-4">
              {previewFile.mimeType.startsWith('image/') ? (
                <img
                  src={
                    previewFile.url?.startsWith('http')
                      ? previewFile.url
                      : `${
                          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                        }/api/files/${previewFile.id}/download`
                  }
                  alt={previewFile.originalName}
                  className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-sm"
                />
              ) : previewFile.mimeType === 'application/pdf' ? (
                <iframe
                  src={`${
                    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                  }/api/files/${previewFile.id}/download`}
                  className="w-full h-[60vh] rounded-lg border border-gray-200"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center py-12">
                  <AlertCircle size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700">Preview not available</p>
                  <a
                    href={`${
                      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                    }/api/files/${previewFile.id}/download`}
                    download
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                  >
                    <Download size={14} /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── RENAME MODAL ─────────────────────────────────────────── */}
      {renamingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="font-bold text-sm text-gray-900">Rename File</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                File Name
              </label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRenamingFile(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newFileName.trim()) {
                    renameMutation.mutate({
                      fileId: renamingFile.id,
                      newName: newFileName.trim(),
                    });
                  }
                }}
                disabled={renameMutation.isPending || !newFileName.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-xs"
              >
                {renameMutation.isPending ? 'Saving...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
