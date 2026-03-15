import React, { useState, useCallback, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { useCVManagement } from '../hooks/useCVManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const UploadWidget: React.FC = () => {
  const { uploadCv, uploadStatus, uploadError } = useCVManagement();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);
      uploadCv(selectedFile).then((newId) => {
        if (newId) {
          // You can add logic here if you want to auto-select the new CV
          console.log(`Upload successful, new CV ID: ${newId}`);
        }
      });
    },
    [uploadCv]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const handleReset = () => {
    setFile(null);
    // Potentially call a function to clear the upload status in the store if needed
  };

  const isLoading = uploadStatus === 'loading';

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Upload Resume</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="form-file-upload" onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
          <input
            ref={inputRef}
            type="file"
            id="input-file-upload"
            className="hidden"
            onChange={handleChange}
            accept=".pdf,.doc,.docx"
          />

          {!file && !isLoading && (
            <label
              htmlFor="input-file-upload"
              className={cn(
                'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800',
                { 'border-blue-500 bg-blue-50 dark:bg-blue-900/20': dragActive }
              )}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-slate-500 dark:text-slate-400" />
                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">PDF, DOC, or DOCX</p>
              </div>
              {dragActive && (
                <div
                  className="absolute w-full h-full"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                ></div>
              )}
            </label>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center w-full h-48">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Parsing your resume...
              </p>
            </div>
          )}

          {!isLoading && file && (
            <div className="flex items-center justify-between w-full h-48 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center space-x-4">
                <File className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{file.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button onClick={handleReset} variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
        </form>
      </CardContent>
    </Card>
  );
};
