# Administrator User Guide
**Project Nidus - Complete Administration Guide**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Management](#user-management)
4. [Role and Permission Management](#role-and-permission-management)
5. [System Configuration](#system-configuration)
6. [Security Settings](#security-settings)
7. [Audit Log Review](#audit-log-review)
8. [SSO Configuration](#sso-configuration)
9. [MFA Policy Management](#mfa-policy-management)
10. [GDPR Compliance Management](#gdpr-compliance-management)
11. [Help System Management](#help-system-management)
12. [Performance Monitoring](#performance-monitoring)
13. [Bug Tracking](#bug-tracking)
14. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide is designed for system administrators responsible for managing Project Nidus. It covers all administrative functions, security settings, and system configuration.

**Key Responsibilities:**
- User and role management
- Security configuration and monitoring
- System configuration and maintenance
- Compliance management (GDPR, audit logs)
- Performance monitoring
- Help content management

---

## Getting Started

### Accessing Admin Features

1. Log in with an administrator account
2. Navigate to the **Administration** menu in the main navigation
3. Access admin features from the dropdown menu

### Admin Dashboard Overview

The admin dashboard provides access to:
- **User Management**: Create, edit, and manage users
- **Security Monitoring**: View security alerts and incidents
- **Audit Logs**: Review system activity logs
- **GDPR Compliance**: Manage data protection and user rights
- **SSO Management**: Configure single sign-on providers
- **Performance Dashboard**: Monitor system performance
- **Help Management**: Manage help articles and content
- **Bug Tracking**: Track and manage bug reports

---

## User Management

### Creating Users

1. Navigate to **Administration > User Management**
2. Click **Create New User**
3. Fill in user details:
   - Full name
   - Email address
   - Password (or send invitation email)
   - Roles
4. Click **Save**

### Managing User Roles

1. Navigate to **Administration > User Management**
2. Select a user
3. Click **Edit Roles**
4. Assign or remove roles:
   - **System Admin**: Full system access
   - **Project Manager**: Project management capabilities
   - **Team Lead**: Team management capabilities
   - **Team Member**: Basic user access
5. Click **Save**

### User Status Management

- **Active**: User can log in and use the system
- **Inactive**: User account is temporarily disabled
- **Suspended**: User access is restricted due to policy violation
- **Deleted**: User account is permanently removed (soft delete)

---

## Role and Permission Management

### Understanding Roles

The system includes predefined roles:
- **System Admin**: Full administrative access
- **Project Manager**: Create and manage projects
- **Team Lead**: Manage teams and tasks
- **Team Member**: Basic project participation

### Custom Roles (Future)

Custom roles can be created with specific permission sets for your organization's needs.

---

## System Configuration

### General Settings

Access **Administration > System Settings** to configure:
- Organization name and details
- Default timezone
- Date and time formats
- Email settings
- Notification preferences

### Feature Flags

Enable or disable specific features:
- Methodologies (Structured PM, Scrum, Kanban)
- Integrations (Jira, Microsoft 365, Google Workspace)
- Advanced features (Portfolio Management, Programme Management)

---

## Security Settings

### Security Monitoring

Navigate to **Administration > Security > Monitoring** to:
- View security alerts and incidents
- Monitor failed login attempts
- Review suspicious activity
- Track security events in real-time

### Security Policies

Configure security policies:
- Password requirements
- Session timeout
- IP restrictions
- Device restrictions

---

## Audit Log Review

### Accessing Audit Logs

1. Navigate to **Administration > Security > Audit Logs**
2. Filter logs by:
   - Date range
   - User
   - Action type
   - Resource type
3. Export logs for compliance reporting

### Audit Log Retention

Configure audit log retention policies based on compliance requirements (GDPR, ISO 27001).

---

## SSO Configuration

### Setting Up SSO Providers

1. Navigate to **Administration > Security > SSO Management**
2. Click **Add SSO Provider**
3. Configure provider details:
   - Provider name
   - Protocol (SAML 2.0 or OAuth 2.0)
   - Endpoint URLs
   - Certificate/key configuration
4. Test connection
5. Enable provider

### Supported SSO Providers

- SAML 2.0 compliant providers (Azure AD, Okta, OneLogin, etc.)
- OAuth 2.0 providers (Google, Microsoft, etc.)

---

## MFA Policy Management

### Enforcing MFA

1. Navigate to **Administration > Security > MFA Settings**
2. Configure MFA policy:
   - Require MFA for all users
   - Require MFA for admin accounts only
   - Require MFA for external users
3. Set allowed MFA methods:
   - Authenticator apps (TOTP)
   - SMS
   - Email
   - Hardware tokens
4. Save settings

### MFA Exemptions

Configure exemptions for trusted IP ranges or specific user groups.

---

## GDPR Compliance Management

### Data Processing Records

Navigate to **Administration > GDPR > Data Processing Records** to:
- View all data processing activities
- Track legal basis for processing
- Manage data retention policies

### User Rights Management

Manage user data rights requests:
- **Right to Access**: Export user data
- **Right to Rectification**: Update user information
- **Right to Erasure**: Delete user accounts and data
- **Right to Portability**: Export data in machine-readable format

### Data Breach Tracking

Track and manage data breach incidents:
- Record breach details
- Assess impact
- Notify affected users
- Document remediation actions

---

## Help System Management

Navigate to **Administration > Help Management** to:
- Create and edit help articles
- Manage help categories
- Configure guided tours
- Review user feedback
- View help analytics

See the Help System section for detailed instructions.

---

## Performance Monitoring

### Performance Dashboard

Navigate to **Administration > Performance** to view:
- Page load times
- API response times
- Component render times
- Database query performance
- Cache statistics

### Performance Optimization

- Monitor slow queries
- Identify performance bottlenecks
- Configure caching strategies
- Optimize database indexes

---

## Bug Tracking

Navigate to **Administration > Bug Tracking** to:
- View all bug reports
- Assign bugs to developers
- Track bug status and resolution
- Prioritize bug fixes
- Generate bug reports

---

## Troubleshooting

### Common Issues

**Users cannot log in:**
- Check user account status
- Verify SSO configuration
- Review authentication logs

**Performance issues:**
- Check Performance Dashboard
- Review database query logs
- Verify cache configuration

**Security alerts:**
- Review Security Monitoring dashboard
- Check audit logs for suspicious activity
- Verify security policy settings

---

## Additional Resources

- [User Security Guide](../Documentation/User_Security_Guide.md)
- [API Security Guide](../Documentation/API_Security_Guide.md)
- [Security Operations Manual](../Documentation/Security_Operations_Manual.md)
- [Troubleshooting Guide](../Documentation/Troubleshooting_Guide.md)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0

