/**
 * Registration wizard — Step 2: Your Organisation (v918, CLAUDE.md Phase 5)
 * Collects organisation basics only. Account creation itself now happens at the end of the
 * wizard (Workspace Setup step) so an incomplete/abandoned wizard never leaves a half-set-up
 * accounts row behind — see registrationWizard/ for the rest of the flow.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Mail, Phone, Globe, Briefcase, Users, User, MapPin, FileText, Link as LinkIcon } from 'lucide-react';
import { platformDb, supabase } from '@nidus/supabase';
import { checkOrganisationStatusByAuthId, getPostLoginRoute } from '../../services/postLoginRouter';
import SearchableSelect from '@nidus/ui/SearchableSelect';
import { isPlatformBillingEnabled } from '@nidus/config/platformBillingFeatures.js';
import WizardStepLayout from './registrationWizard/WizardStepLayout';

// Move static data outside component to prevent recreation on every render
const ORGANISATION_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'business', label: 'Small Business' },
  { value: 'company', label: 'Company' }
];

// No fallback countries - all data must come from database per user requirements

const OrganisationSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const billingEnabled = isPlatformBillingEnabled();
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    ...(location.state?.orgFormData || {}),
    name: location.state?.orgFormData?.name || '',
    type: location.state?.orgFormData?.type || 'company',
    companyName: location.state?.orgFormData?.companyName || '',
    country: location.state?.orgFormData?.country || '',
    phone: location.state?.orgFormData?.phone || '',
    size: location.state?.orgFormData?.size || '',
    website: location.state?.orgFormData?.website || '',
    contactPerson: location.state?.orgFormData?.contactPerson || '',
    email: location.state?.orgFormData?.email || '',
    billingEmail: location.state?.orgFormData?.billingEmail || '',
    fullAddress: location.state?.orgFormData?.fullAddress || '',
    registrationReference: location.state?.orgFormData?.registrationReference || ''
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

  // Invited PMO admins join an existing organisation — skip mandatory org creation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id || cancelled) return;
        const orgStatus = await checkOrganisationStatusByAuthId(user.id);
        if (cancelled || !orgStatus.exists || !orgStatus.isInvitedMember) return;
        const { route } = await getPostLoginRoute(user.id);
        if (!cancelled && route && route !== '/onboarding/organisation-setup') {
          navigate(route, { replace: true });
        }
      } catch (err) {
        console.warn('[OrganisationSetup] invited member redirect skipped:', err?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  // Load user email immediately (critical for form)
  useEffect(() => {
    const loadUserEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          setFormData(prev => ({ ...prev, email: prev.email || user.email, billingEmail: prev.billingEmail || user.email }));
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
        let { data, error } = await platformDb
          .from('countries')
          .select('code, name, is_active, is_deleted')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('name', { ascending: true })
          .limit(250);

        if (error || !data || data.length === 0) {
          const result = await platformDb
            .from('countries')
            .select('code, name, is_active, is_deleted')
            .eq('is_deleted', false)
            .order('name', { ascending: true })
            .limit(250);

          if (result.error) {
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
          setCountries([]);
          setCountriesLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const validCountries = data.filter(c => c && c.code && c.name);
          setCountries(validCountries);
        } else {
          setCountries([]);
        }
      } catch (error) {
        console.error('Exception loading countries:', error);
        setCountries([]);
      } finally {
        setCountriesLoading(false);
      }
    };

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

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!nameValidation.available) {
      return;
    }
    if (!companyNameValidation.available) {
      return;
    }

    navigate('/onboarding/industry-selection', { state: { orgFormData: formData } });
  }, [formData, navigate, nameValidation.available, companyNameValidation.available]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const countryOptions = useMemo(() => {
    if (!countries || countries.length === 0) return [];
    return countries.map(c => {
      if (!c || !c.code || !c.name) return null;
      return { value: c.code, label: c.name };
    }).filter(Boolean);
  }, [countries]);

  const showCompanyName = useMemo(() => {
    return formData.type === 'business' || formData.type === 'company';
  }, [formData.type]);

  return (
    <WizardStepLayout
      stepId="organisation"
      icon={Building2}
      title="Create Your Organisation"
      subtitle="This is required to access the platform. One email = one organisation."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organisation Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white focus:outline-none ${
                    nameValidation.checking
                      ? 'border-yellow-500'
                      : !nameValidation.available
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
                  }`}
                  placeholder="Acme Corporation"
                />
              </div>
              {nameValidation.checking && (
                <p className="mt-1 text-sm text-yellow-500 dark:text-yellow-400">Checking availability...</p>
              )}
              {!nameValidation.checking && !nameValidation.available && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{nameValidation.message}</p>
              )}
              {!nameValidation.checking && nameValidation.available && formData.name.length > 2 && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">✓ Organisation name is available</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

            {showCompanyName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Legal Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white focus:outline-none ${
                    companyNameValidation.checking
                      ? 'border-yellow-500'
                      : !companyNameValidation.available
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
                  }`}
                  placeholder="Legal company name for invoicing"
                />
                {companyNameValidation.checking && (
                  <p className="mt-1 text-sm text-yellow-500 dark:text-yellow-400">Checking availability...</p>
                )}
                {!companyNameValidation.checking && !companyNameValidation.available && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400">{companyNameValidation.message}</p>
                )}
                {!companyNameValidation.checking && companyNameValidation.available && formData.companyName.length > 2 && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">✓ Legal company name is available</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country *
              </label>
              {countriesLoading ? (
                <div className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 flex items-center">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  Loading countries...
                </div>
              ) : countryOptions.length === 0 ? (
                <div className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-red-500 rounded-lg text-red-600 dark:text-red-400 flex items-center">
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

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organisation Size (Optional)
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={formData.size}
                  onChange={(e) => handleChange('size', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website (Optional)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Person *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="contact@example.com"
                />
              </div>
              {userEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Defaulted from your registration email</p>
              )}
            </div>

            {billingEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Billing email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.billingEmail}
                    onChange={(e) => handleChange('billingEmail', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="billing@example.com"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invoices and subscription notices are sent here</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  required
                  value={formData.fullAddress}
                  onChange={(e) => handleChange('fullAddress', e.target.value)}
                  rows={3}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Street address, City, State, Postal Code, Country"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Registration Reference (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.registrationReference}
                  onChange={(e) => handleChange('registrationReference', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Company registration number"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue
        </button>
      </form>
    </WizardStepLayout>
  );
};

export default OrganisationSetup;
