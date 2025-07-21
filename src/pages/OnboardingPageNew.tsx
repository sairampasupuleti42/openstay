import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadBytes, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfilePicture, completeOnboarding } from '@/services/userService';
import Stepper from '@/components/Stepper';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import UserDiscovery from '@/components/UserDiscovery';
import PersonalInfoForm from '@/components/PersonalInfoForm';
import TravelPreferences from '@/components/TravelPreferences';

const OnboardingPage: React.FC = () => {
  const { currentUser: user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    bio: '',
    location: '',
    occupation: '',
    interests: [] as string[]
  });
  const [preferences, setPreferences] = useState({
    travelStyle: '',
    budget: '',
    accommodation: '',
    activities: [] as string[]
  });

  const steps = [
    {
      id: 0,
      title: 'Welcome',
      description: 'Get started with OpenStay'
    },
    {
      id: 1,
      title: 'Profile Picture',
      description: 'Add your photo'
    },
    {
      id: 2,
      title: 'Personal Info',
      description: 'Tell us about yourself'
    },
    {
      id: 3,
      title: 'Discover People',
      description: 'Connect with others'
    },
    {
      id: 4,
      title: 'Preferences',
      description: 'Set your travel preferences'
    }
  ];

  const handleProfilePictureSelected = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update user profile
      await updateProfilePicture(user.uid, downloadURL);

      // Move to next step
      setCurrentStep(2);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. You can add it later from your profile.');
      setCurrentStep(2);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipProfilePicture = () => {
    setCurrentStep(2);
  };

  const handlePersonalInfoComplete = (info: typeof personalInfo) => {
    setPersonalInfo(info);
    setCurrentStep(3);
  };

  const handleSkipPersonalInfo = () => {
    setCurrentStep(3);
  };

  const handleDiscoveryComplete = () => {
    setCurrentStep(4);
  };

  const handleSkipDiscovery = () => {
    setCurrentStep(4);
  };

  const handlePreferencesComplete = async (prefs: typeof preferences) => {
    if (!user) return;

    try {
      setPreferences(prefs);
      await completeOnboarding(user.uid);
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigate('/');
    }
  };

  const handleSkipPreferences = async () => {
    if (!user) return;

    try {
      await completeOnboarding(user.uid);
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigate('/');
    }
  };

  const renderStepContent = () => {
    if (!user) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome to OpenStay, {user.displayName || 'Friend'}! 🎉
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We're excited to have you join our community. Let's set up your profile 
                and help you discover amazing people and places.
              </p>
            </div>
            
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="font-semibold text-primary-900 mb-2">What's next?</h3>
              <ul className="text-sm text-primary-800 space-y-1 text-left">
                <li>• Add a profile picture (optional)</li>
                <li>• Share your personal information</li>
                <li>• Discover and connect with people</li>
                <li>• Set your travel preferences</li>
                <li>• Start exploring OpenStay</li>
              </ul>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Let's Get Started
            </button>
          </div>
        );

      case 1:
        return (
          <ProfilePictureUpload
            currentPhotoURL={user.photoURL || undefined}
            onPhotoSelected={handleProfilePictureSelected}
            onSkip={handleSkipProfilePicture}
            isUploading={isUploading}
          />
        );

      case 2:
        return (
          <PersonalInfoForm
            initialData={personalInfo}
            onComplete={handlePersonalInfoComplete}
            onSkip={handleSkipPersonalInfo}
          />
        );

      case 3:
        return (
          <UserDiscovery
            currentUserId={user.uid}
            onComplete={handleDiscoveryComplete}
            onSkip={handleSkipDiscovery}
          />
        );

      case 4:
        return (
          <TravelPreferences
            initialData={preferences}
            onComplete={handlePreferencesComplete}
            onSkip={handleSkipPreferences}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Stepper */}
        <div className="mb-8">
          <Stepper
            steps={steps}
            currentStep={currentStep}
          />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {renderStepContent()}
        </div>

        {/* Skip all option */}
        {currentStep > 0 && (
          <div className="text-center mt-6">
            <button
              onClick={handleSkipPreferences}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip onboarding and go to OpenStay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
