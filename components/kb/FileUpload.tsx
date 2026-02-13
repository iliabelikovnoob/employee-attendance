'use client';

import { useState, useCallback } from 'react';
import { IoCloudUploadOutline, IoDocumentOutline, IoCloseCircle } from 'react-icons/io5';

interface FileUploadProps {
  onFileUploaded: (fileData: {
    originalFileName: string;
    filePath: string;
    fileSize: number;
    contentType: 'DOCX' | 'PDF';
    htmlContent: string | null;
  }) => void;
  currentFile?: {
    originalFileName: string;
    filePath: string;
    fileSize: number;
  } | null;
  onFileRemove?: () => void;
}

export default function FileUpload({ onFileUploaded, currentFile, onFileRemove }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await uploadFile(files[0]);
      }
    },
    []
  );

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  }, []);

  const uploadFile = async (file: File) => {
    // Проверка типа файла
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Недопустимый тип файла. Разрешены только .docx и .pdf');
      return;
    }

    // Проверка размера (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Файл слишком большой. Максимальный размер: 50MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/kb/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке файла');
      }

      const data = await response.json();
      onFileUploaded(data.file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {currentFile ? (
        // Отображение загруженного файла
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-3">
            <IoDocumentOutline className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {currentFile.originalFileName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatFileSize(currentFile.fileSize)}
              </div>
            </div>
          </div>
          {onFileRemove && (
            <button
              onClick={onFileRemove}
              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Удалить файл"
            >
              <IoCloseCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        // Зона загрузки файла
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".docx,.pdf"
            onChange={handleFileSelect}
            disabled={uploading}
          />

          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            <IoCloudUploadOutline className="w-16 h-16 text-gray-400 dark:text-gray-500" />

            {uploading ? (
              <div className="space-y-2">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  Загрузка файла...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Перетащите файл сюда или нажмите для выбора
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Поддерживаются форматы: .docx, .pdf (макс. 50MB)
                </p>
              </div>
            )}
          </label>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
