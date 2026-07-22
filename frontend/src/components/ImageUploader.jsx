import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { adminAPI } from '../api';

const ImageUploader = ({ images, onChange, maxFiles = 5 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState([]); // Array of { id, file, name, progress, status, error }
  const fileInputRef = useRef(null);

  // Compress image client-side using Canvas
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file); // fallback to original file
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.8 // Quality 0.8
          );
        };
      };
    });
  };

  const uploadSingleFile = async (uploadItem) => {
    // Mark as uploading
    setUploads((prev) =>
      prev.map((item) =>
        item.id === uploadItem.id
          ? { ...item, status: 'uploading', progress: 0, error: '' }
          : item
      )
    );

    try {
      const compressed = await compressImage(uploadItem.file);
      const formData = new FormData();
      formData.append('image', compressed);

      // Perform upload using adminAPI but with progress config
      const response = await adminAPI.uploadImage(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id ? { ...item, progress: percentCompleted } : item
            )
          );
        },
      });

      // Update upload state to completed
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? { ...item, status: 'done', progress: 100, url: response.data.image }
            : item
        )
      );

      // Notify parent component about new image URL
      onChange([...images, response.data.image]);
    } catch (error) {
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? {
                ...item,
                status: 'error',
                error: error.response?.data?.message || 'Upload failed. Try again.',
              }
            : item
        )
      );
    }
  };

  const handleFiles = async (filesList) => {
    const selectedFiles = Array.from(filesList);
    const validFiles = selectedFiles.filter((f) => f.type.startsWith('image/'));

    if (images.length + uploads.length + validFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} images.`);
      return;
    }

    const newUploads = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      progress: 0,
      status: 'pending',
      error: '',
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Trigger upload sequentially
    for (const item of newUploads) {
      await uploadSingleFile(item);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleRemoveUpload = (idToRemove) => {
    setUploads((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      {images.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'border-primary-500 bg-primary-50/30'
              : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:text-primary-500 transition-colors">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Drag and drop your images here, or <span className="text-primary-600 underline">browse</span>
            </p>
            <p className="text-[10px] text-slate-400 font-bold">
              Supports JPEG, PNG, WEBP (Auto-compressed, up to {maxFiles} images)
            </p>
          </div>
        </div>
      )}

      {/* Previews and Upload Progress list */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Existing uploaded images */}
        {images.map((url, index) => (
          <div
            key={index}
            className="relative group aspect-square rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 shadow-sm"
          >
            <img
              src={url}
              alt={`preview-${index}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-655 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Current upload queue items */}
        {uploads.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/80 backdrop-blur-sm p-3 flex flex-col justify-between shadow-sm"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80%]">
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveUpload(item.id)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress indicators */}
            <div className="space-y-2">
              {item.status === 'uploading' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-primary-600">
                    <span>Uploading...</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-150 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-500 h-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {item.status === 'done' && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Success!</span>
                </div>
              )}

              {item.status === 'error' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-red-655">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Failed</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => uploadSingleFile(item)}
                    className="flex items-center gap-1 text-[9px] font-bold text-primary-600 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageUploader;
