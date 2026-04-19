/**
 * Organisation Setup Page
 * MANDATORY step after email verification
 * Creates organisation and sends verification email
 * PERFORMANCE OPTIMIZED: Memoized static data, parallel loading, useCallback handlers
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrganisation } from '../../services/organisationService';
import { toast } from 'react-hot-toast';
import { Building2, Mail, Phone, Globe, Briefcase, Users, User, MapPin, FileText, Link as LinkIcon } from 'lucide-react';
import { platformDb, supabase } from '../../services/supabase/supabaseClient';
import SearchableSelect from '../../components/ui/SearchableSelect';

// Lazy load header for faster initial render
const PlatformHeader = lazy(() => import('../../components/homepage/PlatformHeader'));

// Move static data outside component to prevent recreation on every render
const ORGANISATION_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'business', label: 'Small Business' },
  { value: 'company', label: 'Company' }
];

const INDUSTRIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'software', label: 'Software Development' },
  { value: 'construction', label: 'Construction' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'other', label: 'Other' }
];

// No fallback countries - all data must come from database per user requirements

const OrganisationSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'company',
    companyName: '',
    country: '',
    phone: '',
    industry: '',
    size: '',
    website: '',
    contactPerson: '',
    email: '',
    fullAddress: '',
    registrationReference: ''
  });

  // Validation states for unique name checks
  const [nameValidation, setNameValidation] = useState({
    checking: false,
    available: true,
    message: ''
  });
  const [companyNameValidation, setCompanyNameValidation] = useState({
    checking: false,
    available: true,
    message: ''
  });

  // Load user email immediately (critical for form)
  useEffect(() => {
    const loadUserEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          setFormData(prev => ({ ...prev, email: user.email }));
        }
      } catch (error) {
        console.error('Error loading user email:', error);
      }
    };
    
    loadUserEmail();
  }, []);

  // Load countries from database
  useEffect(() => {
    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        console.log('Loading countries from database...');
        
        // First, try to get active countries (preferred)
        let { data, error } = await platformDb
          .from('countries')
          .select('code, name, is_active, is_deleted')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('name', { ascending: true })
          .limit(250);

        // If no active countries found or error, try without is_active filter
        // (in case the column doesn't exist or all countries are inactive)
        if (error || !data || data.length === 0) {
          console.warn('No active countries found or error occurred. Trying without is_active filter...', error);
          
          // Try without is_active filter, but still filter is_deleted
          const result = await platformDb
            .from('countries')
            .select('code, name, is_active, is_deleted')
            .eq('is_deleted', false)
            .order('name', { ascending: true })
            .limit(250);
          
          if (result.error) {
            console.error('Error loading countries (without is_active filter):', result.error);
            // Last resort: try with minimal filters
            const fallbackResult = await platformDb
              .from('countries')
              .select('code, name')
              .order('name', { ascending: true })
              .limit(250);
            
            if (fallbackResult.error) {
              throw fallbackResult.error;
            }
            data = fallbackResult.data;
            error = fallbackResult.error;
          } else {
            data = result.data;
            error = result.error;
          }
        }

        if (error) {
          console.error('Error loading countries from database:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          setCountries([]);
          setCountriesLoading(false);
          return;
        }

        console.log('Countries loaded successfully:', data?.length || 0, 'countries');
        if (data && data.length > 0) {
          console.log('Sample countries:', data.slice(0, 5));
          // Filter out any null/undefined entries and ensure we have code and name
          const validCountries = data.filter(c => c && c.code && c.name);
          console.log('Valid countries after filtering:', validCountries.length);
          setCountries(validCountries);
        } else {
          console.warn('No countries found in database after all attempts.');
          setCountries([]);
        }
      } catch (error) {
        console.error('Exception loading countries:', error);
        console.error('Exception details:', error.message, error.stack);
        setCountries([]);
      } finally {
        setCountriesLoading(false);
      }
    };

    // Load countries immediately since it's a required field
    loadCountries();
  }, []);

  // Debounced validation for organisation name
  const checkOrganisationNameAvailability = useCallback(async (name) => {
    if (!name || name.trim().length < 2) {
      setNameValidation({ checking: false, available: true, message: '' });
      return;
    }

    setNameValidation({ checking: true, available: true, message: '' });

    try {
      const { data, error } = await platformDb.rpc('check_organisation_name_availability', {
        p_account_name: name.trim()
      });

      if (error) throw error;

      setNameValidation({
        checking: false,
        available: data?.available ?? true,
        message: data?.message || ''
      });
    } catch (error) {
      console.error('Error checking organisation name:', error);
      setNameValidation({ checking: false, available: true, message: '' });
    }
  }, []);

  // Debounced validation for legal company name
  const checkCompanyNameAvailability = useCallback(async (companyName) => {
    if (!companyName || companyName.trim().length < 2) {
      setCompanyNameValidation({ checking: false, available: true, message: '' });
      return;
    }

    setCompanyNameValidation({ checking: true, available: true, message: '' });

    try {
      const { data, error } = await platformDb.rpc('check_company_name_availability', {
        p_company_name: companyName.trim()
      });

      if (error) throw error;

      setCompanyNameValidation({
        checking: false,
        available: data?.available ?? true,
        message: data?.message || ''
      });
    } catch (error) {
      console.error('Error checking company name:', error);
      setCompanyNameValidation({ checking: false, available: true, message: '' });
    }
  }, []);

  // Debounce the validation checks (300ms delay - optimized for faster feedback)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name && formData.name.trim().length >= 2) {
        checkOrganisationNameAvailability(formData.name);
      } else {
        setNameValidation({ checking: false, available: true, message: '' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.name, checkOrganisationNameAvailability]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.companyName && formData.companyName.trim().length >= 2) {
        checkCompanyNameAvailability(formData.companyName);
      } else {
        setCompanyNameValidation({ checking: false, available: true, message: '' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.companyName, checkCompanyNameAvailability]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Check for duplicate names before submitting
    if (!nameValidation.available) {
      toast.error('Organisation name is already taken. Please choose a different name.');
      return;
    }

    if (!companyNameValidation.available) {
      toast.error('Legal company name is already registered. Please choose a different name.');
      return;
    }

    setLoading(true);

    try {
      const organisation = await createOrganisation(formData);

      // TEMPORARILY DISABLED: Email verification
      // Organisation is automatically verified, redirect to dashboard
      toast.success('Organisation created successfully!');

      // Redirect to pmo_admin dashboard
      navigate('/platform/dashboard', { replace: true });
    } catch (error) {
      console.error('Organisation creation error:', error);
      toast.error(error.message || 'Failed to create organisation');
    } finally {
      setLoading(false);
    }
  }, [formData, navigate, nameValidation.available, companyNameValidation.available]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Memoize countries options to prevent recalculation on every render
  // Only recalculate when countries array changes
  const countryOptions = useMemo(() => {
    if (!countries || countries.length === 0) {
      console.log('countryOptions: No countries available', { countriesLength: countries?.length || 0 });
      return [];
    }
    const options = countries.map(c => {
      if (!c || !c.code || !c.name) {
        console.warn('Invalid country data:', c);
        return null;
      }
      return { value: c.code, label: c.name };
    }).filter(Boolean);
    console.log('countryOptions generated:', options.length, 'options');
    return options;
  }, [countries]);

  // Memoize conditional company name field
  const showCompanyName = useMemo(() => {
    return formData.type === 'business' || formData.type === 'company';
  }, [formData.type]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Platform Header - Lazy loaded */}
      <Suspense fallback={<div className="h-16 bg-gray-800" />}>
        <PlatformHeader />
      </Suspense>
      
      <div className="flex items-center justify-center p-4 py-8">
        <div className="max-w-5xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Create Your Organisation
          </h1>
          <p className="text-gray-400">
            This is required to access the platform. One email = one organisation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 2-Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Organisation Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisation Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                      nameValidation.checking
                        ? 'border-yellow-500'
                        : !nameValidation.available
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-600 focus:border-blue-500'
                    }`}
                    placeholder="Acme Corporation"
                  />
                </div>
                {nameValidation.checking && (
                  <p className="mt-1 text-sm text-yellow-400">
                    Checking availability...
                  </p>
                )}
                {!nameValidation.checking && !nameValidation.available && (
                  <p className="mt-1 text-sm text-red-400">
                    {nameValidation.message}
                  </p>
                )}
                {!nameValidation.checking && nameValidation.available && formData.name.length > 2 && (
                  <p className="mt-1 text-sm text-green-400">
                    ✓ Organisation name is available
                  </p>
                )}
              </div>

              {/* Organisation Type - Searchable */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisation Type *
                </label>
                <SearchableSelect
                  options={ORGANISATION_TYPES}
                  value={formData.type}
                  onChange={(value) => handleChange('type', value)}
                  placeholder="Select organisation type"
                  required
                  icon={Briefcase}
                  searchPlaceholder="Search organisation type..."
                />
              </div>

              {/* Company Name (if type is business/company) */}
              {showCompanyName && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Legal Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                      companyNameValidation.checking
                        ? 'border-yellow-500'
                        : !companyNameValidation.available
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-600 focus:border-blue-500'
                    }`}
                    placeholder="Legal company name for invoicing"
                  />
                  {companyNameValidation.checking && (
                    <p className="mt-1 text-sm text-yellow-400">
                      Checking availability...
                    </p>
                  )}
                  {!companyNameValidation.checking && !companyNameValidation.available && (
                    <p className="mt-1 text-sm text-red-400">
                      {companyNameValidation.message}
                    </p>
                  )}
                  {!companyNameValidation.checking && companyNameValidation.available && formData.companyName.length > 2 && (
                    <p className="mt-1 text-sm text-green-400">
                      ✓ Legal company name is available
                    </p>
                  )}
                </div>
              )}

              {/* Country - Searchable */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Country *
                </label>
                {countriesLoading ? (
                  <div className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 flex items-center">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    Loading countries...
                  </div>
                ) : countryOptions.length === 0 ? (
                  <div className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-red-500 rounded-lg text-red-400 flex items-center">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                    No countries available. Please check database connection.
                  </div>
                ) : (
                  <SearchableSelect
                    options={countryOptions}
                    value={formData.country}
                    onChange={(value) => handleChange('country', value)}
                    placeholder="Select country"
                    required
                    icon={Globe}
                    searchPlaceholder="Search country..."
                    disabled={countriesLoading}
                  />
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Industry - Searchable */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Industry *
                </label>
                <SearchableSelect
                  options={INDUSTRIES}
                  value={formData.industry}
                  onChange={(value) => handleChange('industry', value)}
                  placeholder="Select industry"
                  required
                  searchPlaceholder="Search industry..."
                />
              </div>

              {/* Organisation Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisation Size (Optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.size}
                    onChange={(e) => handleChange('size', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website (Optional)
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Person *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="contact@example.com"
                  />
                </div>
                {userEmail && (
                  <p className="text-xs text-gray-400 mt-1">
                    Defaulted from your registration email
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Full Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    required
                    value={formData.fullAddress}
                    onChange={(e) => handleChange('fullAddress', e.target.value)}
                    rows={3}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Street address, City, State, Postal Code, Country"
                  />
                </div>
              </div>

              {/* Registration Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Registration Reference (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.registrationReference}
                    onChange={(e) => handleChange('registrationReference', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Company registration number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <strong>Email Verification Required:</strong> After creating your organisation,
                we'll send a verification email. You must verify your organisation to continue.
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Organisation...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                Create Organisation
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-6 text-center">
          By creating an organisation, you agree to our{' '}
          <a href="/terms" className="text-blue-400 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.
        </p>
        </div>
      </div>
    </div>
  );
};

export default OrganisationSetup;
