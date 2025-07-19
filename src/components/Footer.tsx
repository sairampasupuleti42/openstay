import React from 'react';
import Logo from '@/helpers/Logo';

const Footer: React.FC = () => {
  return (
    <footer 
      className="bg-primary-800 text-primary-foreground"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <section className="col-span-1 md:col-span-2" aria-labelledby="brand-heading">
            <div className="flex items-center mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-500 rounded-full mr-3">
                <span className="text-lg font-bold text-white" aria-hidden="true">O</span>
              </div>
              <Logo>
                
              </Logo>
            </div>
            <p className="text-primary-200 text-sm mb-4 max-w-sm">
              Your trusted platform for seamless accommodation experiences. 
              We're building the future of hospitality.
            </p>
            <div className="flex space-x-4">
              <a 
                href="mailto:sairampasupuleti.42@gmail.com" 
                className="text-primary-300 hover:text-white transition-colors"
                aria-label="Send email to Openstay"
              >
                <span className="sr-only">Email</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </a>
            </div>
          </section>

          {/* Quick Links */}
          <section aria-labelledby="quick-links-heading">
            <h3 
              id="quick-links-heading"
              className="text-sm font-heading font-semibold text-white uppercase tracking-wider mb-4"
            >
              Quick Links
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2">
                <li>
                  <a href="#home" className="text-primary-200 hover:text-white transition-colors text-sm">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#about" className="text-primary-200 hover:text-white transition-colors text-sm">
                    About
                  </a>
                </li>
                <li>
                  <a href="#services" className="text-primary-200 hover:text-white transition-colors text-sm">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-primary-200 hover:text-white transition-colors text-sm">
                    Contact
                  </a>
                </li>
              </ul>
            </nav>
          </section>

          {/* Contact Info */}
          <section aria-labelledby="contact-info-heading">
            <h3 
              id="contact-info-heading"
              className="text-sm font-heading font-semibold text-white uppercase tracking-wider mb-4"
            >
              Contact
            </h3>
            <address className="space-y-2 not-italic">
              <a 
                href="mailto:sairampasupuleti.42@gmail.com" 
                className="text-primary-200 hover:text-white transition-colors text-sm block"
                aria-label="Send email to sairampasupuleti.42@gmail.com"
              >
                sairampasupuleti.42@gmail.com
              </a>
              <p className="text-primary-200 text-sm">
                Available for questions and feedback
              </p>
            </address>
          </section>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-primary-200 text-sm">
              © 2025 Openstay. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0">
              <div className="bg-primary/85 text-primary-foreground px-3 py-1 rounded-full">
                <span className="text-xs font-medium">Crafted by Sairam Pasupuleti</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
