# API Security Guide

**Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Production

---

## Executive Summary

This guide provides security best practices for using the Project Nidus API. It covers API authentication, API key management, rate limiting, security best practices, and common vulnerabilities.

---

## Table of Contents

1. [API Authentication](#api-authentication)
2. [API Key Management](#api-key-management)
3. [Rate Limiting](#rate-limiting)
4. [Security Best Practices](#security-best-practices)
5. [Common Vulnerabilities](#common-vulnerabilities)
6. [Security Checklist](#security-checklist)

---

## API Authentication

### API Key Authentication

#### How It Works
The Project Nidus API uses API key authentication. Each API request must include an API key in the Authorization header.

```
Authorization: Bearer YOUR_API_KEY
```

#### API Key Format
- **Prefix**: `nidus_`
- **Length**: 64 characters
- **Format**: `nidus_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Obtaining an API Key

#### Step-by-Step Guide
1. **Access**: Admin Dashboard > API > API Keys
2. **Create Key**: Click "Create API Key"
3. **Configuration**:
   - Key Name: Descriptive name for the key
   - Scopes: Select API scopes (read, write, delete)
   - Rate Limit: Set rate limit (requests per minute)
   - Expiration: Set expiration date (optional)
4. **Generate**: Generate API key
5. **Store Securely**: Store API key securely (never commit to version control)

#### API Key Scopes

##### Available Scopes
- **projects:read**: Read project data
- **projects:write**: Create and update projects
- **projects:delete**: Delete projects
- **tasks:read**: Read task data
- **tasks:write**: Create and update tasks
- **tasks:delete**: Delete tasks
- **users:read**: Read user data
- **users:write**: Create and update users
- **resources:read**: Read resource data
- **issues:read**: Read issue data
- **risks:read**: Read risk data

##### Scope Best Practices
- **Principle of Least Privilege**: Grant minimum scopes necessary
- **Read-Only Keys**: Use read-only keys for integrations
- **Separate Keys**: Use separate keys for different applications
- **Regular Review**: Review API key scopes quarterly

### Using API Keys

#### HTTP Header
Include the API key in the Authorization header:

```bash
curl -H "Authorization: Bearer nidus_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  https://api.projectnidus.com/api/v1/projects
```

#### Example Requests

##### JavaScript (fetch)
```javascript
const apiKey = 'nidus_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

fetch('https://api.projectnidus.com/api/v1/projects', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

##### Python (requests)
```python
import requests

api_key = 'nidus_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

response = requests.get('https://api.projectnidus.com/api/v1/projects', headers=headers)
data = response.json()
print(data)
```

##### cURL
```bash
curl -X GET \
  https://api.projectnidus.com/api/v1/projects \
  -H 'Authorization: Bearer nidus_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
  -H 'Content-Type: application/json'
```

---

## API Key Management

### Creating API Keys

#### Best Practices
- **Descriptive Names**: Use descriptive names for API keys
- **Scope Restriction**: Grant minimum scopes necessary
- **Rate Limiting**: Set appropriate rate limits
- **Expiration**: Set expiration dates for temporary keys
- **Documentation**: Document API key usage and purpose

### Managing API Keys

#### API Key Lifecycle
1. **Creation**: Create API key with appropriate scopes
2. **Usage**: Use API key for API requests
3. **Monitoring**: Monitor API key usage and activity
4. **Rotation**: Rotate API keys regularly (every 90 days)
5. **Revocation**: Revoke API keys when no longer needed

#### API Key Rotation

##### When to Rotate
- **Security Incident**: If API key may be compromised
- **Regular Rotation**: Every 90 days (best practice)
- **Employee Departure**: When employee leaves organization
- **Scope Changes**: When API key scopes need to change

##### Rotation Process
1. **Create New Key**: Create new API key with same scopes
2. **Update Integration**: Update integration to use new key
3. **Test**: Test integration with new key
4. **Revoke Old Key**: Revoke old API key
5. **Verify**: Verify old key no longer works

### Revoking API Keys

#### When to Revoke
- **Security Incident**: If API key may be compromised
- **No Longer Needed**: When API key is no longer needed
- **Employee Departure**: When employee leaves organization
- **Policy Violation**: When API key usage violates policy

#### How to Revoke
1. **Access**: Admin Dashboard > API > API Keys
2. **Select Key**: Select API key to revoke
3. **Revoke**: Click "Revoke API Key"
4. **Confirm**: Confirm API key revocation
5. **Verify**: Verify API key no longer works

---

## Rate Limiting

### Rate Limit Overview

#### Purpose
Rate limiting prevents API abuse and ensures fair usage of API resources. Each API key has a configurable rate limit.

#### Default Rate Limits
- **Standard Keys**: 60 requests per minute
- **Read-Only Keys**: 120 requests per minute
- **Admin Keys**: 300 requests per minute

#### Rate Limit Headers
Rate limit information is included in API response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits

#### Rate Limit Exceeded Response
When rate limit is exceeded, API returns HTTP 429 (Too Many Requests):

```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after": 60
  }
}
```

#### Best Practices
- **Respect Rate Limits**: Don't exceed rate limits
- **Exponential Backoff**: Implement exponential backoff for retries
- **Monitor Usage**: Monitor API usage to avoid rate limits
- **Request Limits**: Request higher limits if needed

#### Implementing Exponential Backoff

##### JavaScript Example
```javascript
async function makeRequestWithBackoff(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After')) || Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

---

## Security Best Practices

### API Key Security

#### Storage
- **Never Commit**: Never commit API keys to version control
- **Environment Variables**: Store API keys in environment variables
- **Secret Management**: Use secret management tools (AWS Secrets Manager, HashiCorp Vault)
- **Encryption**: Encrypt API keys at rest

#### Transmission
- **HTTPS Only**: Always use HTTPS for API requests
- **Header Only**: Only send API keys in Authorization header
- **Never in URL**: Never include API keys in URL parameters
- **Never in Body**: Never include API keys in request body

### Request Security

#### Input Validation
- **Validate Input**: Validate all input data on client side
- **Sanitize Input**: Sanitize input data before sending to API
- **Type Checking**: Verify data types match expected types
- **Range Checking**: Verify data within expected ranges

#### Error Handling
- **Don't Expose Details**: Don't expose sensitive information in error messages
- **Logging**: Log errors securely (without sensitive data)
- **Monitoring**: Monitor API errors for security issues

### Response Security

#### Data Filtering
- **Minimize Data**: Return only necessary data in responses
- **Sensitive Data**: Never return sensitive data (passwords, API keys)
- **Field Filtering**: Allow clients to specify which fields to return

#### Caching
- **Cache Headers**: Use appropriate cache headers
- **Sensitive Data**: Don't cache responses with sensitive data
- **Expiration**: Set appropriate cache expiration times

---

## Common Vulnerabilities

### 1. API Key Exposure

#### Risk
API keys exposed in client-side code, URLs, or logs can be stolen and used by attackers.

#### Prevention
- Store API keys securely (environment variables, secret management)
- Never commit API keys to version control
- Use API keys only in server-side code (when possible)
- Rotate API keys regularly

### 2. Insufficient Rate Limiting

#### Risk
Without rate limiting, attackers can abuse the API or perform brute-force attacks.

#### Prevention
- Implement rate limiting on all API endpoints
- Monitor API usage for suspicious patterns
- Implement IP-based rate limiting (when possible)

### 3. Injection Attacks

#### Risk
SQL injection, NoSQL injection, or command injection can compromise the API.

#### Prevention
- Use parameterized queries
- Validate and sanitize all input
- Use ORM frameworks (when possible)
- Implement input validation on server side

### 4. Insecure Authentication

#### Risk
Weak authentication mechanisms can be bypassed by attackers.

#### Prevention
- Use strong API keys (64+ characters)
- Implement API key rotation
- Use HTTPS for all API requests
- Implement additional authentication (when possible)

### 5. Insufficient Authorization

#### Risk
Without proper authorization checks, users can access unauthorized resources.

#### Prevention
- Implement scope-based authorization
- Verify user permissions on every request
- Use RBAC (Role-Based Access Control)
- Implement resource-level authorization

---

## Security Checklist

### API Key Management
- [ ] Create API keys with minimum necessary scopes
- [ ] Store API keys securely (environment variables)
- [ ] Never commit API keys to version control
- [ ] Rotate API keys regularly (every 90 days)
- [ ] Revoke unused or compromised API keys

### API Usage
- [ ] Use HTTPS for all API requests
- [ ] Include API key in Authorization header only
- [ ] Never include API keys in URLs or request body
- [ ] Respect rate limits
- [ ] Implement exponential backoff for retries

### Input Validation
- [ ] Validate all input data on client side
- [ ] Sanitize input data before sending to API
- [ ] Verify data types match expected types
- [ ] Verify data within expected ranges

### Error Handling
- [ ] Don't expose sensitive information in error messages
- [ ] Log errors securely (without sensitive data)
- [ ] Monitor API errors for security issues
- [ ] Implement proper error handling

### Monitoring
- [ ] Monitor API key usage and activity
- [ ] Monitor API requests for suspicious patterns
- [ ] Monitor API errors for security issues
- [ ] Review API access logs regularly

---

**Document Owner**: Security Team  
**Review Frequency**: Quarterly  
**Next Review Date**: 2025-04-XX

