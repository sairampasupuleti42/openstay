import React from 'react';
import SocialFunctionalityValidator from '@/components/SocialFunctionalityValidator';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';

const ValidationPage: React.FC = () => {
  return (
    <>
      <Title>Functionality Validation - Openstay</Title>
      <SEOMeta
        title="Functionality Validation - Openstay"
        description="Test and validate social functionality"
        keywords="test, validation, social, follow, unfollow, messaging"
        canonicalUrl="/validation"
      />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <SocialFunctionalityValidator />
      </div>
    </>
  );
};

export default ValidationPage;
