import React from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, accept }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="d-none"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="d-flex flex-column align-items-center">
          <Upload className="text-gray-400 mb-3" size={40} />
          <p className="text-gray-500">
            Drag and drop your file here, or{' '}
            <span className="text-primary">browse</span>
          </p>
        </div>
      </label>
    </div>
  );
}; 