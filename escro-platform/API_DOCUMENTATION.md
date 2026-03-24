# ESCRO Platform - API Documentation

Complete API reference for all backend endpoints.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require JWT token in header:

```
Authorization: Bearer <your_token>
```

Tokens are obtained after login and stored in localStorage.

## Response Format

All responses are JSON with format:

```json
{
  "success": true|false,
  "data": {...},
  "error": "error message if applicable"
}
```

---

## 🔐 Authentication Endpoints

### POST /auth/register

Register a new user (expert, client, or admin).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "expert|client|admin",
  "company": "My Company (optional)",
  "expertise": "Web Development (optional, for experts)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "expert"
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

---

### POST /auth/login

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "expert",
      "kyc_status": "verified"
    }
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### GET /auth/me

Get current authenticated user info.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "expert",
    "kyc_status": "pending|verified|rejected"
  }
}
```

---

## 💼 Project Endpoints

### POST /projects

Create a new project (Client only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Website Redesign",
  "description": "Redesign our marketing website",
  "budget_ron": 5000,
  "timeline_days": 30,
  "milestones": [
    {
      "order_number": 1,
      "title": "Wireframes",
      "deliverable_description": "Create wireframes for all pages",
      "percentage_of_budget": 25
    },
    {
      "order_number": 2,
      "title": "Design",
      "deliverable_description": "Create design mockups",
      "percentage_of_budget": 25
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid",
    "client_id": "client-uuid",
    "title": "Website Redesign",
    "budget_ron": 5000,
    "status": "open",
    "milestones": [
      {
        "id": "milestone-uuid",
        "order_number": 1,
        "title": "Wireframes",
        "amount_ron": 1250,
        "percentage_of_budget": 25,
        "status": "pending"
      }
    ]
  }
}
```

---

### GET /projects

Get all projects for current user (filtered by role).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (open, assigned, in_progress, completed, disputed)
- `page` (optional, default 1): Pagination
- `limit` (optional, default 10): Items per page

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "project-uuid",
      "client_id": "client-uuid",
      "expert_id": "expert-uuid|null",
      "title": "Website Redesign",
      "budget_ron": 5000,
      "status": "open",
      "created_at": "2026-02-07T10:00:00Z"
    }
  ]
}
```

---

### GET /projects/:id

Get project details including all milestones.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid",
    "client_id": "client-uuid",
    "expert_id": "expert-uuid",
    "title": "Website Redesign",
    "description": "Redesign our marketing website",
    "budget_ron": 5000,
    "timeline_days": 30,
    "status": "in_progress",
    "created_at": "2026-02-07T10:00:00Z",
    "milestones": [
      {
        "id": "milestone-uuid",
        "order_number": 1,
        "title": "Wireframes",
        "deliverable_description": "Create wireframes",
        "amount_ron": 1250,
        "percentage_of_budget": 25,
        "status": "approved",
        "deliverable_file_url": "https://..."
      }
    ]
  }
}
```

---

## 🎯 Milestone Endpoints

### POST /milestones/:milestoneId/deliverable

Upload deliverable for a milestone (Expert only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `deliverable` (file): The deliverable file (max 10MB)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "milestone-uuid",
    "status": "delivered",
    "deliverable_file_url": "https://..."
  }
}
```

---

### PUT /milestones/:milestoneId/approve

Approve milestone and release funds (Client only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "milestone-uuid",
    "status": "approved",
    "expert_paid": 1125,
    "claudiu_commission": 125
  }
}
```

---

### POST /milestones/:milestoneId/dispute

Raise dispute on milestone (Client or Expert).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "Deliverable doesn't match specifications"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "milestone-uuid",
    "status": "disputed",
    "dispute_raised_at": "2026-02-07T11:00:00Z"
  }
}
```

---

## 💳 Escrow Endpoints

### POST /escrow

Create escrow account for a project (triggered after project creation).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "project_id": "project-uuid",
  "total_amount_ron": 5000,
  "claudiu_commission_percent": 10
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "escrow-uuid",
    "project_id": "project-uuid",
    "total_amount_ron": 5000,
    "claudiu_commission_percent": 10,
    "held_balance_ron": 5000,
    "status": "open"
  }
}
```

---

### POST /escrow/payment-intent

Create Stripe payment intent for depositing funds.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "escrow_id": "escrow-uuid",
  "amount_ron": 5000
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "client_secret": "pi_..._secret_...",
    "publishable_key": "pk_test_..."
  }
}
```

---

### POST /escrow/confirm-payment

Confirm Stripe payment (client-side, after payment intent succeeds).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "payment_intent_id": "pi_...",
  "escrow_id": "escrow-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "payment_confirmed",
    "amount_received": 5000
  }
}
```

---

### GET /escrow/:escrowId

Get escrow account status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "escrow-uuid",
    "project_id": "project-uuid",
    "total_amount_ron": 5000,
    "held_balance_ron": 3750,
    "released_to_expert_total_ron": 1125,
    "claudiu_earned_total_ron": 125,
    "status": "partially_released"
  }
}
```

---

## 💬 Message Endpoints

### POST /messages

Send message in project chat.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "project_id": "project-uuid",
  "recipient_id": "user-uuid",
  "content": "Hey, how's the design coming along?"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "sender_id": "sender-uuid",
    "recipient_id": "recipient-uuid",
    "content": "Hey, how's the design coming along?",
    "created_at": "2026-02-07T11:00:00Z"
  }
}
```

---

### GET /projects/:projectId/messages

Get all messages for a project.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional, default 50): Max messages to return
- `offset` (optional, default 0): Pagination offset

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "message-uuid",
      "sender_id": "sender-uuid",
      "sender_name": "John Expert",
      "recipient_id": "recipient-uuid",
      "content": "I've completed the wireframes",
      "created_at": "2026-02-07T11:00:00Z",
      "read_at": "2026-02-07T11:30:00Z"
    }
  ]
}
```

---

### PUT /messages/:messageId/read

Mark message as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "read_at": "2026-02-07T11:30:00Z"
  }
}
```

---

## 👤 Admin Endpoints

### PUT /admin/experts/:userId/verify

Approve or reject expert KYC verification (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "verified|rejected",
  "notes": "Verification notes (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "expert-uuid",
    "email": "expert@example.com",
    "name": "John Expert",
    "kyc_status": "verified",
    "verification_date": "2026-02-07T11:00:00Z"
  }
}
```

---

### GET /admin/experts/pending

Get list of experts pending KYC verification (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "expert-uuid",
      "name": "John Expert",
      "email": "expert@example.com",
      "company": "Expert Services",
      "expertise": "Web Development",
      "created_at": "2026-02-07T10:00:00Z"
    }
  ]
}
```

---

### GET /admin/experts/verified

Get list of verified experts (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "expert-uuid",
      "name": "John Expert",
      "email": "expert@example.com",
      "company": "Expert Services",
      "expertise": "Web Development",
      "verification_date": "2026-02-07T11:00:00Z"
    }
  ]
}
```

---

### POST /admin/projects/:projectId/assign-expert

Assign expert to a project (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "expert_id": "expert-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid",
    "expert_id": "expert-uuid",
    "expert_name": "John Expert",
    "status": "assigned"
  }
}
```

---

### PUT /admin/disputes/:disputeId/resolve

Resolve a disputed milestone (Admin only - Claudiu decides distribution).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "claudiu_release_amount_ron": 1000,
  "decision_text": "Both parties did their best. Releasing 80% to expert."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "dispute-uuid",
    "status": "resolved",
    "expert_amount_ron": 900,
    "claudiu_commission_ron": 100,
    "resolved_at": "2026-02-07T12:00:00Z"
  }
}
```

---

### GET /admin/dashboard

Get admin dashboard statistics (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_projects": 15,
    "total_experts": 8,
    "total_disputes": 2,
    "total_revenue_ron": 1250,
    "pending_experts": 3,
    "recent_activity": [
      {
        "id": "activity-uuid",
        "type": "project_created|milestone_approved|dispute_raised",
        "description": "Project #5 created",
        "timestamp": "2026-02-07T11:00:00Z"
      }
    ]
  }
}
```

---

## 🔍 Error Codes

### 400 - Bad Request
Invalid request parameters or data.

```json
{
  "success": false,
  "error": "Budget must be greater than 0"
}
```

### 401 - Unauthorized
Missing or invalid authentication token.

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 403 - Forbidden
User doesn't have permission for this action.

```json
{
  "success": false,
  "error": "Only admins can verify experts"
}
```

### 404 - Not Found
Resource not found.

```json
{
  "success": false,
  "error": "Project not found"
}
```

### 500 - Server Error
Internal server error.

```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "expert"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Web Redesign",
    "budget_ron": 5000,
    "timeline_days": 30,
    "milestones": [
      {
        "order_number": 1,
        "title": "Design",
        "deliverable_description": "Create design mockups",
        "percentage_of_budget": 50
      }
    ]
  }'
```

---

## 📚 Quick Links

- [Setup Guide](./SETUP_GUIDE.md)
- [README](./README.md)
- [Database Schema](./README.md#-database-schema)

---

**Last Updated:** February 7, 2026
**Version:** 1.0.0 (MVP)
