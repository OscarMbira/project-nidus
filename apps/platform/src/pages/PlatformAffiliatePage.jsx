/**
 * Platform Affiliate Program landing page — /platform/affiliate
 */
import React, { useState } from 'react'
import { CheckCircle, DollarSign, Link2, Users } from 'lucide-react'
import Button from '@nidus/ui/Button'
import Card from '@nidus/ui/Card'
import PlatformHeader from '../components/homepage/PlatformHeader'
import PlatformFooter from '../components/homepage/PlatformFooter'
import { submitAffiliateApplication } from '@nidus/shared/services/affiliateService'

const steps = [
  { icon: Users, title: 'Apply', description: 'Submit your application with how you plan to promote Nidus Platform.' },
  { icon: Link2, title: 'Get Your Link', description: 'Once approved, receive a unique referral link with your affiliate code.' },
  { icon: DollarSign, title: 'Share & Earn', description: 'Earn commission on every qualifying subscription you refer.' },
]

const faqs = [
  { q: 'What is the commission rate?', a: 'Standard rate is 10% on qualifying subscription revenue. Rates may vary by partner agreement.' },
  { q: 'When are payouts made?', a: 'Commissions are reviewed monthly and paid via bank transfer or PayPal after approval.' },
  { q: 'How long does attribution last?', a: 'Referrals are tracked for 30 days from the first click via cookie/localStorage.' },
  { q: 'What counts as a conversion?', a: 'New user signups and paid subscriptions attributed to your affiliate code.' },
]

export default function PlatformAffiliatePage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', website: '', notes: '', terms: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.terms) {
      setError('Please accept the affiliate terms to continue.')
      return
    }
    setLoading(true)
    try {
      await submitAffiliateApplication({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        target_system: 'platform',
        notes: form.notes.trim() || null,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err?.message || 'Unable to submit application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PlatformHeader />

      <section className="relative text-white py-20 md:py-28" style={{ background: 'linear-gradient(135deg, #457B9D 0%, #1D3557 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Earn with Every Referral</h1>
          <p className="text-xl opacity-95">Join the Nidus Platform Affiliate Program and earn commission when your audience subscribes.</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="p-6 text-center">
              <Icon className="h-10 w-10 mx-auto mb-4 text-blue-600" />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Commission Details</h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> 10% default commission on subscription revenue</li>
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> Monthly payout cycle after admin review</li>
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> 30-day attribution window from first click</li>
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> Ideal for PM trainers, coaches, consultants, and institutions</li>
          </ul>
        </div>
      </section>

      <section className="max-w-xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Apply Now</h2>
        {submitted ? (
          <Card className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Received</h3>
            <p className="text-gray-600 dark:text-gray-400">We&apos;ll review your application within 2 business days and email you when approved.</p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <input name="name" required placeholder="Full name" value={form.name} onChange={handleChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2" />
            <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2" />
            <input name="phone" placeholder="Phone (optional)" value={form.phone} onChange={handleChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2" />
            <input name="website" placeholder="Website / social media (optional)" value={form.website} onChange={handleChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2" />
            <textarea name="notes" rows={3} placeholder="How do you plan to promote Nidus?" value={form.notes} onChange={handleChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2" />
            <label className="flex items-start gap-2 text-sm">
              <input name="terms" type="checkbox" checked={form.terms} onChange={handleChange} className="mt-1" />
              <span>I agree to the affiliate program terms and commission policy.</span>
            </label>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting…' : 'Submit Application'}
            </Button>
          </form>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">FAQ</h2>
          <div className="space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold mb-1">{q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PlatformFooter />
    </div>
  )
}
