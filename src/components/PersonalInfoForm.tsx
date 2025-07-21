import React, { useState } from 'react';
import { MapPin, Briefcase, User, Hash } from 'lucide-react';

interface PersonalInfo {
  bio: string;
  location: string;
  occupation: string;
  interests: string[];
}

interface PersonalInfoFormProps {
  initialData: PersonalInfo;
  onComplete: (data: PersonalInfo) => void;
  onSkip?: () => void;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  initialData,
  onComplete,
  onSkip
}) => {
  const [formData, setFormData] = useState<PersonalInfo>(initialData);
  const [newInterest, setNewInterest] = useState('');

  const commonInterests = [
    'Travel', 'Photography', 'Food', 'Music', 'Art', 'Sports',
    'Reading', 'Movies', 'Hiking', 'Cooking', 'Technology', 'Culture',
    'Adventure', 'History', 'Nature', 'Languages', 'Gaming', 'Fashion'
  ];

  const handleInputChange = (field: keyof PersonalInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addInterest = (interest: string) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleAddCustomInterest = () => {
    if (newInterest.trim()) {
      addInterest(newInterest.trim());
      setNewInterest('');
    }
  };

  const handleSubmit = () => {
    onComplete(formData);
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell Us About Yourself
        </h2>
        <p className="text-gray-600">
          Help others get to know you better by sharing some personal information
        </p>
      </div>

      <div className="space-y-6">
        {/* Bio */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4" />
            <span>Bio</span>
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell us a bit about yourself..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.bio.length}/500 characters
          </p>
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4" />
            <span>Location</span>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="City, Country"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Occupation */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Briefcase className="w-4 h-4" />
            <span>Occupation</span>
          </label>
          <input
            type="text"
            value={formData.occupation}
            onChange={(e) => handleInputChange('occupation', e.target.value)}
            placeholder="What do you do for work?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Interests */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4" />
            <span>Interests</span>
          </label>
          
          {/* Selected Interests */}
          {formData.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded-full"
                >
                  {interest}
                  <button
                    onClick={() => removeInterest(interest)}
                    className="ml-2 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Common Interests */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Popular interests:</p>
            <div className="flex flex-wrap gap-2">
              {commonInterests
                .filter(interest => !formData.interests.includes(interest))
                .map((interest) => (
                  <button
                    key={interest}
                    onClick={() => addInterest(interest)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    {interest}
                  </button>
                ))}
            </div>
          </div>

          {/* Custom Interest Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomInterest()}
              placeholder="Add your own interest..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={handleAddCustomInterest}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col space-y-3 pt-4">
        <button
          onClick={handleSubmit}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Continue
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip this step
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoForm;
