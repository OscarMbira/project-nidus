# Cron Job Setup Guide

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

This guide explains how to set up and manage the daily trial expiry check cron job using PostgreSQL's `pg_cron` extension.

---

## What is the Cron Job?

The trial expiry check cron job runs daily at midnight UTC to:
- Check for trials expiring in 3 days (send warning)
- Check for trials expiring in 1 day (send final warning)
- Lock expired trials (set `locked_at` timestamp)
- Update trial tracking status

---

## Prerequisites

### Required Extensions

1. **pg_cron**: PostgreSQL cron extension
2. **PostgreSQL 12+**: Required for pg_cron

### Supabase Setup

In Supabase, `pg_cron` is typically enabled by default. Verify:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If not enabled, enable it:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

## Installation

### Step 1: Run Migration

Execute the migration file:

```sql
-- Run SQL/v118_schedule_trial_expiry_cron.sql
\i SQL/v118_schedule_trial_expiry_cron.sql
```

Or manually:

```sql
-- Create the function
CREATE OR REPLACE FUNCTION check_trial_expirations_cron()
RETURNS void AS $$
-- ... (see v118 migration file)
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the job
SELECT cron.schedule(
  job_name := 'daily-trial-expiry-check',
  schedule := '0 0 * * *',
  command := 'SELECT check_trial_expirations_cron();'
);
```

### Step 2: Verify Installation

Check if job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'daily-trial-expiry-check';
```

Expected output:
- `jobname`: daily-trial-expiry-check
- `schedule`: 0 0 * * *
- `active`: true

---

## Cron Schedule Format

### Format: `minute hour day month weekday`

**Example**: `0 0 * * *`
- `0`: Minute (0-59)
- `0`: Hour (0-23, UTC)
- `*`: Day of month (1-31)
- `*`: Month (1-12)
- `*`: Day of week (0-7, 0 and 7 = Sunday)

### Common Schedules

- **Daily at midnight**: `0 0 * * *`
- **Every hour**: `0 * * * *`
- **Every 6 hours**: `0 */6 * * *`
- **Weekly (Monday)**: `0 0 * * 1`
- **Monthly (1st)**: `0 0 1 * *`

---

## Manual Execution

### Run Job Manually

For testing, run the job manually:

```sql
SELECT cron.run_job('daily-trial-expiry-check');
```

Or run the function directly:

```sql
SELECT check_trial_expirations_cron();
```

### Check Execution History

View recent executions:

```sql
SELECT 
  j.jobname,
  jr.runid,
  jr.job_pid,
  jr.database,
  jr.username,
  jr.command,
  jr.status,
  jr.return_message,
  jr.start_time,
  jr.end_time,
  jr.end_time - jr.start_time as duration
FROM cron.job_run_details jr
JOIN cron.job j ON jr.jobid = j.jobid
WHERE j.jobname = 'daily-trial-expiry-check'
ORDER BY jr.start_time DESC
LIMIT 10;
```

---

## Monitoring

### Check Job Status

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobid
FROM cron.job
WHERE jobname = 'daily-trial-expiry-check';
```

### Check Recent Executions

```sql
SELECT 
  runid,
  jobid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'daily-trial-expiry-check'
)
ORDER BY start_time DESC
LIMIT 5;
```

### Execution Status Values

- **succeeded**: Job completed successfully
- **failed**: Job failed with error
- **running**: Job is currently running

---

## Troubleshooting

### Issue: Job not running

**Check**:
1. Job is scheduled: `SELECT * FROM cron.job WHERE jobname = 'daily-trial-expiry-check';`
2. Job is active: `active = true`
3. pg_cron is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
4. Check cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`

### Issue: Job failing

**Check**:
1. Function exists: `SELECT * FROM pg_proc WHERE proname = 'check_trial_expirations_cron';`
2. Function permissions: Function should be `SECURITY DEFINER`
3. Check return_message: `SELECT return_message FROM cron.job_run_details WHERE status = 'failed';`

### Issue: Wrong schedule

**Fix**:
```sql
-- Unschedule existing job
SELECT cron.unschedule('daily-trial-expiry-check');

-- Reschedule with new time
SELECT cron.schedule(
  job_name := 'daily-trial-expiry-check',
  schedule := '0 1 * * *', -- 1 AM UTC instead of midnight
  command := 'SELECT check_trial_expirations_cron();'
);
```

---

## Updating the Job

### Change Schedule

```sql
-- Unschedule
SELECT cron.unschedule('daily-trial-expiry-check');

-- Reschedule
SELECT cron.schedule(
  job_name := 'daily-trial-expiry-check',
  schedule := '0 2 * * *', -- New time: 2 AM UTC
  command := 'SELECT check_trial_expirations_cron();'
);
```

### Update Function

```sql
-- Update the function
CREATE OR REPLACE FUNCTION check_trial_expirations_cron()
RETURNS void AS $$
-- ... updated logic ...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

No need to reschedule - function update takes effect immediately.

---

## Disabling/Enabling

### Disable Job

```sql
UPDATE cron.job
SET active = false
WHERE jobname = 'daily-trial-expiry-check';
```

### Enable Job

```sql
UPDATE cron.job
SET active = true
WHERE jobname = 'daily-trial-expiry-check';
```

### Remove Job

```sql
SELECT cron.unschedule('daily-trial-expiry-check');
```

---

## Best Practices

### Monitoring

1. **Daily Checks**: Verify job runs daily
2. **Log Review**: Check execution logs weekly
3. **Error Alerts**: Set up alerts for failures
4. **Performance**: Monitor execution time

### Maintenance

1. **Regular Updates**: Update function as needed
2. **Test Changes**: Test in staging first
3. **Backup**: Keep function code in version control
4. **Documentation**: Document any customizations

### Security

1. **SECURITY DEFINER**: Function uses SECURITY DEFINER for permissions
2. **Limited Access**: Restrict who can modify cron jobs
3. **Audit Logs**: Keep execution history
4. **Error Handling**: Handle errors gracefully

---

## Alternative: Supabase Edge Function

If `pg_cron` is not available, use Supabase Cron with Edge Function:

### Step 1: Deploy Edge Function

```bash
supabase functions deploy check-trial-expirations
```

### Step 2: Schedule via Supabase Dashboard

1. Go to **Database** > **Cron Jobs**
2. Create new cron job
3. Set schedule: `0 0 * * *` (daily at midnight)
4. Set URL: `https://YOUR_PROJECT.supabase.co/functions/v1/check-trial-expirations`
5. Set method: POST
6. Add headers: `Authorization: Bearer YOUR_ANON_KEY`

---

## Testing

### Test Function

```sql
-- Test the function directly
SELECT check_trial_expirations_cron();

-- Check results
SELECT * FROM trial_project_tracking
WHERE reminder_3_days_sent = true
OR reminder_1_day_sent = true
OR status = 'expired'
ORDER BY updated_at DESC;
```

### Test Cron Job

```sql
-- Run job manually
SELECT cron.run_job('daily-trial-expiry-check');

-- Wait a few seconds, then check
SELECT * FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'daily-trial-expiry-check'
)
ORDER BY start_time DESC
LIMIT 1;
```

---

## Support

For cron job issues:
- **Email**: devops@yourdomain.com
- **Subject**: "Cron Job Support"
- **Include**: Job name, error messages, execution logs

---

**Last Updated**: 2025-01-XX

