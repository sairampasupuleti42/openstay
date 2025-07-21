import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Shield, Heart, Star } from "lucide-react";

import SEOMeta from "@/helpers/SEOMeta";
import Title from "@/helpers/Title";
import AdvancedSearchInput from "@/components/AdvancedSearchInput";

interface SearchFilters {
  type?: 'all' | 'location' | 'property' | 'user';
  priceRange?: string;
  rating?: number;
  sortBy?: 'relevance' | 'price' | 'rating' | 'recent';
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSearch = (query: string, filters?: SearchFilters) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        searchParams.set('type', filters.type);
      }
      if (filters.priceRange && filters.priceRange !== 'any') {
        searchParams.set('priceRange', filters.priceRange);
      }
      if (filters.rating && filters.rating > 0) {
        searchParams.set('rating', filters.rating.toString());
      }
      if (filters.sortBy && filters.sortBy !== 'relevance') {
        searchParams.set('sortBy', filters.sortBy);
      }
    }
    navigate(`/search/results?${searchParams.toString()}`);
  };

  return (
    <>
      <SEOMeta
        title="Openstay - Connect Travelers with Local Hosts for Authentic Experiences"
        description="Host or travel with real people around the world. Join our verified community-based platform for authentic cultural exchanges and group travel experiences."
        keywords="community hosting, cultural exchange, travel groups, local hosts, verified hosting, authentic travel, budget travel, digital nomads, student groups, backpackers, group accommodation, cultural immersion, social travel, trust-based hosting, travel community, homestay alternative, couchsurfing alternative, group travel, verified hosts, travel experiences"
      />
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <section aria-labelledby="hero-heading" className="text-center mb-16">
            <h1
              id="hero-heading"
              className="text-5xl md:text-6xl font-bold mb-6 font-heading"
            >
              Host or Travel with{" "}
              <Title variant="solid" className="text-primary-400 text-6xl md:text-7xl">
                Openstay
              </Title>
            </h1>
            <p className="text-xl text-muted-foreground font-sans max-w-3xl mx-auto mb-8">
              Connect with verified local hosts for authentic cultural
              experiences. Join our community-based platform for meaningful
              travel and group accommodation.
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-4xl mx-auto mb-8">
              <AdvancedSearchInput
                placeholder="Where do you want to go? Search destinations, properties, or connect with hosts..."
                onSearch={handleSearch}
                showSuggestions={true}
                showFilters={true}
                className="shadow-lg"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/about"
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Learn More About Us
              </Link>
              <Link
                to="/contact"
                className="bg-transparent border-2 border-primary-500 text-primary-600 hover:bg-primary-50 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Get In Touch
              </Link>
            </div>
          </section>

          {/* Statistics Section */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">10K+</div>
              <div className="text-gray-600">Verified Hosts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">50K+</div>
              <div className="text-gray-600">Happy Travelers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">150+</div>
              <div className="text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">4.8</div>
              <div className="text-gray-600 flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                Rating
              </div>
            </div>
          </section>

          {/* Feature Cards */}
          <section aria-labelledby="features-heading" className="mb-16">
            <h2 id="features-heading" className="text-3xl font-bold text-center mb-12">
              Why Choose Openstay?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Verified Community</h3>
                <p className="text-gray-600">
                  All hosts and travelers are verified through our comprehensive screening process
                  for your safety and peace of mind.
                </p>
              </div>
              
              <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Authentic Experiences</h3>
                <p className="text-gray-600">
                  Connect with local hosts who share their culture, stories, and hidden gems
                  for truly authentic travel experiences.
                </p>
              </div>
              
              <div className="text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Group Travel</h3>
                <p className="text-gray-600">
                  Perfect for solo travelers, friends, or groups looking for affordable
                  accommodation and social connections.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3">Search & Discover</h3>
                <p className="text-gray-600">
                  Use our advanced search to find the perfect host or accommodation
                  that matches your travel style and preferences.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3">Connect & Plan</h3>
                <p className="text-gray-600">
                  Message hosts directly, discuss your travel plans, and coordinate
                  your stay with local insights and recommendations.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3">Experience & Share</h3>
                <p className="text-gray-600">
                  Enjoy authentic local experiences and share your story
                  to help other travelers in our community.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl text-gray-700 mb-8">
              Join thousands of travelers and hosts creating meaningful connections worldwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth/signup"
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Join as a Traveler
              </Link>
              <Link
                to="/auth/signup"
                className="bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-50 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Become a Host
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default HomePage;
