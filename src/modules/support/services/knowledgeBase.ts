import type { KnowledgeBaseItem, QuickAction } from '../types';

export const knowledgeBase: KnowledgeBaseItem[] = [
  // Platform Overview
  {
    id: 'what-is-openstay',
    question: 'What is Openstay?',
    answer: 'Openstay is a community-driven platform that connects travelers and travel groups with trusted local hosts for authentic cultural experiences. Unlike traditional hotels, we focus on human connections and cultural immersion.',
    category: 'platform',
    keywords: ['openstay', 'platform', 'what is', 'about', 'community'],
    priority: 10
  },
  {
    id: 'how-it-works',
    question: 'How does Openstay work?',
    answer: 'Openstay works in three simple steps: 1) Create your profile as a traveler or host, 2) Search for hosts in your destination or list your space, 3) Connect, chat, and arrange your stay. Our platform emphasizes trust, safety, and cultural exchange.',
    category: 'platform',
    keywords: ['how it works', 'process', 'steps', 'getting started'],
    priority: 9
  },
  
  // Hosting
  {
    id: 'become-host',
    question: 'How do I become a host?',
    answer: 'To become a host on Openstay: 1) Sign up and complete your profile, 2) Create your host listing with photos and description, 3) Set your availability and group size preferences, 4) Get verified through our safety process. Hosts can welcome solo travelers or groups up to 10 people.',
    category: 'hosting',
    keywords: ['become host', 'hosting', 'list space', 'host signup'],
    priority: 8
  },
  {
    id: 'group-hosting',
    question: 'Can I host groups?',
    answer: 'Yes! Openstay specializes in group hosting. You can specify the maximum group size you\'re comfortable with (typically 2-10 people). This makes us perfect for student groups, digital nomad teams, and friend groups traveling together.',
    category: 'hosting',
    keywords: ['group hosting', 'groups', 'multiple travelers', 'student groups'],
    priority: 7
  },
  {
    id: 'host-verification',
    question: 'How are hosts verified?',
    answer: 'We use a comprehensive verification system including ID verification, email confirmation, host badges, and community reviews. Our Safety Shield feature provides optional insurance and SOS check-ins for extra peace of mind.',
    category: 'safety',
    keywords: ['verification', 'safety', 'host verification', 'trust'],
    priority: 8
  },

  // Traveling
  {
    id: 'find-hosts',
    question: 'How do I find hosts?',
    answer: 'Use our smart search to find hosts by location, dates, group size, and interests. You can filter by host "vibes" (chill, explorer, spiritual, foodie) and cultural activities. Our matchmaking system suggests hosts based on your personality and interests.',
    category: 'traveling',
    keywords: ['find hosts', 'search', 'booking', 'travel'],
    priority: 8
  },
  {
    id: 'cultural-experiences',
    question: 'What cultural experiences are available?',
    answer: 'Hosts can offer various cultural activities like cooking classes, local tours, traditional crafts, language exchange, and spiritual experiences. Look for hosts with cultural badges and activity listings in their profiles.',
    category: 'experiences',
    keywords: ['cultural', 'activities', 'experiences', 'local', 'traditions'],
    priority: 6
  },

  // Safety & Trust
  {
    id: 'safety-features',
    question: 'What safety features does Openstay have?',
    answer: 'Openstay prioritizes safety with: ID verification, background checks, rating systems, SOS check-ins, emergency contacts, verified profiles, host certification, and optional insurance coverage through our Safety Shield feature.',
    category: 'safety',
    keywords: ['safety', 'security', 'trust', 'verification', 'emergency'],
    priority: 9
  },
  {
    id: 'reviews-ratings',
    question: 'How do reviews and ratings work?',
    answer: 'Both hosts and travelers can leave reviews after each stay. Our review system includes ratings for communication, cleanliness, cultural experience, and overall satisfaction. Reviews help build trust and improve the community.',
    category: 'reviews',
    keywords: ['reviews', 'ratings', 'feedback', 'trust'],
    priority: 6
  },

  // Pricing & Payment
  {
    id: 'pricing-model',
    question: 'How much does Openstay cost?',
    answer: 'Openstay offers a freemium model: Core hosting and traveling features are free. Premium features include verified-only access, early booking privileges, and enhanced visibility for hosts. Optional monetization allows hosts to charge for special experiences.',
    category: 'pricing',
    keywords: ['cost', 'pricing', 'free', 'premium', 'payment'],
    priority: 7
  },
  {
    id: 'payment-options',
    question: 'What payment options are available?',
    answer: 'We support various payment methods through secure payment integration. Hosts can choose to offer free stays or charge for premium experiences. All payments are processed securely with buyer protection.',
    category: 'payment',
    keywords: ['payment', 'money', 'pay', 'billing'],
    priority: 6
  },

  // Technical
  {
    id: 'mobile-app',
    question: 'Is there a mobile app?',
    answer: 'Openstay is available as a Progressive Web App (PWA) that works great on mobile devices. We\'re also developing native mobile apps for iOS and Android, coming in Phase 2 of our roadmap.',
    category: 'technical',
    keywords: ['mobile app', 'phone', 'ios', 'android', 'app'],
    priority: 5
  },
  {
    id: 'supported-locations',
    question: 'Which locations are supported?',
    answer: 'Openstay is expanding globally! We currently support major cities and tourist destinations worldwide. Our platform works anywhere hosts choose to list their spaces and welcome travelers.',
    category: 'locations',
    keywords: ['locations', 'countries', 'cities', 'where', 'available'],
    priority: 5
  },

  // Community
  {
    id: 'community-guidelines',
    question: 'What are the community guidelines?',
    answer: 'Openstay is built on respect, trust, and cultural exchange. We expect all members to be respectful, honest, and open to learning about different cultures. Discrimination, harassment, or abuse is not tolerated.',
    category: 'community',
    keywords: ['guidelines', 'rules', 'community', 'behavior'],
    priority: 4
  },
  {
    id: 'events-meetups',
    question: 'Are there community events?',
    answer: 'Yes! Our Event Sync feature allows travelers to host and join local meetups and events. This helps build community connections and discover cultural activities in your destination.',
    category: 'events',
    keywords: ['events', 'meetups', 'community', 'activities'],
    priority: 4
  }
];

export const quickActions: QuickAction[] = [
  {
    id: 'how-to-start',
    label: '🚀 Get Started',
    response: 'Welcome to Openstay! Getting started is easy: 1) Create your profile (traveler or host), 2) Complete verification for safety, 3) Start exploring hosts or create your listing. Ready to join our global community?',
    category: 'onboarding'
  },
  {
    id: 'find-hosts',
    label: '🏠 Find Hosts',
    response: 'Search for amazing hosts using our smart filters: destination, travel dates, group size, and cultural interests. Filter by host "vibes" and check their cultural badges. Send a friendly request with your story!',
    category: 'traveling'
  },
  {
    id: 'become-host',
    label: '🌟 Host Travelers',
    response: 'Start hosting today! Create your profile, upload photos, describe your cultural offerings, set group size (1-10 people), and get verified. Welcome travelers from around the world!',
    category: 'hosting'
  },
  {
    id: 'safety-info',
    label: '🛡️ Safety & Trust',
    response: 'Safety first! We provide ID verification, background checks, host certification, SOS check-ins, Safety Shield insurance, and community reviews. Travel with confidence on Openstay.',
    category: 'safety'
  },
  {
    id: 'cultural-experiences',
    label: '🎭 Local Culture',
    response: 'Immerse yourself in local culture! Our hosts offer cooking classes, traditional crafts, local tours, language exchange, and spiritual experiences. Find authentic cultural connections.',
    category: 'experiences'
  },
  {
    id: 'group-travel',
    label: '👥 Group Travel',
    response: 'Perfect for groups! Openstay specializes in hosting 2-10 people together. Ideal for friends, families, student groups, and digital nomad teams traveling together.',
    category: 'groups'
  },
  {
    id: 'pricing-help',
    label: '💰 Pricing',
    response: 'Enjoy our freemium model! Core features are completely free. Premium subscriptions unlock verified-only access, early booking, and enhanced visibility. Fair and transparent pricing.',
    category: 'pricing'
  },
  {
    id: 'contact-support',
    label: '📞 Get Help',
    response: 'Need personal assistance? Our support team is ready to help! I can create a support ticket or connect you with a human agent for complex issues. How can we assist you?',
    category: 'support'
  }
];

export const searchKeywords = (query: string): KnowledgeBaseItem[] => {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(' ').filter(word => word.length > 2);
  
  return knowledgeBase
    .filter(item => {
      // Check if any keywords match
      const keywordMatch = item.keywords.some(keyword => 
        keyword.includes(lowerQuery) || lowerQuery.includes(keyword)
      );
      
      // Check if any words match question or answer
      const contentMatch = words.some(word => 
        item.question.toLowerCase().includes(word) || 
        item.answer.toLowerCase().includes(word)
      );
      
      return keywordMatch || contentMatch;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3); // Return top 3 matches
};
