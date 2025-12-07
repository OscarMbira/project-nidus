# PM Simulator API Documentation

## Overview

The PM Simulator API provides programmatic access to simulation data, user progress, and analytics. This API is available for Enterprise customers and requires API key authentication.

## Base URL

```
Production: https://api.pm-simulator.com/v1
Staging: https://api-staging.pm-simulator.com/v1
```

## Authentication

All API requests require an API key in the header:

```
Authorization: Bearer YOUR_API_KEY
```

API keys can be generated in the Enterprise Settings dashboard.

## Rate Limits

- **Standard**: 100 requests per minute
- **Enterprise**: 1000 requests per minute
- **Custom**: Contact support for higher limits

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Endpoints

### User Management

#### Get User Profile
```http
GET /users/{user_id}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "level": 5,
  "xp": 12500,
  "subscription_tier": "professional",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Get User Progress
```http
GET /users/{user_id}/progress
```

**Response:**
```json
{
  "total_simulations": 25,
  "completed_simulations": 20,
  "average_score": 85.5,
  "total_xp": 12500,
  "current_level": 5,
  "badges_earned": 12,
  "streak_days": 7
}
```

### Scenarios

#### List Scenarios
```http
GET /scenarios
```

**Query Parameters:**
- `difficulty`: beginner, intermediate, expert
- `industry`: technology, healthcare, finance, etc.
- `methodology`: agile, waterfall, hybrid
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "scenarios": [
    {
      "id": "uuid",
      "title": "Digital Transformation Project",
      "difficulty": "intermediate",
      "industry": "technology",
      "methodology": "agile",
      "estimated_duration": 90,
      "description": "..."
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

#### Get Scenario Details
```http
GET /scenarios/{scenario_id}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Digital Transformation Project",
  "description": "...",
  "difficulty": "intermediate",
  "industry": "technology",
  "methodology": "agile",
  "phases": [
    {
      "name": "Initiation",
      "description": "...",
      "events": 5
    }
  ],
  "learning_objectives": ["..."],
  "skills_covered": ["..."]
}
```

### Simulation Runs

#### Start Simulation
```http
POST /simulations
```

**Request Body:**
```json
{
  "scenario_id": "uuid",
  "user_id": "uuid",
  "role": "project_manager"
}
```

**Response:**
```json
{
  "run_id": "uuid",
  "scenario_id": "uuid",
  "user_id": "uuid",
  "status": "in_progress",
  "started_at": "2025-01-21T10:00:00Z",
  "current_phase": "initiation"
}
```

#### Get Simulation Run
```http
GET /simulations/{run_id}
```

**Response:**
```json
{
  "id": "uuid",
  "scenario_id": "uuid",
  "user_id": "uuid",
  "status": "completed",
  "score": 85.5,
  "started_at": "2025-01-21T10:00:00Z",
  "completed_at": "2025-01-21T11:30:00Z",
  "duration_minutes": 90,
  "module_scores": {
    "timeline": 90,
    "budget": 85,
    "quality": 80,
    "stakeholders": 90,
    "team": 85
  }
}
```

#### Submit Decision
```http
POST /simulations/{run_id}/decisions
```

**Request Body:**
```json
{
  "event_id": "uuid",
  "decision_id": "uuid",
  "timestamp": "2025-01-21T10:15:00Z"
}
```

### Analytics

#### Get User Analytics
```http
GET /analytics/users/{user_id}
```

**Query Parameters:**
- `start_date`: ISO 8601 date
- `end_date`: ISO 8601 date
- `group_by`: day, week, month

**Response:**
```json
{
  "user_id": "uuid",
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "metrics": {
    "total_simulations": 10,
    "average_score": 85.5,
    "improvement_rate": 5.2,
    "time_spent_minutes": 900
  },
  "trends": [
    {
      "date": "2025-01-01",
      "simulations": 2,
      "average_score": 80
    }
  ]
}
```

#### Get Team Analytics
```http
GET /analytics/teams/{team_id}
```

**Response:**
```json
{
  "team_id": "uuid",
  "total_users": 50,
  "active_users": 35,
  "total_simulations": 200,
  "average_score": 82.5,
  "completion_rate": 0.85,
  "top_performers": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "score": 95,
      "simulations": 15
    }
  ]
}
```

### Certificates

#### List User Certificates
```http
GET /users/{user_id}/certificates
```

**Response:**
```json
{
  "certificates": [
    {
      "id": "uuid",
      "scenario_id": "uuid",
      "scenario_name": "Digital Transformation Project",
      "score": 90,
      "issued_at": "2025-01-21T11:30:00Z",
      "verification_code": "ABC123",
      "pdf_url": "https://..."
    }
  ]
}
```

### Webhooks

#### Create Webhook
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["simulation.completed", "certificate.issued"],
  "secret": "your-webhook-secret"
}
```

**Response:**
```json
{
  "id": "uuid",
  "url": "https://your-server.com/webhook",
  "events": ["simulation.completed", "certificate.issued"],
  "created_at": "2025-01-21T10:00:00Z",
  "status": "active"
}
```

## Webhook Events

### simulation.completed
Triggered when a simulation is completed.

**Payload:**
```json
{
  "event": "simulation.completed",
  "data": {
    "run_id": "uuid",
    "user_id": "uuid",
    "scenario_id": "uuid",
    "score": 85.5,
    "completed_at": "2025-01-21T11:30:00Z"
  },
  "timestamp": "2025-01-21T11:30:00Z"
}
```

### certificate.issued
Triggered when a certificate is issued.

**Payload:**
```json
{
  "event": "certificate.issued",
  "data": {
    "certificate_id": "uuid",
    "user_id": "uuid",
    "scenario_id": "uuid",
    "score": 90,
    "verification_code": "ABC123"
  },
  "timestamp": "2025-01-21T11:30:00Z"
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## SDKs

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- PHP
- Ruby

See [SDK Documentation](https://docs.pm-simulator.com/sdks) for details.

## Support

For API support:
- Email: api-support@pm-simulator.com
- Documentation: https://docs.pm-simulator.com/api
- Status Page: https://status.pm-simulator.com

---

*Last Updated: 2025-01-21*

