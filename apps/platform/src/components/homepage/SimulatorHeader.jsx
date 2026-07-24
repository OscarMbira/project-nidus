/**
 * Simulator Header Component
 * 
 * Reusable header for Simulator-related pages
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import Button from '../ui/Button';
import { supabase } from '../../services/supabaseClient';

const SimulatorHeader = () => {
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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-green-900 via-emerald-800 to-teal-900 shadow-md border-b border-green-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-green-300" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Project</span>
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent ml-1">Nidus</span>
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-green-300 mt-0.5">Simulator</span>
              <div className="h-0.5 bg-green-400 mt-0.5"></div>
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          <button
            type="button"
            onClick={handleHomeClick}
            className="font-medium text-green-200 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            style={{ fontSize: '16px' }}
          >
            Home
          </button>
          <Link
            to="/simulator/features"
            className="font-medium text-green-200 hover:text-white transition-colors"
            style={{ fontSize: '16px' }}
          >
            Features
          </Link>
          <Link
            to="/simulator/blog"
            className="font-medium text-green-200 hover:text-white transition-colors"
            style={{ fontSize: '16px' }}
          >
            Blog
          </Link>
          <Link
            to="/simulator/resources"
            className="font-medium text-green-200 hover:text-white transition-colors"
            style={{ fontSize: '16px' }}
          >
            Resources
          </Link>
          <Link
            to="/simulator/pricing"
            className="font-medium text-green-200 hover:text-white transition-colors"
            style={{ fontSize: '16px' }}
          >
            Pricing
          </Link>
          <Link
            to="/documentation/simulator"
            className="font-medium text-green-200 hover:text-white transition-colors"
            style={{ fontSize: '16px' }}
          >
            Documentation
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/simulator/request-demo"
            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-green-200 hover:text-white transition-colors border border-green-400/50 hover:bg-green-800/50 hover:border-green-300 rounded-md"
          >
            Request Demo
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => navigate('/simulator/login')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-green-200 hover:text-white transition-colors border border-green-400/50 hover:bg-green-800/50 hover:border-green-300 rounded-md bg-transparent"
          >
            Log in
          </button>
          <Button asChild className="bg-green-600 hover:bg-green-500 text-white shadow-lg">
            <Link to="/simulator/register">Signup</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default SimulatorHeader;

