import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({ 
  onFileSelect, 
  accept = { "text/csv": [".csv"], "application/vnd.ms-excel": [".xls"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
  maxSize = 5 * 1024 * 1024, // 5MB
  disabled = false,
  className 
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  });

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className={cn("w-full", className)}>
      <Card 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed cursor-pointer transition-colors",
          isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <CardContent className="p-6">
          <input {...getInputProps()} />
          
          {selectedFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <File className="text-blue-500 mr-2" size={20} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="mx-auto text-slate-400 mb-2" size={32} />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {isDragActive ? "Drop the file here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500">
                CSV, XLS, XLSX files up to {(maxSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {fileRejections.length > 0 && (
        <div className="mt-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-xs text-red-600">
              {errors.map(e => (
                <p key={e.code}>{e.message}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
