# Email Templates for Registration Flow

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

This document contains HTML email templates for the registration flow, including organisation verification, trial reminders, and expiry notifications.

---

## Template 1: Organisation Verification Email

### Subject: Verify Your Organisation - [Organisation Name]

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Organisation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Verify Your Organisation</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    
    <p>Thank you for creating your organisation <strong>{{organisation_name}}</strong> on our platform.</p>
    
    <p>To complete your registration and start creating projects, please verify your organisation by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verification_link}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Verify Organisation
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #667eea;">{{verification_link}}</p>
    
    <p><strong>This link will expire in 24 hours.</strong></p>
    
    <p>If you didn't create this organisation, please ignore this email.</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666;">
      Best regards,<br>
      The Platform Team
    </p>
  </div>
</body>
</html>
```

### Variables
- `{{organisation_name}}`: Name of the organisation
- `{{verification_link}}`: Full verification URL with token

---

## Template 2: Trial Expiry Warning (3 Days)

### Subject: Your Trial Expires in 3 Days - [Project Name]

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Expiring Soon</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">⏰ Trial Expiring Soon</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    
    <p>Your trial project <strong>{{project_name}}</strong> will expire in <strong style="color: #f5576c;">3 days</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f5576c;">
      <p style="margin: 0;"><strong>Days Remaining:</strong> {{days_remaining}}</p>
      <p style="margin: 5px 0 0 0;"><strong>Expiry Date:</strong> {{expiry_date}}</p>
    </div>
    
    <p>To continue using your project and unlock all features, upgrade to a paid subscription:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{upgrade_link}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Upgrade Now
      </a>
    </div>
    
    <p><strong>Benefits of upgrading:</strong></p>
    <ul>
      <li>Unlimited team members</li>
      <li>All advanced features</li>
      <li>Multiple projects</li>
      <li>Priority support</li>
      <li>Your data preserved</li>
    </ul>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666;">
      Best regards,<br>
      The Platform Team
    </p>
  </div>
</body>
</html>
```

### Variables
- `{{project_name}}`: Name of the trial project
- `{{days_remaining}}`: Number of days remaining
- `{{expiry_date}}`: Expiry date (formatted)
- `{{upgrade_link}}`: Link to upgrade page

---

## Template 3: Trial Expiry Warning (1 Day)

### Subject: ⚠️ Your Trial Expires Tomorrow - [Project Name]

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Final Trial Warning</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">⚠️ Final Warning</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    
    <p><strong style="color: #fa709a; font-size: 18px;">Your trial expires tomorrow!</strong></p>
    
    <p>Your trial project <strong>{{project_name}}</strong> will be locked in <strong style="color: #fa709a;">1 day</strong>.</p>
    
    <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #856404;">⏰ Time is running out!</p>
      <p style="margin: 5px 0 0 0;">Upgrade now to keep your project active and preserve all your data.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{upgrade_link}}" style="background: #fa709a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
        Upgrade Now - Don't Lose Your Data
      </a>
    </div>
    
    <p><strong>What happens if you don't upgrade?</strong></p>
    <ul>
      <li>Project will be locked (read-only)</li>
      <li>No new tasks or members can be added</li>
      <li>All data will be preserved</li>
      <li>You can upgrade anytime to unlock</li>
    </ul>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666;">
      Best regards,<br>
      The Platform Team
    </p>
  </div>
</body>
</html>
```

---

## Template 4: Trial Expired Notification

### Subject: Your Trial Has Expired - Upgrade to Continue

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Expired</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">🔒 Trial Expired</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    
    <p>Your trial period for <strong>{{project_name}}</strong> has ended.</p>
    
    <div style="background: #f8d7da; border: 2px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #721c24;">Your project is now locked</p>
      <p style="margin: 5px 0 0 0; color: #721c24;">Upgrade to unlock and continue working.</p>
    </div>
    
    <p><strong>Don't worry - all your data is safe!</strong> Your project data has been preserved. Upgrade now to unlock your project and continue where you left off.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{upgrade_link}}" style="background: #eb3349; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
        Unlock My Project
      </a>
    </div>
    
    <p><strong>What you'll get:</strong></p>
    <ul>
      <li>✅ Full access to your project</li>
      <li>✅ All your data preserved</li>
      <li>✅ Unlimited team members</li>
      <li>✅ All advanced features</li>
      <li>✅ Priority support</li>
    </ul>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666;">
      Best regards,<br>
      The Platform Team
    </p>
  </div>
</body>
</html>
```

---

## Template 5: Payment Success Confirmation

### Subject: Payment Successful - Your Subscription is Active

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">✅ Payment Successful</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello,</p>
    
    <p>Thank you for your payment! Your subscription is now active.</p>
    
    <div style="background: #d4edda; border: 2px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #155724;">Subscription Details:</p>
      <p style="margin: 5px 0 0 0;"><strong>Plan:</strong> {{plan_name}}</p>
      <p style="margin: 5px 0 0 0;"><strong>Billing Cycle:</strong> {{billing_cycle}}</p>
      <p style="margin: 5px 0 0 0;"><strong>Amount:</strong> {{amount}} {{currency}}</p>
      <p style="margin: 5px 0 0 0;"><strong>Next Billing:</strong> {{next_billing_date}}</p>
    </div>
    
    <p>Your project <strong>{{project_name}}</strong> is now fully unlocked with all features available.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboard_link}}" style="background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Go to Dashboard
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666;">
      Best regards,<br>
      The Platform Team
    </p>
  </div>
</body>
</html>
```

---

## Implementation Notes

### Email Service Integration

These templates should be integrated with your email service (SendGrid, AWS SES, etc.):

```javascript
// Example integration
import { sendEmail } from './emailService';

await sendEmail({
  to: userEmail,
  subject: 'Verify Your Organisation',
  template: 'organisation-verification',
  data: {
    organisation_name: org.name,
    verification_link: verificationUrl
  }
});
```

### Template Variables

All templates use `{{variable_name}}` syntax. Replace these with actual values before sending.

### Styling

- Templates use inline CSS for email client compatibility
- Responsive design with max-width: 600px
- Gradient headers for visual appeal
- Clear call-to-action buttons

---

**Last Updated**: 2025-01-XX

