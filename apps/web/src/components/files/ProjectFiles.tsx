'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatRelative } from '@/lib/utils';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectFileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  projectId: string;
  uploadedById: string;
  createdAt: string;
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
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Fetch files for project
  const { data, isLoading } = useQuery<{ files: ProjectFileItem[] }>({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/files/project/${projectId}`);
      const payload = res.data.data;
      return { files: payload?.files || payload || [] };
    },
  });

  const files = data?.files ?? [];

  // 2. Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/api/files/project/${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
      toast.success('File uploaded successfully');
      setIsUploading(false);
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to upload file';
      toast.error(errorMsg);
      setIsUploading(false);
    },
  });

  // 3. Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiClient.delete(`/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activity', projectId] });
      toast.success('File deleted');
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 10MB');
      return;
    }
    setIsUploading(true);
    uploadMutation.mutate(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon size={20} className="text-blue-600" />;
    if (mime === 'application/pdf') return <FileText size={20} className="text-red-600" />;
    if (mime.includes('spreadsheet') || mime.includes('excel'))
      return <FileSpreadsheet size={20} className="text-emerald-600" />;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed'))
      return <FileArchive size={20} className="text-amber-600" />;
    if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript'))
      return <FileCode size={20} className="text-indigo-600" />;
    return <GenericFileIcon size={20} className="text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Drag & Drop Header Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white rounded-2xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
        </div>
        <h4 className="font-bold text-gray-900 text-sm">
          {isUploading ? 'Uploading file...' : 'Upload project documents and assets'}
        </h4>
        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
          Drag and drop your file here, or browse from your computer. Max file size: 10MB.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-xs"
        >
          <Plus size={14} /> Choose File
        </button>
      </div>

      {/* File List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-sm text-gray-900">Project Files ({files.length})</h3>
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
            <h4 className="font-bold text-gray-900 text-sm">No files uploaded yet</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Share specifications, design mocks, logs, or documentation with your team.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {files.map((file) => {
              const isOwner = file.uploadedById === user?.id || canManage;
              return (
                <div
                  key={file.id}
                  className="p-4 px-6 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-gray-900 truncate">{file.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-medium">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>•</span>
                        <span>Uploaded by {file.uploadedBy.name}</span>
                        <span>•</span>
                        <span>{formatRelative(file.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/files/${file.id}/download`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                      title="Download file"
                    >
                      <Download size={16} />
                    </a>

                    {isOwner && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${file.fileName}"?`)) {
                            deleteMutation.mutate(file.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="Delete file"
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
    </div>
  );
}
