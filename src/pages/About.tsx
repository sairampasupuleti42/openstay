import React from "react";
import SEOMeta from "@/helpers/SEOMeta";
import Title from "@/helpers/Title";

const AboutPage: React.FC = () => {
  return (
    <>
      <SEOMeta
        title="About Openstay - Community-Based Travel Platform"
        description="Learn about Openstay's mission to connect travelers with verified local hosts for authentic cultural experiences. Discover our vision for community-driven travel."
        keywords="about Openstay, community travel, cultural exchange, verified hosts, authentic travel experiences, travel platform mission"
      />
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <section
            aria-labelledby="about-heading"
            className="text-center mb-16"
          >
            <h1
              id="about-heading"
              className="text-4xl md:text-5xl font-bold mb-6 font-heading"
            >
              About <Title size="xl">Openstay</Title>
            </h1>
            <p className="text-xl text-muted-foreground font-sans max-w-3xl mx-auto leading-relaxed">
              We're building the future of community-based travel, connecting
              travelers with verified local hosts for authentic cultural
              experiences and meaningful connections.
            </p>
          </section>

          {/* Vision Section */}
          <section aria-labelledby="vision-heading" className="mb-16">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-8 md:p-12">
              <h2
                id="vision-heading"
                className="text-3xl font-heading font-bold text-primary-800 mb-6"
              >
                🌍 Our Vision
              </h2>
              <p className="text-lg text-primary-700 leading-relaxed mb-6">
                Openstay is a platform where individuals and families can host
                travelers or travel groups, similar to Couchsurfing or Workaway,
                but with enhanced layers of safety, verification, and cultural
                immersion.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/60 rounded-lg p-6">
                  <h3 className="font-heading font-semibold text-primary-800 mb-3">
                    Verified Group Travel
                  </h3>
                  <p className="text-primary-700">
                    Safe, verified experiences for groups of 5-10 people
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-6">
                  <h3 className="font-heading font-semibold text-primary-800 mb-3">
                    Cultural Immersion
                  </h3>
                  <p className="text-primary-700">
                    Deep cultural exchanges with local hosts and communities
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-6">
                  <h3 className="font-heading font-semibold text-primary-800 mb-3">
                    Local-Led Activities
                  </h3>
                  <p className="text-primary-700">
                    Authentic experiences guided by local community members
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-6">
                  <h3 className="font-heading font-semibold text-primary-800 mb-3">
                    Trust & Safety
                  </h3>
                  <p className="text-primary-700">
                    Comprehensive verification and safety systems
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Target Audience */}
          <section aria-labelledby="audience-heading" className="mb-16">
            <h2
              id="audience-heading"
              className="text-3xl font-heading font-bold text-dark-600 mb-8 text-center"
            >
              Who We Serve
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <article className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎒</span>
                </div>
                <h3 className="text-xl font-heading font-semibold text-dark-600 mb-3">
                  Travelers
                </h3>
                <ul className="text-muted-foreground space-y-2">
                  <li>Solo travelers</li>
                  <li>Student groups</li>
                  <li>Digital nomads</li>
                  <li>Backpackers</li>
                  <li>Small tour groups</li>
                </ul>
              </article>

              <article className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="text-xl font-heading font-semibold text-dark-600 mb-3">
                  Hosts
                </h3>
                <ul className="text-muted-foreground space-y-2">
                  <li>Local families</li>
                  <li>Cultural enthusiasts</li>
                  <li>Community leaders</li>
                  <li>Local guides</li>
                  <li>Experience providers</li>
                </ul>
              </article>

              <article className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🤝</span>
                </div>
                <h3 className="text-xl font-heading font-semibold text-dark-600 mb-3">
                  Experiences
                </h3>
                <ul className="text-muted-foreground space-y-2">
                  <li>Shared meals</li>
                  <li>Cultural activities</li>
                  <li>Local tours</li>
                  <li>Cooking classes</li>
                  <li>Community events</li>
                </ul>
              </article>
            </div>
          </section>

          {/* Unique Features */}
          <section aria-labelledby="features-heading" className="mb-16">
            <h2
              id="features-heading"
              className="text-3xl font-heading font-bold text-dark-600 mb-8 text-center"
            >
              What Makes Us Different
            </h2>
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="md:w-1/2">
                  <h3 className="text-2xl font-heading font-semibold text-primary-800 mb-4">
                    🏆 Verified Community
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Unlike traditional platforms, we focus on deep verification,
                    background checks, and rating systems to ensure safe,
                    trustworthy connections between hosts and travelers.
                  </p>
                </div>
                <div className="md:w-1/2 bg-primary-50 rounded-lg p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </span>
                      <span>ID verification</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </span>
                      <span>Background checks</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </span>
                      <span>Community ratings</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row-reverse items-center gap-8">
                <div className="md:w-1/2">
                  <h3 className="text-2xl font-heading font-semibold text-primary-800 mb-4">
                    🎭 Cultural Matching
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our unique "Culture Mode" allows hosts to tag their
                    traditions and offer related activities, while travelers can
                    search by host "vibes" like chill, explorer, spiritual, or
                    foodie.
                  </p>
                </div>
                <div className="md:w-1/2 bg-primary-50 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <span className="bg-primary-200 text-primary-800 px-3 py-1 rounded-full text-sm text-center">
                      Foodie
                    </span>
                    <span className="bg-primary-200 text-primary-800 px-3 py-1 rounded-full text-sm text-center">
                      Explorer
                    </span>
                    <span className="bg-primary-200 text-primary-800 px-3 py-1 rounded-full text-sm text-center">
                      Spiritual
                    </span>
                    <span className="bg-primary-200 text-primary-800 px-3 py-1 rounded-full text-sm text-center">
                      Chill
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="md:w-1/2">
                  <h3 className="text-2xl font-heading font-semibold text-primary-800 mb-4">
                    👥 Group Focus
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Specialized in hosting small groups (5-10 people), perfect
                    for student groups, friends traveling together, or organized
                    cultural exchange programs.
                  </p>
                </div>
                <div className="md:w-1/2 bg-primary-50 rounded-lg p-6 text-center">
                  <div className="text-4xl text-primary-500 mb-2">👥</div>
                  <div className="text-lg font-semibold text-primary-800">
                    5-10 People
                  </div>
                  <div className="text-sm text-primary-600">
                    Optimal group size
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mission Statement */}
          <section aria-labelledby="mission-heading" className="mb-16">
            <div className="bg-dark-600 text-white rounded-xl p-8 md:p-12 text-center">
              <h2
                id="mission-heading"
                className="text-3xl font-heading font-bold mb-6"
              >
                Our Mission
              </h2>
              <p className="text-xl leading-relaxed max-w-3xl mx-auto">
                To create meaningful connections between travelers and local
                communities, fostering cultural understanding, authentic
                experiences, and sustainable tourism through verified, safe, and
                enriching homestay experiences.
              </p>
            </div>
          </section>

          {/* Development Phases */}
          <section aria-labelledby="roadmap-heading">
            <h2
              id="roadmap-heading"
              className="text-3xl font-heading font-bold text-dark-600 mb-8 text-center"
            >
              Development Roadmap
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-primary-500 pl-6">
                <h3 className="text-xl font-heading font-semibold text-primary-800 mb-2">
                  ✅ Phase 1 - MVP (0-3 months)
                </h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>• User registration & profiles (travelers + hosts)</li>
                  <li>• Host listing creation with group size support</li>
                  <li>• Search & filter by location, interests, dates</li>
                  <li>• Booking request system</li>
                  <li>• Basic chat/messaging</li>
                  <li>• Host & guest reviews</li>
                </ul>
              </div>

              <div className="border-l-4 border-primary-400 pl-6">
                <h3 className="text-xl font-heading font-semibold text-primary-700 mb-2">
                  🚀 Phase 2 - Growth (3-6 months)
                </h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Verification system (ID, email, host badges)</li>
                  <li>• Interest matching (culture, food, adventure themes)</li>
                  <li>• Event integration (local meetups, activities)</li>
                  <li>• Push notifications & email alerts</li>
                  <li>• Mobile app (PWA/React Native)</li>
                </ul>
              </div>

              <div className="border-l-4 border-primary-300 pl-6">
                <h3 className="text-xl font-heading font-semibold text-primary-600 mb-2">
                  🌍 Phase 3 - Expansion (6-12 months)
                </h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Premium subscriptions</li>
                  <li>• Payment integration</li>
                  <li>• Cultural activity listings</li>
                  <li>• SOS & safety features</li>
                  <li>• Gamified badges & host levels</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
