import React, { useState } from 'react';
import { User, Mail, Phone, Calendar, Camera, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile, updateEmail, sendEmailVerification } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    phoneNumber: currentUser?.phoneNumber || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setLoading(true);
    setMessage(null);

    try {
      // Update display name
      if (formData.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: formData.displayName
        });
      }

      // Update email (requires re-authentication in production)
      if (formData.email !== currentUser.email) {
        await updateEmail(currentUser, formData.email);
        await sendEmailVerification(currentUser);
        setMessage({
          type: 'success',
          text: 'Profile updated! Please verify your new email address.'
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!'
        });
      }

      setIsEditing(false);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      console.error('Profile update error:', error);
      let errorMessage = 'Failed to update profile. Please try again.';
      
      if (firebaseError.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign in again to update your email address.';
      } else if (firebaseError.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use by another account.';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: currentUser?.displayName || '',
      email: currentUser?.email || '',
      phoneNumber: currentUser?.phoneNumber || '',
    });
    setIsEditing(false);
    setMessage(null);
  };

  const handleResendVerification = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await sendEmailVerification(currentUser);
      setMessage({
        type: 'success',
        text: 'Verification email sent! Please check your inbox.'
      });
    } catch (error) {
      console.error('Email verification error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to send verification email. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  const displayName = currentUser.displayName || 'User';
  const email = currentUser.email || '';
  const photoURL = currentUser.photoURL;
  const creationTime = currentUser.metadata.creationTime;
  const lastSignInTime = currentUser.metadata.lastSignInTime;

  // Get initials from display name or email
  const getInitials = (name: string, email: string) => {
    if (name && name !== 'User') {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <>
      <Title>Profile - OpenStay</Title>
      <SEOMeta
        title="Profile - OpenStay"
        description="Manage your OpenStay profile and account settings"
        keywords="profile, account, settings, OpenStay"
      />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-8">
              <div className="flex items-center space-x-6">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center overflow-hidden">
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt={`${displayName} profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-medium">
                        {getInitials(displayName, email)}
                      </span>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-700 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                  <p className="text-gray-600 mt-1">{email}</p>
                  
                  {/* Email Verification Status */}
                  <div className="mt-3 flex items-center space-x-4">
                    {currentUser.emailVerified ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Mail className="w-4 h-4 mr-1" />
                        Email Verified
                      </span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                          <Mail className="w-4 h-4 mr-1" />
                          Email Not Verified
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResendVerification}
                          disabled={loading}
                        >
                          Resend Verification
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                <div>
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                        className="flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={cn(
              "mb-6 p-4 rounded-lg",
              message.type === 'success' ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            )}>
              {message.text}
            </div>
          )}

          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Display Name
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Enter your display name"
                  />
                ) : (
                  <p className="text-gray-900">{displayName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                  />
                ) : (
                  <p className="text-gray-900">{email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                {isEditing ? (
                  <Input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-gray-900">{currentUser.phoneNumber || 'Not provided'}</p>
                )}
              </div>

              {/* Account Details */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Account Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account Created:</span>
                    <p className="text-gray-900 mt-1">
                      {creationTime ? new Date(creationTime).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Last Sign In:</span>
                    <p className="text-gray-900 mt-1">
                      {lastSignInTime ? new Date(lastSignInTime).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">User ID:</span>
                    <p className="text-gray-900 mt-1 font-mono text-xs break-all">
                      {currentUser.uid}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Sign-in Method:</span>
                    <p className="text-gray-900 mt-1">
                      {currentUser.providerData.length > 0 
                        ? currentUser.providerData.map(provider => {
                            switch (provider.providerId) {
                              case 'google.com':
                                return 'Google';
                              case 'password':
                                return 'Email/Password';
                              default:
                                return provider.providerId;
                            }
                          }).join(', ')
                        : 'Email/Password'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
