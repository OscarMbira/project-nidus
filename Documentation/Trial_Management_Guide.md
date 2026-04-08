# Trial Management Guide

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

This guide explains how trial projects work, including eligibility, limitations, expiry management, and upgrade processes.

---

## Trial Eligibility

### One Trial Per Organisation

- Each organisation can create **one free trial project**
- Trial eligibility is checked automatically
- If you've already used your trial, you must create a paid project

### Eligibility Check

The system checks:
1. Does the organisation have an existing trial project?
2. Has the trial been upgraded to paid?
3. Has the trial expired?

If any trial exists (active, expired, or upgraded), a new trial is **not eligible**.

---

## Trial Features & Limitations

### Available Features

✅ **Available in Trial**:
- Basic project management
- Task creation and management
- Team collaboration (up to 5 members)
- Basic reporting
- Project boards
- File uploads (limited storage)

### Limited Features

⚠️ **Limited in Trial**:
- **Team Members**: Maximum 5 members
- **Storage**: Limited file storage
- **Projects**: Only 1 trial project

### Locked Features

🔒 **Requires Upgrade**:
- Advanced analytics
- Resource management
- Advanced reporting
- Unlimited team members
- Multiple projects
- API access
- Custom integrations
- Priority support

---

## Trial Duration

### Standard Trial Period

- **Duration**: 14 days from project creation
- **Start Date**: When trial project is created
- **End Date**: Automatically calculated (start date + 14 days)

### Trial Expiry Process

1. **Day 11** (3 days remaining): First warning email sent
2. **Day 13** (1 day remaining): Final warning email sent
3. **Day 14** (expiry): Project is locked, upgrade required

---

## Trial Dashboard

### Features

The trial dashboard provides:
- **Countdown Timer**: Days remaining in trial
- **Upgrade Prompts**: Prominent upgrade buttons
- **Feature Status**: Shows available/limited/locked features
- **Member Count**: Current team size vs. limit
- **Quick Actions**: Direct upgrade options

### Countdown Display

- **Green** (7+ days): Plenty of time
- **Yellow** (3-6 days): Consider upgrading
- **Orange** (1-2 days): Urgent upgrade needed
- **Red** (Expired): Project locked

---

## Trial Expiry & Locking

### What Happens on Expiry

1. **Project Locked**: Project becomes read-only
2. **Expiry Modal**: Non-dismissible modal appears
3. **Data Preserved**: All data remains intact
4. **Upgrade Required**: Must upgrade to continue

### Locked Project Behavior

- ✅ **Can View**: All data is visible
- ✅ **Can Export**: Data can be exported
- ❌ **Cannot Edit**: No modifications allowed
- ❌ **Cannot Add**: No new tasks/members
- ❌ **Cannot Delete**: No deletions allowed

### Unlocking After Upgrade

- **Immediate**: Project unlocks after successful payment
- **Automatic**: No manual intervention needed
- **Data Intact**: All data preserved

---

## Upgrade Process

### From Trial Dashboard

1. Click **"Upgrade Now"** button
2. Select subscription plan
3. Choose billing cycle (Monthly/Yearly)
4. Select number of team members
5. Complete payment via Paynow
6. Project automatically upgrades

### From Expiry Modal

1. Modal appears when trial expires
2. Click **"Upgrade to Continue"**
3. Follow same upgrade flow
4. Project unlocks after payment

### Upgrade Benefits

After upgrading:
- ✅ **Unlimited Members**: Remove 5-member limit
- ✅ **Full Features**: Access all features
- ✅ **Multiple Projects**: Create additional projects
- ✅ **Priority Support**: Enhanced support
- ✅ **Data Preserved**: All trial data retained

---

## Trial Tracking

### Database Tracking

The system tracks:
- **Trial Start Date**: When trial began
- **Trial End Date**: When trial expires
- **Status**: active, expired, upgraded
- **Reminder Flags**: Which reminders were sent
- **Upgrade Date**: When upgraded (if applicable)

### Status Values

- **active**: Trial is currently active
- **expired**: Trial has expired, project locked
- **upgraded**: Trial was upgraded to paid

---

## Email Notifications

### Reminder Emails

**3-Day Warning**:
- Subject: "Your trial expires in 3 days"
- Content: Days remaining, upgrade link, benefits

**1-Day Warning**:
- Subject: "Your trial expires tomorrow"
- Content: Urgent upgrade prompt, upgrade link

**Expiry Notification**:
- Subject: "Your trial has expired"
- Content: Project locked, upgrade required, upgrade link

### Email Delivery

- Emails sent to organisation owner
- Check spam folder if not received
- Can be resent manually by support

---

## Best Practices

### Before Trial Starts

1. **Plan Your Trial**: Know what you want to test
2. **Invite Team**: Add team members early
3. **Set Up Project**: Configure project settings
4. **Create Sample Data**: Test with real data

### During Trial

1. **Monitor Countdown**: Keep track of days remaining
2. **Test Features**: Explore available features
3. **Evaluate Fit**: Determine if platform meets needs
4. **Plan Upgrade**: Decide on plan before expiry

### Before Expiry

1. **Export Data**: Backup important data (optional)
2. **Upgrade Early**: Don't wait until last minute
3. **Choose Plan**: Select appropriate subscription
4. **Complete Payment**: Ensure payment succeeds

---

## Troubleshooting

### Issue: "Trial not eligible"

**Cause**: Organisation already has a trial (active, expired, or upgraded)

**Solution**: Create a paid project instead

### Issue: "Trial expired but project not locked"

**Cause**: Cron job may not have run yet

**Solution**: 
1. Wait a few minutes
2. Refresh the page
3. Contact support if issue persists

### Issue: "Upgrade button not working"

**Solutions**:
1. Check internet connection
2. Try refreshing the page
3. Clear browser cache
4. Contact support

### Issue: "Payment succeeded but project still locked"

**Cause**: Payment verification may be delayed

**Solutions**:
1. Wait 1-2 minutes
2. Refresh the page
3. Check payment status
4. Contact support with payment reference

---

## API Reference

### Check Trial Eligibility

```javascript
import { checkTrialEligibility } from '@/services/organisationService';

const eligible = await checkTrialEligibility(accountId);
```

### Get Trial Status

```javascript
import { getTrialStatus } from '@/services/trialService';

const status = await getTrialStatus(projectId);
// Returns: { days_remaining, is_expired, trial_end_date, ... }
```

### Upgrade Trial

```javascript
import { upgradeTrialProject } from '@/services/trialService';

await upgradeTrialProject(projectId, subscriptionId);
```

---

## Support

For trial-related issues:
- **Email**: support@yourdomain.com
- **Subject**: "Trial Management Support"
- **Include**: Organisation ID, Project ID, Issue description

---

**Last Updated**: 2025-01-XX

