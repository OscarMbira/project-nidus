# Deployment Guide - Registration Flow Revamp

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

This guide provides step-by-step instructions for deploying the Registration Flow Revamp to production.

---

## Pre-Deployment Checklist

### Code Review
- [ ] All code reviewed and approved
- [ ] All tests passing (unit + integration)
- [ ] No linter errors
- [ ] Code follows project conventions

### Database
- [ ] Full database backup created
- [ ] Migrations tested on staging
- [ ] Rollback plan prepared
- [ ] Migration order verified (v109-v119)

### Environment
- [ ] Staging environment tested
- [ ] Paynow test/sandbox tested
- [ ] Email service configured
- [ ] Environment variables documented

### Documentation
- [ ] User guides complete
- [ ] API documentation updated
- [ ] Deployment guide reviewed
- [ ] Troubleshooting guide ready

---

## Deployment Steps

### Step 1: Database Backup

**CRITICAL**: Always backup before migrations!

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or via Supabase Dashboard
# Go to Database > Backups > Create Backup
```

### Step 2: Deploy Database Migrations

**IMPORTANT**: Run migrations in order!

```sql
-- Execute in order:
\i SQL/v109_accounts_trial_enhancements.sql
\i SQL/v110_projects_trial_mode.sql
\i SQL/v111_subscriptions_project_link.sql
\i SQL/v112_trial_project_tracking.sql
\i SQL/v113_subscription_plans.sql
\i SQL/v114_trial_functions.sql
\i SQL/v115_trial_triggers.sql
\i SQL/v116_migrate_existing_users.sql
\i SQL/v117_payment_transactions_table.sql
\i SQL/v118_schedule_trial_expiry_cron.sql
\i SQL/v119_verify_migration_data.sql
```

**Verify each migration**:
```sql
-- Check migration was applied
SELECT * FROM schema_migrations 
WHERE version IN ('v109', 'v110', 'v111', 'v112', 'v113', 'v114', 'v115', 'v116', 'v117', 'v118', 'v119')
ORDER BY version;
```

### Step 3: Verify Migration Data

Run verification script:

```sql
\i SQL/v119_verify_migration_data.sql
```

**Expected**: All checks should pass (0 issues)

If issues found:
1. Review detailed queries
2. Run fix queries (if provided)
3. Re-run verification
4. Document any manual fixes

### Step 4: Deploy Supabase Edge Functions

```bash
# Deploy Paynow functions
supabase functions deploy paynow-initiate
supabase functions deploy paynow-poll
supabase functions deploy paynow-verify-subscription
supabase functions deploy paynow-webhook

# Deploy trial expiry check
supabase functions deploy check-trial-expirations
```

**Verify deployment**:
```bash
# List deployed functions
supabase functions list
```

### Step 5: Configure Environment Variables

In Supabase Dashboard > Project Settings > Edge Functions:

**Required Variables**:
```bash
# Paynow Configuration
PAYNOW_INTEGRATION_ID=your_production_integration_id
PAYNOW_INTEGRATION_KEY=your_production_integration_key
PAYNOW_URL=https://www.paynow.co.zw/interface/initiatetransaction

# Application URLs
SITE_URL=https://yourdomain.com
PAYNOW_RETURN_URL=https://yourdomain.com/checkout/success
PAYNOW_RESULT_URL=https://yourdomain.com/api/webhooks/paynow

# Supabase (usually auto-configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 6: Configure Paynow Webhooks

1. Log in to Paynow dashboard
2. Go to **Settings** > **Webhooks**
3. Set webhook URL: `https://YOUR_PROJECT.supabase.co/functions/v1/paynow-webhook`
4. Enable events:
   - Payment Created
   - Payment Paid
   - Payment Cancelled
   - Payment Failed
5. Save configuration

**Test webhook**:
- Make a test payment
- Verify webhook is received
- Check webhook logs in Supabase

### Step 7: Verify Cron Job

```sql
-- Check cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'daily-trial-expiry-check';

-- Expected: active = true, schedule = '0 0 * * *'
```

**Test cron job**:
```sql
-- Run manually
SELECT cron.run_job('daily-trial-expiry-check');

-- Check execution
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-trial-expiry-check')
ORDER BY start_time DESC
LIMIT 1;
```

### Step 8: Deploy Frontend

```bash
# Build production bundle
npm run build

# Deploy to hosting (Vercel, Netlify, etc.)
# Follow your hosting provider's deployment process
```

**Verify deployment**:
- [ ] Site loads correctly
- [ ] All routes accessible
- [ ] No console errors
- [ ] Authentication works

### Step 9: Smoke Tests

**Critical Paths to Test**:

1. **New User Registration**:
   - [ ] Sign up with new email
   - [ ] Verify email
   - [ ] Create organisation
   - [ ] Verify organisation
   - [ ] Select trial project
   - [ ] Create trial project
   - [ ] Access trial dashboard

2. **Existing User Login**:
   - [ ] Login with existing account
   - [ ] Verify organisation check works
   - [ ] Access dashboard

3. **Trial Project**:
   - [ ] Trial dashboard displays
   - [ ] Countdown works
   - [ ] Upgrade button works

4. **Payment Flow**:
   - [ ] Select paid project
   - [ ] Choose plan
   - [ ] Complete payment (test mode)
   - [ ] Verify subscription created

5. **Trial Upgrade**:
   - [ ] Click upgrade from trial dashboard
   - [ ] Select plan
   - [ ] Complete payment
   - [ ] Verify project unlocks

### Step 10: Monitor

**First 24 Hours**:
- [ ] Monitor error logs
- [ ] Check payment success rate
- [ ] Verify webhook processing
- [ ] Check cron job execution
- [ ] Monitor user registrations

**Monitoring Queries**:

```sql
-- Check recent registrations
SELECT COUNT(*) as new_registrations
FROM accounts
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check payment success rate
SELECT 
  status,
  COUNT(*) as count
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Check trial projects created
SELECT COUNT(*) as trial_projects
FROM trial_project_tracking
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## Rollback Plan

### If Migration Fails

1. **Stop**: Don't proceed with remaining steps
2. **Assess**: Review error messages
3. **Restore**: Restore from backup if needed
4. **Fix**: Address issues in staging
5. **Retry**: Test fix before retrying

### Rollback Steps

```sql
-- If needed, rollback specific migration
-- (Each migration should be idempotent, but verify)

-- Restore from backup
-- Use Supabase Dashboard or CLI restore command
```

### Frontend Rollback

- Revert to previous deployment
- Use hosting provider's rollback feature
- Or redeploy previous build

---

## Post-Deployment

### Day 1

- [ ] Monitor error rates
- [ ] Check user registrations
- [ ] Verify payment processing
- [ ] Test trial expiry (manual trigger)
- [ ] Review user feedback

### Week 1

- [ ] Review analytics
- [ ] Check conversion rates
- [ ] Monitor support tickets
- [ ] Gather user feedback
- [ ] Address any issues

### Month 1

- [ ] Review KPIs
- [ ] Analyze trial conversion
- [ ] Optimize based on data
- [ ] Plan improvements

---

## Troubleshooting

### Issue: Migration fails

**Check**:
1. Database permissions
2. Extension availability (pg_cron, etc.)
3. Table conflicts
4. Constraint violations

**Solution**: Review error, fix in staging, retry

### Issue: Edge Functions not working

**Check**:
1. Functions deployed correctly
2. Environment variables set
3. Function logs
4. Network connectivity

**Solution**: Redeploy functions, verify config

### Issue: Webhooks not received

**Check**:
1. Webhook URL correct in Paynow
2. Endpoint accessible (HTTPS)
3. Paynow sending webhooks
4. Function logs

**Solution**: Verify URL, test endpoint, check Paynow logs

### Issue: Cron job not running

**Check**:
1. pg_cron enabled
2. Job scheduled correctly
3. Job active
4. Execution logs

**Solution**: Verify schedule, check logs, test manually

---

## Success Metrics

### Week 1 Targets

- **Registration Completion**: 70%+ (verified organisations / signups)
- **Payment Success Rate**: 95%+
- **Trial Creation**: Successful trial project creation
- **Error Rate**: <1% of requests

### Month 1 Targets

- **Trial Conversion**: 15-25% (upgraded / trials)
- **User Satisfaction**: Positive feedback
- **System Stability**: 99.9% uptime
- **Support Tickets**: Minimal issues

---

## Support Contacts

**Deployment Issues**:
- **Email**: devops@yourdomain.com
- **Slack**: #deployment-support

**Production Issues**:
- **Email**: support@yourdomain.com
- **On-Call**: Check rotation schedule

---

## Additional Resources

- [User Guide](./Registration_Flow_User_Guide.md)
- [Trial Management](./Trial_Management_Guide.md)
- [Paynow Setup](./Paynow_Webhook_Setup.md)
- [Cron Job Setup](./Cron_Job_Setup.md)

---

**Last Updated**: 2025-01-XX

