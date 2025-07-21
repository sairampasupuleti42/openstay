import React, { useState } from 'react';
import { Plane, DollarSign, Home, Activity } from 'lucide-react';

interface TravelPreferences {
  travelStyle: string;
  budget: string;
  accommodation: string;
  activities: string[];
}

interface TravelPreferencesProps {
  initialData: TravelPreferences;
  onComplete: (data: TravelPreferences) => void;
  onSkip?: () => void;
}

const TravelPreferences: React.FC<TravelPreferencesProps> = ({
  initialData,
  onComplete,
  onSkip
}) => {
  const [preferences, setPreferences] = useState<TravelPreferences>(initialData);

  const travelStyles = [
    { id: 'adventure', label: 'Adventure Seeker', description: 'Love exploring and trying new things' },
    { id: 'relaxation', label: 'Relaxation', description: 'Prefer peaceful and restful trips' },
    { id: 'cultural', label: 'Cultural Explorer', description: 'Interested in history and local culture' },
    { id: 'social', label: 'Social Traveler', description: 'Enjoy meeting new people and group activities' },
    { id: 'luxury', label: 'Luxury Traveler', description: 'Prefer high-end experiences and comfort' },
    { id: 'budget', label: 'Budget Conscious', description: 'Focus on affordable travel options' }
  ];

  const budgetRanges = [
    { id: 'budget', label: 'Budget', range: '$0 - $50/day', description: 'Backpacker style' },
    { id: 'mid-range', label: 'Mid-range', range: '$50 - $150/day', description: 'Comfortable travel' },
    { id: 'luxury', label: 'Luxury', range: '$150+/day', description: 'Premium experiences' },
    { id: 'flexible', label: 'Flexible', range: 'Varies by trip', description: 'Depends on destination' }
  ];

  const accommodationTypes = [
    { id: 'hostel', label: 'Hostels', description: 'Social and budget-friendly' },
    { id: 'hotel', label: 'Hotels', description: 'Comfortable and convenient' },
    { id: 'airbnb', label: 'Airbnb/Rentals', description: 'Local experience' },
    { id: 'resort', label: 'Resorts', description: 'All-inclusive luxury' },
    { id: 'camping', label: 'Camping', description: 'Outdoor adventures' },
    { id: 'mixed', label: 'Mixed', description: 'Varies by trip' }
  ];

  const activityTypes = [
    'Hiking & Nature', 'Museums & Culture', 'Food & Dining', 'Nightlife & Entertainment',
    'Adventure Sports', 'Beach & Water Sports', 'Photography', 'Shopping',
    'Local Tours', 'Music & Festivals', 'Art & Galleries', 'Wellness & Spa',
    'Sports Events', 'Wildlife & Safari', 'Architecture', 'Volunteering'
  ];

  const handleStyleChange = (style: string) => {
    setPreferences(prev => ({ ...prev, travelStyle: style }));
  };

  const handleBudgetChange = (budget: string) => {
    setPreferences(prev => ({ ...prev, budget }));
  };

  const handleAccommodationChange = (accommodation: string) => {
    setPreferences(prev => ({ ...prev, accommodation }));
  };

  const toggleActivity = (activity: string) => {
    setPreferences(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  const handleSubmit = () => {
    onComplete(preferences);
  };

  return (
    <div className="flex flex-col space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Travel Preferences
        </h2>
        <p className="text-gray-600">
          Help us personalize your OpenStay experience
        </p>
      </div>

      {/* Travel Style */}
      <div>
        <h3 className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4">
          <Plane className="w-5 h-5" />
          <span>Travel Style</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {travelStyles.map((style) => (
            <label
              key={style.id}
              className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                preferences.travelStyle === style.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="travelStyle"
                value={style.id}
                checked={preferences.travelStyle === style.id}
                onChange={() => handleStyleChange(style.id)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{style.label}</div>
                <div className="text-sm text-gray-600">{style.description}</div>
              </div>
              {preferences.travelStyle === style.id && (
                <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Budget Range */}
      <div>
        <h3 className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4">
          <DollarSign className="w-5 h-5" />
          <span>Budget Range</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {budgetRanges.map((budget) => (
            <label
              key={budget.id}
              className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                preferences.budget === budget.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="budget"
                value={budget.id}
                checked={preferences.budget === budget.id}
                onChange={() => handleBudgetChange(budget.id)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{budget.label}</div>
                <div className="text-sm text-primary-600 font-medium">{budget.range}</div>
                <div className="text-sm text-gray-600">{budget.description}</div>
              </div>
              {preferences.budget === budget.id && (
                <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Accommodation Preference */}
      <div>
        <h3 className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4">
          <Home className="w-5 h-5" />
          <span>Accommodation Preference</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accommodationTypes.map((accommodation) => (
            <label
              key={accommodation.id}
              className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                preferences.accommodation === accommodation.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="accommodation"
                value={accommodation.id}
                checked={preferences.accommodation === accommodation.id}
                onChange={() => handleAccommodationChange(accommodation.id)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{accommodation.label}</div>
                <div className="text-sm text-gray-600">{accommodation.description}</div>
              </div>
              {preferences.accommodation === accommodation.id && (
                <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Preferred Activities */}
      <div>
        <h3 className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4">
          <Activity className="w-5 h-5" />
          <span>Preferred Activities</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">Select all that interest you</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activityTypes.map((activity) => (
            <label
              key={activity}
              className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                preferences.activities.includes(activity)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={preferences.activities.includes(activity)}
                onChange={() => toggleActivity(activity)}
                className="sr-only"
              />
              <span className="text-sm font-medium text-gray-900">{activity}</span>
              {preferences.activities.includes(activity) && (
                <div className="ml-auto w-4 h-4 bg-primary-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col space-y-3 pt-4">
        <button
          onClick={handleSubmit}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Complete Setup
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

export default TravelPreferences;
