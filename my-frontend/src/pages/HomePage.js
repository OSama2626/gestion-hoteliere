import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/main.css';

function HomePage() {
  const location = useLocation();

  return (
    <div>
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="brand">
            <i className="fas fa-hotel"></i>
            HotelSphere
          </Link>
          
          <div className="nav-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              Accueil
            </Link>
            <Link to="/hotels" className={`nav-link ${location.pathname === '/hotels' ? 'active' : ''}`}>
              Nos Hôtels
            </Link>
            <Link to="/reservations" className={`nav-link ${location.pathname === '/reservations' ? 'active' : ''}`}>
              Réservations
            </Link>
            <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>
              Contact
            </Link>
            <Link to="/login" className="btn btn-outline">
              Connexion
            </Link>
            <Link to="/register" className="btn btn-primary">
              S'inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h1 className="hero-title animate-fadeIn">
            Gestion Hôtelière Intelligente
          </h1>
          <p className="hero-subtitle animate-fadeIn">
            Une solution complète pour la gestion de vos établissements hôteliers.
            Simplifiez vos réservations, optimisez votre gestion et améliorez l'expérience client.
          </p>
          <div className="animate-fadeIn">
            <Link to="/register" className="btn btn-primary">
              Commencer maintenant
            </Link>
            <Link to="/demo" className="btn btn-outline" style={{ marginLeft: '1rem' }}>
              Voir la démo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Solutions pour chaque utilisateur</h2>
          <div className="features-grid">
            {/* Client Features */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-user-circle"></i>
              </div>
              <h3 className="feature-title">Espace Client</h3>
              <ul className="feature-list">
                <li><i className="fas fa-check"></i>Réservation en ligne</li>
                <li><i className="fas fa-check"></i>Gestion des séjours</li>
                <li><i className="fas fa-check"></i>Historique des réservations</li>
                <li><i className="fas fa-check"></i>Notifications en temps réel</li>
              </ul>
            </div>

            {/* Reception Features */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-concierge-bell"></i>
              </div>
              <h3 className="feature-title">Espace Réception</h3>
              <ul className="feature-list">
                <li><i className="fas fa-check"></i>Gestion des check-in/out</li>
                <li><i className="fas fa-check"></i>Suivi des disponibilités</li>
                <li><i className="fas fa-check"></i>Facturation simplifiée</li>
                <li><i className="fas fa-check"></i>Services additionnels</li>
              </ul>
            </div>

            {/* Admin Features */}
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3 className="feature-title">Espace Administration</h3>
              <ul className="feature-list">
                <li><i className="fas fa-check"></i>Tableau de bord</li>
                <li><i className="fas fa-check"></i>Gestion des établissements</li>
                <li><i className="fas fa-check"></i>Analyses statistiques</li>
                <li><i className="fas fa-check"></i>Rapports détaillés</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-hotel"></i>
            </div>
            <div className="stat-number">50+</div>
            <div className="stat-label">Hôtels Partenaires</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-number">10,000+</div>
            <div className="stat-label">Clients Satisfaits</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-bed"></i>
            </div>
            <div className="stat-number">5,000+</div>
            <div className="stat-label">Chambres Disponibles</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-star"></i>
            </div>
            <div className="stat-number">4.8/5</div>
            <div className="stat-label">Note Moyenne</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-container">
          <h2 className="cta-title">Prêt à optimiser votre gestion hôtelière ?</h2>
          <p className="cta-text">Rejoignez les établissements qui nous font confiance</p>
          <Link to="/register" className="btn btn-primary">
            Commencer gratuitement
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage; 