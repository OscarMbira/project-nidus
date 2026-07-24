/**
 * Platform Header Component
 * 
 * Reusable header for Platform-related pages
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import Button from '../ui/Button';
import { supabase } from '../../services/supabaseClient';

const PlatformHeader = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  const handleHomeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoggedIn) {
      try {
        await supabase.auth.signOut();
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Logout error:', error);
        navigate('/', { replace: true });
      }
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-50 shadow-sm border-b backdrop-blur-md" style={{ background: 'linear-gradient(135deg, #0F2027 0%, #203A43 100%)', borderColor: '#203A43' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Zap className="h-6 w-6" style={{ color: '#A8DADC' }} />
          <div className="flex flex-col">
            <span className="text-3xl font-bold">
              <span style={{ color: '#A8DADC' }}>Project</span>
              <span style={{ color: '#E63946' }} className="ml-1">Nidus</span>
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium mt-0.5" style={{ color: '#A8DADC' }}>Platform</span>
              <div className="h-0.5 mt-0.5" style={{ background: '#E63946' }}></div>
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          <button
            type="button"
            onClick={handleHomeClick}
            className="font-medium transition-colors bg-transparent border-none cursor-pointer"
            style={{ color: '#A8DADC', fontSize: '16px' }}
            onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.color = '#A8DADC'}
          >
            Home
          </button>
          <Link
            to="/platform/features"
            className="font-medium transition-colors"
            style={{ color: '#A8DADC', fontSize: '16px' }}
            onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.color = '#A8DADC'}
          >
            Features
          </Link>
          <Link
            to="/platform/blog"
            className="font-medium transition-colors"
            style={{ color: '#A8DADC', fontSize: '16px' }}
            onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.color = '#A8DADC'}
          >
            Blog
          </Link>
          <Link
            to="/platform/resources"
            className="font-medium transition-colors"
            style={{ color: '#A8DADC', fontSize: '16px' }}
            onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.color = '#A8DADC'}
          >
            Resources
          </Link>
          <Link
            to="/platform/pricing"
            className="font-medium transition-colors"
            style={{ color: '#A8DADC', fontSize: '16px' }}
            onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.color = '#A8DADC'}
          >
            Pricing
          </Link>
          <Link
            to="/documentation/platform"
            className="font-medium transition-colors"
            style={{ color: '#A8DADC', fontSize: '16px' }}
            onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.target.style.color = '#A8DADC'}
          >
            Documentation
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/platform/request-demo"
            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: '#A8DADC', borderColor: '#A8DADC', border: '1px solid' }}
            onMouseEnter={(e) => { 
              e.target.style.backgroundColor = 'rgba(168, 218, 220, 0.1)';
              e.target.style.borderColor = '#FFFFFF';
            }}
            onMouseLeave={(e) => { 
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = '#A8DADC';
            }}
          >
            Request Demo
          </Link>
          <ThemeToggle />
          <Button 
            variant="outline" 
            asChild
            className="bg-transparent shadow-lg transition-colors"
            style={{ borderColor: '#A8DADC', color: '#A8DADC' }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.backgroundColor = 'rgba(168, 218, 220, 0.1)';
              e.currentTarget.style.borderColor = '#FFFFFF';
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#A8DADC';
            }}
          >
            <Link to="/platform/login">Login</Link>
          </Button>
          <Button 
            asChild
            className="text-white shadow-lg transition-colors"
            style={{ background: '#E63946' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d62839'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#E63946'}
          >
            <Link to="/platform/register">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default PlatformHeader;

