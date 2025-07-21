import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface ProfilePictureUploadProps {
  currentPhotoURL?: string;
  onPhotoSelected: (file: File) => void;
  onSkip?: () => void;
  isUploading?: boolean;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentPhotoURL,
  onPhotoSelected,
  onSkip,
  isUploading = false
}) => {
  const [previewURL, setPreviewURL] = useState<string | null>(currentPhotoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewURL(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      onPhotoSelected(file);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setPreviewURL(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add Your Profile Picture
        </h2>
        <p className="text-gray-600">
          Help others recognize you by adding a profile picture
        </p>
      </div>

      <div className="relative">
        {previewURL ? (
          <div className="relative">
            <img
              src={previewURL}
              alt="Profile preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
            />
            <button
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-300 border-dashed flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <div className="flex flex-col space-y-3 w-full max-w-xs">
        <button
          onClick={handleCameraClick}
          disabled={isUploading}
          className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          <span>{isUploading ? 'Uploading...' : 'Choose Photo'}</span>
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isUploading}
            className="text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center max-w-xs">
        Supported formats: JPG, PNG, GIF. Maximum size: 5MB
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
