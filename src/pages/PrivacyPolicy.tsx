import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Users, Bell, Database, Globe, FileText } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed">
              Your privacy is important to us. This Privacy Policy explains how Openstay collects, 
              uses, and protects your personal information when you use our platform.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h2>
            <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { id: 'information-collection', title: 'Information We Collect', icon: Database },
                { id: 'information-use', title: 'How We Use Information', icon: Users },
                { id: 'information-sharing', title: 'Information Sharing', icon: Globe },
                { id: 'data-security', title: 'Data Security', icon: Lock },
                { id: 'cookies', title: 'Cookies & Tracking', icon: Eye },
                { id: 'user-rights', title: 'Your Rights', icon: FileText },
                { id: 'contact', title: 'Contact Us', icon: Bell },
              ].map(({ id, title, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="flex items-center space-x-2 text-left text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Information We Collect */}
          <section id="information-collection" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Database className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Account Information:</strong> Name, email address, phone number, profile picture</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Authentication Data:</strong> Google OAuth credentials when you sign in with Google</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Profile Information:</strong> Bio, location, occupation, interests, travel preferences</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Usage Information</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Activity Data:</strong> Search queries, booking history, property views</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Device Information:</strong> IP address, browser type, device type, operating system</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Location Data:</strong> General location information to provide relevant content</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section id="information-use" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Service Provision</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Create and manage your account</li>
                  <li>• Facilitate property searches and bookings</li>
                  <li>• Connect travelers with hosts</li>
                  <li>• Provide customer support</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Platform Improvement</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Analyze usage patterns and trends</li>
                  <li>• Improve search algorithms</li>
                  <li>• Enhance user experience</li>
                  <li>• Develop new features</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Communication</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Send booking confirmations</li>
                  <li>• Notify about account activities</li>
                  <li>• Share platform updates</li>
                  <li>• Respond to inquiries</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Security & Compliance</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Prevent fraud and abuse</li>
                  <li>• Enforce terms of service</li>
                  <li>• Comply with legal requirements</li>
                  <li>• Protect user safety</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Information Sharing */}
          <section id="information-sharing" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Globe className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Information Sharing</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">We Do Not Sell Your Data</h3>
                <p className="text-green-700">Openstay does not sell, rent, or trade your personal information to third parties for commercial purposes.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Limited Sharing Scenarios</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">Service Providers</h4>
                    <p className="text-gray-700 text-sm">Trusted third-party services that help us operate the platform (Firebase/Google Cloud, payment processors)</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">Legal Requirements</h4>
                    <p className="text-gray-700 text-sm">When required by law, court order, or to protect rights and safety</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">Business Transfers</h4>
                    <p className="text-gray-700 text-sm">In case of merger, acquisition, or sale of assets (with user notification)</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">User Consent</h4>
                    <p className="text-gray-700 text-sm">When you explicitly consent to share information with specific parties</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section id="data-security" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Lock className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Data Security</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Measures</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• End-to-end encryption for sensitive data</li>
                  <li>• Secure HTTPS connections</li>
                  <li>• Firebase Authentication security</li>
                  <li>• Regular security updates</li>
                  <li>• Firestore security rules</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Operational Measures</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Limited access to personal data</li>
                  <li>• Regular security audits</li>
                  <li>• Employee privacy training</li>
                  <li>• Incident response procedures</li>
                  <li>• Data backup and recovery</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Important:</strong> While we implement strong security measures, no method of transmission over the internet 
                is 100% secure. We continuously work to improve our security practices.
              </p>
            </div>
          </section>

          {/* Cookies & Tracking */}
          <section id="cookies" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Eye className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Cookies & Tracking Technologies</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Types of Cookies We Use</h3>
                <div className="grid gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Essential Cookies</h4>
                    <p className="text-gray-700 text-sm">Required for basic functionality like authentication and session management</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Functional Cookies</h4>
                    <p className="text-gray-700 text-sm">Remember your preferences and settings for a better experience</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Analytics Cookies</h4>
                    <p className="text-gray-700 text-sm">Help us understand how users interact with our platform (anonymized data)</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cookie Management</h3>
                <p className="text-gray-700 mb-3">You can control cookies through your browser settings:</p>
                <ul className="space-y-1 text-gray-700">
                  <li>• Block all cookies (may affect functionality)</li>
                  <li>• Delete existing cookies</li>
                  <li>• Set preferences for specific types</li>
                  <li>• Receive notifications when cookies are set</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section id="user-rights" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <FileText className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Your Privacy Rights</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Access</h3>
                  <p className="text-gray-700 text-sm">Request a copy of the personal data we hold about you</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Correction</h3>
                  <p className="text-gray-700 text-sm">Update or correct inaccurate personal information</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Deletion</h3>
                  <p className="text-gray-700 text-sm">Request deletion of your personal data (right to be forgotten)</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Portability</h3>
                  <p className="text-gray-700 text-sm">Receive your data in a structured, commonly used format</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Objection</h3>
                  <p className="text-gray-700 text-sm">Object to processing of your data for specific purposes</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Restriction</h3>
                  <p className="text-gray-700 text-sm">Request limitation of processing under certain circumstances</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-primary-50 border border-blue-200 rounded-lg p-4">
              <p className="text-primary-800 text-sm">
                To exercise these rights, please contact us using the information provided in the Contact section below. 
                We will respond to your request within 30 days.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section id="contact" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-700">
                If you have questions about this Privacy Policy or how we handle your personal information, please contact us:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <a 
                      href="mailto:sairampasupuleti.42@gmail.com" 
                      className="text-primary-600 hover:text-primary-700"
                    >
                      sairampasupuleti.42@gmail.com
                    </a>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">Response Time</h3>
                    <p className="text-gray-700">We typically respond within 24-48 hours</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Data Protection Officer</h3>
                    <p className="text-gray-700">Sairam Pasupuleti</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">Platform</h3>
                    <Link to="/contact" className="text-primary-600 hover:text-primary-700">
                      Contact Form
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section className="bg-gray-50 rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Policy Updates</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time to reflect changes in our practices, 
                technology, legal requirements, or other factors.
              </p>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">When We Update:</h3>
                <ul className="space-y-1 text-gray-700 ml-4">
                  <li>• We will post the updated policy on this page</li>
                  <li>• We will update the "Last updated" date</li>
                  <li>• For significant changes, we will notify users via email</li>
                  <li>• Continued use of our service constitutes acceptance of updates</li>
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Back to Top */}
      <div className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <span>Back to Top</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
