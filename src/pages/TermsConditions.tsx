import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Scale, AlertTriangle, Users, CreditCard, Shield, Gavel, Phone } from 'lucide-react';

const TermsConditions: React.FC = () => {
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
              <Scale className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed">
              Welcome to Openstay! These Terms & Conditions govern your use of our platform and services. 
              By using Openstay, you agree to be bound by these terms.
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
                { id: 'acceptance', title: 'Acceptance of Terms', icon: FileText },
                { id: 'definitions', title: 'Definitions', icon: Users },
                { id: 'user-accounts', title: 'User Accounts', icon: Shield },
                { id: 'platform-use', title: 'Platform Use', icon: Gavel },
                { id: 'payments', title: 'Payments & Fees', icon: CreditCard },
                { id: 'prohibited-conduct', title: 'Prohibited Conduct', icon: AlertTriangle },
                { id: 'liability', title: 'Liability & Disclaimers', icon: Scale },
                { id: 'contact', title: 'Contact Information', icon: Phone },
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
          
          {/* Acceptance of Terms */}
          <section id="acceptance" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <FileText className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Acceptance of Terms</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                By accessing or using the Openstay platform, mobile application, or any related services 
                (collectively, the "Service"), you agree to be bound by these Terms & Conditions ("Terms"). 
                If you do not agree to these Terms, you may not access or use our Service.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Important Notes:</h3>
                <ul className="space-y-1 text-blue-800 text-sm">
                  <li>• These Terms form a legally binding agreement between you and Openstay</li>
                  <li>• You must be at least 18 years old to use our Service</li>
                  <li>• By using our Service, you represent that you have the authority to enter into this agreement</li>
                  <li>• We may update these Terms from time to time, and continued use constitutes acceptance</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Definitions */}
          <section id="definitions" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Definitions</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-700 mb-4">For the purposes of these Terms, the following definitions apply:</p>
              
              <div className="grid gap-4">
                <div className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-gray-900">"Openstay," "we," "us," or "our"</h3>
                  <p className="text-gray-700 text-sm">Refers to the Openstay platform and its operators</p>
                </div>
                
                <div className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-gray-900">"User," "you," or "your"</h3>
                  <p className="text-gray-700 text-sm">Refers to any individual who accesses or uses our Service</p>
                </div>
                
                <div className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-gray-900">"Host"</h3>
                  <p className="text-gray-700 text-sm">A User who lists accommodations or experiences on our platform</p>
                </div>
                
                <div className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-gray-900">"Guest"</h3>
                  <p className="text-gray-700 text-sm">A User who books accommodations or experiences through our platform</p>
                </div>
                
                <div className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-gray-900">"Content"</h3>
                  <p className="text-gray-700 text-sm">All information, data, text, images, videos, and other materials on our platform</p>
                </div>
                
                <div className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-gray-900">"Service"</h3>
                  <p className="text-gray-700 text-sm">The Openstay platform, including website, mobile app, and all related services</p>
                </div>
              </div>
            </div>
          </section>

          {/* User Accounts */}
          <section id="user-accounts" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">User Accounts</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Creation</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>You must provide accurate, complete, and current information when creating an account</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>You are responsible for maintaining the confidentiality of your account credentials</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>You must be at least 18 years old to create an account</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>One person may maintain only one account unless explicitly authorized by us</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Security</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <ul className="space-y-1 text-amber-800 text-sm">
                    <li>• You are solely responsible for all activities under your account</li>
                    <li>• Notify us immediately of any unauthorized access or security breaches</li>
                    <li>• Use strong passwords and enable two-factor authentication when available</li>
                    <li>• Do not share your account credentials with others</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Termination</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Your Rights</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>• Delete your account at any time</li>
                      <li>• Download your data before deletion</li>
                      <li>• Cancel active bookings per cancellation policy</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Our Rights</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>• Suspend or terminate accounts for violations</li>
                      <li>• Remove content that violates our policies</li>
                      <li>• Refuse service to any user</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Platform Use */}
          <section id="platform-use" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Gavel className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Platform Use</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Permitted Uses</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">For Guests</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>• Search and book accommodations</li>
                      <li>• Communicate with hosts</li>
                      <li>• Leave honest reviews</li>
                      <li>• Access booking history</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">For Hosts</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>• List properties or experiences</li>
                      <li>• Manage bookings and availability</li>
                      <li>• Communicate with guests</li>
                      <li>• Access hosting tools and analytics</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Content Guidelines</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium text-green-800">Required Standards</h4>
                    <p className="text-green-700 text-sm">All content must be accurate, honest, appropriate, and comply with applicable laws</p>
                  </div>
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-medium text-red-800">Prohibited Content</h4>
                    <p className="text-red-700 text-sm">No illegal, harmful, discriminatory, misleading, or inappropriate content</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Intellectual Property</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• You retain ownership of content you create and post</li>
                    <li>• You grant us a license to use your content on our platform</li>
                    <li>• You may not use our trademarks without permission</li>
                    <li>• Respect the intellectual property rights of others</li>
                    <li>• Report copyright infringement through proper channels</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Payments & Fees */}
          <section id="payments" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <CreditCard className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Payments & Fees</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Fees</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Guest Fees</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>• Service fee charged on each booking</li>
                      <li>• Payment processing fees</li>
                      <li>• Fees clearly displayed before payment</li>
                      <li>• No hidden charges</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Host Fees</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li>• Commission on successful bookings</li>
                      <li>• Payment processing fees</li>
                      <li>• Premium listing fees (if applicable)</li>
                      <li>• Transparent fee structure</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Processing</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Payment Methods</h4>
                    <p className="text-blue-800 text-sm">
                      We accept major credit cards, debit cards, and other payment methods as displayed at checkout. 
                      All payments are processed securely through our trusted payment partners.
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Guest Payments</h4>
                      <ul className="space-y-1 text-gray-700 text-sm">
                        <li>• Payment due upon booking confirmation</li>
                        <li>• Refunds processed per cancellation policy</li>
                        <li>• Currency conversion fees may apply</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Host Payouts</h4>
                      <ul className="space-y-1 text-gray-700 text-sm">
                        <li>• Payouts released after guest check-in</li>
                        <li>• Multiple payout methods available</li>
                        <li>• Processing times vary by method</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cancellations & Refunds</h3>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Cancellation Policies</h4>
                    <p className="text-gray-700 text-sm mb-2">
                      Hosts set their own cancellation policies. Common policies include:
                    </p>
                    <ul className="space-y-1 text-gray-700 text-xs ml-4">
                      <li>• Flexible: Full refund 1 day prior to arrival</li>
                      <li>• Moderate: Full refund 5 days prior to arrival</li>
                      <li>• Strict: Full refund 14 days prior to arrival</li>
                    </ul>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Extenuating Circumstances</h4>
                    <p className="text-gray-700 text-sm">
                      In case of events beyond reasonable control (natural disasters, government restrictions), 
                      special refund policies may apply as determined on a case-by-case basis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Prohibited Conduct */}
          <section id="prohibited-conduct" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Prohibited Conduct</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Zero Tolerance Policy</h3>
                <p className="text-red-800 text-sm">
                  The following activities are strictly prohibited and may result in immediate account termination 
                  and legal action where applicable.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Illegal Activities</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Fraud, money laundering, or other financial crimes</li>
                    <li>• Drug trafficking or distribution</li>
                    <li>• Human trafficking or exploitation</li>
                    <li>• Terrorism or violence promotion</li>
                    <li>• Copyright or trademark infringement</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Platform Abuse</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Creating fake accounts or profiles</li>
                    <li>• Manipulating reviews or ratings</li>
                    <li>• Spamming or unauthorized marketing</li>
                    <li>• Circumventing platform fees</li>
                    <li>• Automated data scraping or harvesting</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Harmful Content</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Hate speech or discriminatory content</li>
                    <li>• Harassment, bullying, or threats</li>
                    <li>• Sexual or adult content</li>
                    <li>• Violent or graphic content</li>
                    <li>• Misinformation or false claims</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Security Violations</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Hacking or unauthorized access attempts</li>
                    <li>• Malware, viruses, or malicious code</li>
                    <li>• Phishing or identity theft</li>
                    <li>• Reverse engineering our platform</li>
                    <li>• Interfering with platform functionality</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Enforcement Actions</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-1">Warning</h4>
                    <p className="text-amber-800 text-xs">First-time minor violations</p>
                  </div>
                  <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 mb-1">Suspension</h4>
                    <p className="text-orange-800 text-xs">Repeated or moderate violations</p>
                  </div>
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-1">Termination</h4>
                    <p className="text-red-800 text-xs">Serious or repeated violations</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Liability & Disclaimers */}
          <section id="liability" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Scale className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Liability & Disclaimers</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">Important Legal Notice</h3>
                <p className="text-amber-800 text-sm">
                  Please read this section carefully as it limits our liability and explains your rights and responsibilities.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Platform Role</h3>
                <div className="space-y-3">
                  <p className="text-gray-700 text-sm">
                    Openstay acts as an intermediary platform connecting hosts and guests. We do not own, 
                    control, offer, or manage any accommodations or experiences listed on our platform.
                  </p>
                  <ul className="space-y-1 text-gray-700 text-sm ml-4">
                    <li>• We facilitate connections between users</li>
                    <li>• We provide payment processing services</li>
                    <li>• We offer customer support and dispute resolution</li>
                    <li>• We do not guarantee the quality, safety, or legality of listings</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">User Responsibilities</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Host Responsibilities</h4>
                    <ul className="space-y-1 text-gray-700 text-xs">
                      <li>• Ensure property safety and compliance</li>
                      <li>• Provide accurate descriptions and photos</li>
                      <li>• Maintain appropriate insurance coverage</li>
                      <li>• Comply with local laws and regulations</li>
                      <li>• Treat guests fairly and without discrimination</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Guest Responsibilities</h4>
                    <ul className="space-y-1 text-gray-700 text-xs">
                      <li>• Read and understand listing details</li>
                      <li>• Follow house rules and local laws</li>
                      <li>• Treat property with care and respect</li>
                      <li>• Communicate honestly with hosts</li>
                      <li>• Leave properties in good condition</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Limitation of Liability</h3>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Service Disclaimer</h4>
                    <p className="text-gray-700 text-sm">
                      Our platform is provided "as is" without warranties of any kind. We do not guarantee 
                      uninterrupted service, error-free operation, or that the platform will meet your specific needs.
                    </p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Damages Limitation</h4>
                    <p className="text-gray-700 text-sm">
                      To the maximum extent permitted by law, Openstay shall not be liable for any indirect, 
                      incidental, special, consequential, or punitive damages arising from your use of our platform.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Indemnification</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 text-sm">
                    You agree to indemnify and hold harmless Openstay from any claims, damages, losses, 
                    or expenses arising from your use of the platform, violation of these Terms, or 
                    infringement of any rights of another party.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section id="contact" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Phone className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-700">
                If you have questions about these Terms & Conditions or need legal assistance, please contact us:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Legal Contact</h3>
                    <a 
                      href="mailto:sairampasupuleti.42@gmail.com" 
                      className="text-primary-600 hover:text-primary-700"
                    >
                      sairampasupuleti.42@gmail.com
                    </a>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">Subject Line</h3>
                    <p className="text-gray-700 text-sm">"Legal Inquiry - Terms & Conditions"</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">General Support</h3>
                    <Link to="/contact" className="text-primary-600 hover:text-primary-700 text-sm">
                      Contact Form
                    </Link>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">Response Time</h3>
                    <p className="text-gray-700 text-sm">Legal inquiries: 3-5 business days</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Governing Law */}
          <section className="bg-gray-50 rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Governing Law & Dispute Resolution</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Governing Law</h3>
                <p className="text-gray-700 text-sm">
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                  where Openstay is registered, without regard to conflict of law principles.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Dispute Resolution</h3>
                <div className="space-y-2">
                  <p className="text-gray-700 text-sm">We encourage resolving disputes through the following process:</p>
                  <ol className="space-y-1 text-gray-700 text-sm ml-4">
                    <li>1. Direct communication between parties</li>
                    <li>2. Platform-mediated resolution</li>
                    <li>3. Formal mediation (if agreed upon)</li>
                    <li>4. Legal proceedings (as a last resort)</li>
                  </ol>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Severability</h3>
                <p className="text-gray-700 text-sm">
                  If any provision of these Terms is found to be invalid or unenforceable, the remaining 
                  provisions shall continue to be valid and enforceable.
                </p>
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

export default TermsConditions;
