import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/modern.css';

function HomePage() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  return (
    <>
      <nav className="modern-navbar">
        <div className="navbar-content">
          <div className="flex items-center gap-12">
            <Link to="/" className="brand">
              <i className="fas fa-hotel text-3xl"></i>
              <span>HotelSphere</span>
            </Link>
            
            {/* Navigation Links - Left Side */}
            <div className={`nav-menu ${isMenuOpen ? 'flex' : 'hidden md:flex'}`}>
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                Accueil
              </Link>
              <Link to="/rooms" className={`nav-link ${location.pathname === '/rooms' ? 'active' : ''}`}>
                Chambres
              </Link>
              <Link to="/services" className={`nav-link ${location.pathname === '/services' ? 'active' : ''}`}>
                Services
              </Link>
            </div>
          </div>

          {/* Auth Buttons - Right Side */}
          <div className="auth-buttons">
            <Link to="/login" className="btn-modern btn-outline">
              Connexion
            </Link>
            <Link to="/register" className="btn-modern btn-primary">
              S'inscrire
            </Link>
          </div>
        </div>
      </nav>

      <main className="modern-hero">
        <div className="hero-container">
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero-title" data-aos="fade-up">
              Gérez votre hôtel en toute simplicité
            </h1>
            <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
              Une solution complète et moderne pour la gestion hôtelière.
              Optimisez vos réservations, gérez votre personnel et améliorez
              l'expérience de vos clients.
            </p>
            <div className="hero-buttons" data-aos="fade-up" data-aos-delay="400">
              <Link to="/register" className="btn-modern btn-primary">
                Commencer maintenant
              </Link>
              <Link to="/demo" className="btn-modern btn-outline">
                Voir la démo
              </Link>
            </div>
          </motion.div>

          <motion.div 
            className="hero-image"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80"
              alt="Luxury hotel interior"
              className="rounded-2xl shadow-2xl"
              data-aos="zoom-in"
            />
          </motion.div>
        </div>

        {/* Features Section */}
        <section className="features">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="feature-card" data-aos="fade-up">
                <i className="fas fa-calendar-check text-4xl text-blue-600 mb-4"></i>
                <h3 className="text-xl font-bold mb-2">Gestion des Réservations</h3>
                <p className="text-gray-600">Système de réservation intelligent et automatisé</p>
              </div>
              <div className="feature-card" data-aos="fade-up" data-aos-delay="200">
                <i className="fas fa-users text-4xl text-blue-600 mb-4"></i>
                <h3 className="text-xl font-bold mb-2">Gestion du Personnel</h3>
                <p className="text-gray-600">Optimisez les plannings et les tâches</p>
              </div>
              <div className="feature-card" data-aos="fade-up" data-aos-delay="400">
                <i className="fas fa-chart-line text-4xl text-blue-600 mb-4"></i>
                <h3 className="text-xl font-bold mb-2">Analyses et Rapports</h3>
                <p className="text-gray-600">Suivez vos performances en temps réel</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default HomePage; 