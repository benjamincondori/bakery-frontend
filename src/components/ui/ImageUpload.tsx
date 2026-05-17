import { useRef, useState, useCallback } from 'react';
import { ImageIcon, Upload, X } from 'lucide-react';
import api from '@/lib/axios';
import toast from '@/lib/toast';

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  className?: string;
  aspectRatio?: 'square' | 'wide';
}

export default function ImageUpload({ value, onChange, className = '', aspectRatio = 'wide' }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const heightClass = aspectRatio === 'square' ? 'h-32 w-32' : 'h-36 w-full';

  const uploadFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.data?.url);
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />

      {value ? (
        <div className={`relative group rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 ${heightClass}`}>
          <img src={value} alt="Imagen" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-2 bg-white rounded-lg text-stone-700 hover:bg-stone-100 transition-colors"
              title="Cambiar imagen"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="p-2 bg-white rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
              title="Quitar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          disabled={isUploading}
          className={`${heightClass} rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-stone-300 dark:border-stone-600 hover:border-primary-400 hover:bg-stone-50 dark:hover:bg-stone-800/50'
          } ${isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isUploading ? (
            <>
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-stone-500">Subiendo...</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-7 h-7 text-stone-400" />
              <div className="text-center px-2">
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  Arrastra o haz clic
                </p>
                <p className="text-xs text-stone-400 mt-0.5">PNG, JPG, WEBP · máx 5MB</p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
