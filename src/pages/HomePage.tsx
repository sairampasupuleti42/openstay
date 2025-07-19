import React from 'react';
import Layout from '@/components/Layout';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';

const HomePage: React.FC = () => {
  return (
    <>
      <SEOMeta 
        title="OpenStay - Connect Travelers with Local Hosts for Authentic Experiences"
        description="Host or travel with real people around the world. Join our verified community-based platform for authentic cultural exchanges and group travel experiences."
        keywords="community hosting, cultural exchange, travel groups, local hosts, verified hosting, authentic travel, budget travel, digital nomads, student groups, backpackers, group accommodation, cultural immersion, social travel, trust-based hosting, travel community, homestay alternative, couchsurfing alternative, group travel, verified hosts, travel experiences"
      />
      <Layout>
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <section aria-labelledby="hero-heading" className="text-center mb-12">
            <h1 id="hero-heading" className="text-5xl font-bold mb-6 font-heading">
              Host or Travel with <Title size="xl">OpenStay</Title>
            </h1>
            <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto">
              Connect with verified local hosts for authentic cultural experiences. 
              Join our community-based platform for meaningful travel and group accommodation.
            </p>
          </section>

          {/* Feature Cards */}
          <section aria-labelledby="features-heading" className="mb-12">
            <h2 id="features-heading" className="sr-only">Our Features</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <article className="bg-white/80 backdrop-blur-sm border border-primary-200 rounded-lg p-6 shadow-lg shadow-primary-100/50">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4" aria-hidden="true">
                  <div className="w-6 h-6 bg-primary-500 rounded"></div>
                </div>
                <h3 className="text-xl font-heading font-semibold text-primary-800 mb-2">
                  Verified Community
                </h3>
                <p className="text-muted-foreground">
                  Connect with trusted local hosts through our verified community-based platform.
                </p>
              </article>

              <article className="bg-white/80 backdrop-blur-sm border border-primary-200 rounded-lg p-6 shadow-lg shadow-primary-100/50">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4" aria-hidden="true">
                  <div className="w-6 h-6 bg-primary-500 rounded-full"></div>
                </div>
                <h3 className="text-xl font-heading font-semibold text-primary-800 mb-2">
                  Cultural Exchange
                </h3>
                <p className="text-muted-foreground">
                  Experience authentic local culture through meaningful connections with your hosts.
                </p>
              </article>

              <article className="bg-white/80 backdrop-blur-sm border border-primary-200 rounded-lg p-6 shadow-lg shadow-primary-100/50">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4" aria-hidden="true">
                  <div className="w-6 h-6 bg-primary-500 rounded animate-pulse"></div>
                </div>
                <h3 className="text-xl font-heading font-semibold text-primary-800 mb-2">
                  Group Travel
                </h3>
                <p className="text-muted-foreground">
                  Perfect for student groups, digital nomads, and travel groups seeking authentic experiences.
                </p>
              </article>
            </div>
          </section>

          {/* Status Section */}
          <div className="bg-white/80 backdrop-blur-sm text-center border border-primary-200 rounded-lg p-8 shadow-lg shadow-primary-100/50">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-6">
              <div className="w-8 h-8 bg-primary-500 rounded animate-pulse"></div>
            </div>
            <h2 className="text-3xl font-semibold mb-4 font-heading text-primary-800">
              Join the OpenStay Community
            </h2>
            <p className="text-muted-foreground font-sans mb-6 max-w-md mx-auto">
              We're building the future of community-based travel. 
              Be part of authentic cultural exchanges and meaningful connections!
            </p>
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <a href="mailto:sairampasupuleti.42@gmail.com" 
               className="inline-block bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Join Our Community - Get Early Access
            </a>
          </div>
        </div>
      </div>
    </Layout>
    </>
  );
};

export default HomePage;
