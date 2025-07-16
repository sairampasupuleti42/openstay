import './App.css'

function App() {

  return (
    <div className="app">
      <header className="header">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>🌍 TravelHost</h1>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#contact">Contact</a>
          </div>
        </nav>
      </header>

      <main className="main">
        <section className="hero">
          <div className="hero-content">
            <h2 className="hero-title">
              Connect, Share, and Explore
            </h2>
            <p className="hero-subtitle">
              Host travelers or join travel groups for authentic cultural experiences and meaningful connections.
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary">Become a Host</button>
              <button className="btn btn-secondary">Find Hosts</button>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <h3>Why Choose TravelHost?</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏠</div>
              <h4>Authentic Stays</h4>
              <p>Stay with local families and experience genuine cultural immersion</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h4>Trusted Community</h4>
              <p>Verified hosts and travelers with reviews and safety measures</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌟</div>
              <h4>Unique Experiences</h4>
              <p>Local-led activities and cultural exchanges you won't find elsewhere</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="how-it-works">
          <h3>How It Works</h3>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Sign Up</h4>
              <p>Create your profile as a host or traveler</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>Connect</h4>
              <p>Browse hosts or respond to travel requests</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Experience</h4>
              <p>Enjoy authentic cultural exchanges and new friendships</p>
            </div>
          </div>
        </section>

        <section className="cta">
          <h3>Ready to Start Your Journey?</h3>
          <p>Join thousands of travelers and hosts creating meaningful connections worldwide.</p>
          <button className="btn btn-primary btn-large">Get Started Today</button>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2024 TravelHost. Building connections across cultures.</p>
      </footer>
    </div>
  )
}

export default App