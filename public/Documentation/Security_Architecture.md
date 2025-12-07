# Security Architecture

**Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Production

---

## Executive Summary

This document outlines the security architecture of the Project Nidus application. It describes the security layers, authentication mechanisms, authorization models, encryption strategies, network security measures, and data protection mechanisms implemented to ensure the confidentiality, integrity, and availability of the system.

---

## Table of Contents

1. [Security Layers](#security-layers)
2. [Authentication Flow](#authentication-flow)
3. [Authorization Model](#authorization-model)
4. [Encryption Strategy](#encryption-strategy)
5. [Network Security](#network-security)
6. [Data Protection](#data-protection)
7. [Security Controls](#security-controls)
8. [Compliance](#compliance)

---

## Security Layers

### Layer 1: Network Security
- **TLS/SSL Encryption**: All communications are encrypted using TLS 1.3 (minimum TLS 1.2)
- **HTTPS Only**: All API endpoints and web interfaces require HTTPS
- **Perfect Forward Secrecy (PFS)**: Enabled for all TLS connections
- **Certificate Management**: Automated certificate renewal via Let's Encrypt or commercial CA
- **DDoS Protection**: Cloud-based DDoS protection at the infrastructure level
- **Firewall Rules**: Network-level firewall rules restrict access to application services

### Layer 2: Application Security
- **Input Validation**: All user inputs are validated and sanitized
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Prevention**: Content Security Policy (CSP) and output encoding
- **CSRF Protection**: Token-based CSRF protection for state-changing operations
- **Rate Limiting**: API and authentication rate limiting to prevent brute-force attacks
- **Session Management**: Secure session tokens with configurable timeout

### Layer 3: Authentication & Authorization
- **Multi-Factor Authentication (MFA)**: Support for TOTP, SMS, Email, WebAuthn, and Backup Codes
- **Single Sign-On (SSO)**: Integration with SAML 2.0, OAuth 2.0, and OIDC providers
- **Password Policy**: Enforced password complexity requirements
- **Role-Based Access Control (RBAC)**: Granular permission system
- **Row-Level Security (RLS)**: Database-level access control
- **API Key Management**: Secure API key generation and management

### Layer 4: Data Protection
- **Encryption at Rest**: Database encryption using AES-256-GCM
- **Field-Level Encryption**: Sensitive fields encrypted with application-level encryption
- **Encryption Key Management**: Keys stored in secure vault (Supabase Vault or AWS KMS)
- **Key Rotation**: Automated encryption key rotation every 90 days
- **Data Backup Encryption**: All backups are encrypted before storage
- **Data Anonymization**: GDPR-compliant data anonymization for deleted accounts

### Layer 5: Monitoring & Auditing
- **Comprehensive Audit Logging**: All security-relevant events are logged
- **Security Monitoring**: Real-time security event detection and alerting
- **Incident Management**: Security incident tracking and response
- **Threat Intelligence**: IP blacklisting and threat detection
- **Compliance Reporting**: Automated compliance reporting for GDPR, ISO 27001, SOC 2

---

## Authentication Flow

### Traditional Email/Password Authentication

1. **User submits credentials** → Email and password sent over HTTPS
2. **Server validates credentials** → Password verified using bcrypt hash comparison
3. **MFA check** → If user has MFA enabled, redirect to MFA verification
4. **Session creation** → Secure session token created and stored
5. **Access granted** → User redirected to dashboard

### Multi-Factor Authentication (MFA)

1. **Primary authentication** → Email/password verified
2. **MFA challenge** → User prompted for MFA code (TOTP/SMS/Email/WebAuthn)
3. **MFA verification** → Code verified against registered device
4. **Session creation** → MFA-verified session created with extended timeout
5. **Access granted** → User granted access to application

### Single Sign-On (SSO)

#### SAML 2.0 Flow
1. **User initiates SSO** → Clicks "Sign in with SSO" button
2. **SAML Request** → Application generates SAML authentication request
3. **Redirect to IdP** → User redirected to Identity Provider (IdP)
4. **User authenticates** → User authenticates with IdP
5. **SAML Response** → IdP sends SAML response with assertions
6. **Validation** → Application validates SAML response and certificate
7. **User provisioning** → User created or updated in system (if auto-provisioning enabled)
8. **Session creation** → Session created and user redirected to dashboard

#### OAuth 2.0 / OIDC Flow
1. **User initiates SSO** → Clicks "Sign in with OAuth" button
2. **Authorization request** → Application generates OAuth authorization request with state parameter
3. **Redirect to provider** → User redirected to OAuth provider
4. **User authorizes** → User authorizes application access
5. **Authorization code** → Provider redirects back with authorization code
6. **Token exchange** → Application exchanges code for access token and ID token
7. **User provisioning** → User created or updated using ID token claims
8. **Session creation** → Session created and user redirected to dashboard

---

## Authorization Model

### Role-Based Access Control (RBAC)

The system implements a hierarchical RBAC model:

#### Roles Hierarchy
1. **Super Admin**: Full system access, security configuration
2. **Admin**: User management, project management, security monitoring
3. **Project Manager**: Project creation and management, team management
4. **Team Lead**: Team management, task assignment
5. **Team Member**: Task assignment and completion, view permissions
6. **Guest**: Read-only access to assigned resources

#### Permissions Model
- **Granular Permissions**: Permissions assigned at resource level (projects, tasks, issues, etc.)
- **Permission Inheritance**: Permissions inherited from parent resources
- **Explicit Deny**: Explicit deny rules take precedence over allow rules
- **Permission Override**: Admins can override inherited permissions

### Row-Level Security (RLS)

PostgreSQL Row-Level Security policies enforce data access at the database level:

- **User-level RLS**: Users can only access their own data
- **Project-level RLS**: Users can only access projects they're assigned to
- **Role-based RLS**: Access granted based on user roles
- **Dynamic RLS**: Policies evaluated dynamically based on session context

### API Authorization

- **API Key Scopes**: API keys are assigned specific scopes (read, write, delete)
- **Resource-level Authorization**: API requests validated against user permissions
- **Rate Limiting**: API keys have configurable rate limits
- **Audit Logging**: All API requests logged with user and resource information

---

## Encryption Strategy

### Encryption at Rest

- **Database Encryption**: Supabase database encrypted using AES-256-GCM
- **Backup Encryption**: All database backups encrypted before storage
- **File Storage Encryption**: Files stored in Supabase Storage are encrypted at rest
- **Key Management**: Encryption keys stored in Supabase Vault or AWS KMS

### Encryption in Transit

- **TLS 1.3**: All communications encrypted using TLS 1.3 (minimum TLS 1.2)
- **Strong Cipher Suites**: Only strong cipher suites allowed
- **Certificate Pinning**: Certificate pinning for mobile applications
- **Perfect Forward Secrecy**: PFS enabled for all TLS connections

### Field-Level Encryption

The following sensitive fields are encrypted at the application level:

- **API Keys and Secrets**: All API keys and secrets encrypted
- **OAuth Tokens**: Access and refresh tokens encrypted
- **MFA Secrets**: TOTP secrets and backup codes encrypted
- **SSO Certificates**: SAML certificates encrypted
- **Payment Information**: Credit card numbers and payment data (if applicable)
- **Personal Health Information**: PHI data encrypted (if applicable)
- **Social Security Numbers**: SSN encrypted (if applicable)

### Key Management

- **Key Rotation**: Encryption keys rotated every 90 days
- **Key Versioning**: Multiple key versions supported for seamless rotation
- **Key Storage**: Keys stored in secure vault (Supabase Vault or AWS KMS)
- **Key Access Control**: Strict access control for key retrieval
- **Key Audit Logging**: All key access operations logged

---

## Network Security

### Infrastructure Security

- **Cloud Provider**: Hosted on secure cloud infrastructure (Supabase/AWS)
- **VPC Isolation**: Application services isolated in private VPC
- **Network Segmentation**: Services separated into security zones
- **Load Balancer**: Application behind load balancer with SSL termination
- **DDoS Protection**: Cloud-based DDoS protection enabled

### Firewall Rules

- **Ingress Rules**: Only allow HTTPS (443) and SSH (22) from approved IP ranges
- **Egress Rules**: Restrict outbound connections to necessary services only
- **Database Firewall**: Database accessible only from application servers
- **API Gateway**: All API requests go through API gateway with rate limiting

### Content Security Policy (CSP)

- **Script Sources**: Restrict JavaScript to trusted sources only
- **Style Sources**: Restrict CSS to trusted sources
- **Image Sources**: Restrict images to trusted domains
- **Connect Sources**: Restrict AJAX/fetch requests to API endpoints
- **Frame Sources**: Restrict iframe embedding to prevent clickjacking

---

## Data Protection

### Data Classification

- **Public**: Information intended for public disclosure
- **Internal**: Information for internal use only
- **Confidential**: Sensitive information requiring restricted access
- **Restricted**: Highly sensitive information with strict access controls

### Data Retention

- **Active Data**: Retained as long as account is active
- **Inactive Accounts**: Data retained for 90 days after account deactivation
- **Audit Logs**: Retained for 7 years for compliance
- **Backup Retention**: Backups retained for 30 days with monthly snapshots for 1 year

### Data Deletion

- **User-Initiated Deletion**: Users can request account deletion
- **GDPR Right to be Forgotten**: Personal data deleted within 30 days of request
- **Secure Deletion**: Data securely deleted using cryptographic erasure
- **Backup Purging**: Deleted data purged from backups during next backup cycle

### Data Anonymization

- **Account Deletion**: Personal identifiers removed, data anonymized
- **Analytics Data**: Personal identifiers removed from analytics data
- **Audit Logs**: Personal data anonymized after retention period

---

## Security Controls

### Preventive Controls

- **Authentication**: Multi-factor authentication required
- **Authorization**: Role-based access control enforced
- **Input Validation**: All inputs validated and sanitized
- **Encryption**: Data encrypted at rest and in transit
- **Firewall**: Network-level firewall rules

### Detective Controls

- **Audit Logging**: Comprehensive audit logging of all security events
- **Security Monitoring**: Real-time security event detection
- **Intrusion Detection**: Automated intrusion detection system
- **Anomaly Detection**: Machine learning-based anomaly detection

### Corrective Controls

- **Incident Response**: Automated incident response procedures
- **Vulnerability Management**: Regular vulnerability scanning and patching
- **Backup and Recovery**: Automated backup and recovery procedures
- **Disaster Recovery**: Documented disaster recovery plan

---

## Compliance

### GDPR Compliance

- **Data Processing Records**: All data processing activities documented
- **Consent Management**: User consent tracking and management
- **Data Export**: Users can export their data in machine-readable format
- **Data Deletion**: Users can request account deletion (right to be forgotten)
- **Privacy Preferences**: Users can manage privacy preferences
- **Data Breach Notification**: Automated data breach detection and notification

### ISO 27001 Alignment

- **Information Security Policy**: Documented security policies
- **Risk Assessment**: Regular security risk assessments
- **Access Control**: Comprehensive access control policies
- **Incident Management**: Documented incident response procedures
- **Business Continuity**: Documented business continuity plan

### SOC 2 Readiness

- **Security Controls**: Comprehensive security controls implemented
- **Availability Controls**: Uptime monitoring and redundancy measures
- **Processing Integrity**: Data validation and error handling
- **Confidentiality Controls**: Data classification and encryption
- **Privacy Controls**: GDPR-compliant privacy controls

---

## Security Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Users                      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (TLS 1.3)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Load Balancer / API Gateway                 │
│  - DDoS Protection                                       │
│  - SSL Termination                                       │
│  - Rate Limiting                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Application Layer (Supabase)                │
│  - Authentication (MFA/SSO)                             │
│  - Authorization (RBAC/RLS)                             │
│  - Input Validation                                     │
│  - Business Logic                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                Database Layer (PostgreSQL)               │
│  - Row-Level Security (RLS)                             │
│  - Encryption at Rest                                   │
│  - Audit Logging                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Key Management (Supabase Vault)             │
│  - Encryption Keys                                      │
│  - API Secrets                                          │
│  - OAuth Tokens                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Security Monitoring

### Real-Time Monitoring

- **Failed Login Attempts**: Monitored and alerting after threshold
- **Unauthorized Access Attempts**: Detected and blocked automatically
- **Anomalous Activity**: Machine learning-based anomaly detection
- **Security Events**: Real-time security event dashboard

### Audit Logging

- **Authentication Events**: All login/logout attempts logged
- **Authorization Events**: All permission checks logged
- **Data Access**: All data access logged for GDPR compliance
- **Configuration Changes**: All security configuration changes logged
- **Admin Actions**: All admin actions logged with full audit trail

---

## Incident Response

### Incident Detection

- **Automated Detection**: Security events detected automatically
- **Manual Detection**: Security incidents reported by users/staff
- **Threat Intelligence**: External threat intelligence feeds

### Incident Response Process

1. **Detection**: Security incident detected
2. **Assessment**: Incident severity assessed
3. **Containment**: Incident contained to prevent further damage
4. **Eradication**: Root cause identified and remediated
5. **Recovery**: Systems restored to normal operation
6. **Lessons Learned**: Incident reviewed and improvements implemented

---

## Security Best Practices

### For Developers

- **Secure Coding**: Follow secure coding guidelines
- **Code Review**: All code reviewed for security vulnerabilities
- **Dependency Scanning**: Regular scanning of dependencies for vulnerabilities
- **Secret Management**: Never commit secrets to version control

### For Administrators

- **Access Control**: Follow principle of least privilege
- **MFA Enforcement**: Enable MFA for all admin accounts
- **Regular Updates**: Keep systems and dependencies up to date
- **Audit Review**: Regularly review audit logs

### For Users

- **Strong Passwords**: Use strong, unique passwords
- **MFA**: Enable multi-factor authentication
- **Phishing Awareness**: Be aware of phishing attempts
- **Report Security Issues**: Report security issues immediately

---

## Security Contacts

- **Security Team**: security@projectnidus.com
- **Incident Response**: security-incident@projectnidus.com
- **Compliance**: compliance@projectnidus.com

---

**Document Owner**: Security Team  
**Review Frequency**: Quarterly  
**Next Review Date**: 2025-04-XX

