# GDPR Compliance Implementation Guide

## Overview

GDPR (General Data Protection Regulation) compliance is critical for any user-facing application. This module implements the key GDPR rights and compliance features.

## Key GDPR Rights Implemented

### 1. Right of Access (Data Export)
**Endpoint**: `GET /api/v1/gdpr/export`

Users can request a complete export of their personal data in a machine-readable format (JSON).

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/gdpr/export
```

**Exported Data Includes**:
- User profile information
- All playlists and songs
- Listening history (full history)
- Favorites and preferences
- Social connections (followers/following)
- Activity logs
- Privacy settings

**Timeline**: Must provide within 30 days of request

### 2. Right to Erasure (Right to be Forgotten)
**Endpoint**: `DELETE /api/v1/gdpr/delete`

Users can request complete deletion of their account and data.

```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/gdpr/delete
```

**Process**:
1. User requests deletion
2. System sends confirmation email
3. User clicks confirmation link
4. All data is anonymized (not hard deleted initially for audit trail)
5. Hard deletion after 30 days if user doesn't object

**Data Deleted**:
- Profile information
- Playlists and playlist content
- Listening history
- Favorites and recommendations
- Social relationships
- Activity logs

### 3. Privacy Preferences
**Endpoints**:
- `GET /api/v1/gdpr/preferences` - Get current settings
- `POST /api/v1/gdpr/preferences` - Update settings

**Manageable Preferences**:
- Share listening history with followers
- Make playlists public
- Allow social following
- Allow direct messages
- Personalization opt-in/out

### 4. Data Portability
Users can request their data in a standard, structured format (JSON) for import to other services.

### 5. Data Retention Status
**Endpoint**: `GET /api/v1/gdpr/retention-status`

Get information about data retention and archiving:
- Account creation date
- Last activity date
- Days until data archival (90 days of inactivity)
- Days until deletion (2 years of inactivity)

---

## Implementation Checklist

- [ ] Add GDPR endpoints to auth module
- [ ] Setup email confirmation for deletion requests
- [ ] Implement data archival cron job (daily)
- [ ] Add GDPR privacy policy page
- [ ] Create terms of service addendum
- [ ] Setup audit logging for all GDPR requests
- [ ] Implement data encryption at rest
- [ ] Create data processing agreements (DPA)
- [ ] Test deletion cascade (FK constraints)
- [ ] Document third-party data processors

---

## Data Retention Policy

| Data Type | Retention Period | Reason | Archival Action |
|-----------|------------------|--------|-----------------|
| User Profile | Lifetime | Active account | Keep |
| Listening History | 90 days | Analytics | Delete |
| Activity Logs | 30 days | Auditing | Delete |
| Session Tokens | 30 days | Security | Rotate |
| Deleted Accounts | 30 days | Recovery | Hard delete |
| IP Addresses | 7 days | Security | Anonymize |

---

## Email Templates

### Deletion Confirmation Email

```
Subject: Confirm Your Account Deletion Request

Hi [User Name],

We received a request to delete your OursMusic account and all associated data.

This action cannot be undone. Your account will be:
- Permanently deleted
- Removed from all playlists
- Removed from follower lists
- Your data will be irrecoverable

If you want to proceed, click the link below:
[Confirmation Link - valid for 48 hours]

If you didn't request this, ignore this email.

Your Data Deletion Team
```

### Data Export Ready Email

```
Subject: Your OursMusic Data Export is Ready

Hi [User Name],

Your personal data export is ready for download.

The export includes:
- Profile information
- All playlists and content
- Listening history
- Preferences and settings

Download your data here: [Download Link]
(Link expires in 7 days)

Your Data Export Team
```

---

## Compliance Checklist

### Pre-Launch
- [ ] GDPR impact assessment completed
- [ ] Privacy policy updated
- [ ] Terms of service reviewed
- [ ] Data processing agreements in place
- [ ] Delete endpoints tested

### After Launch
- [ ] Monitor GDPR requests
- [ ] Track deletion requests and resolution time
- [ ] Audit data retention compliance
- [ ] Test backup/recovery procedures
- [ ] Annual compliance audit

### Third-Party Services
- [ ] Verify GDPR compliance of all third-party services
- [ ] Update Privacy Policy with third-party data processing
- [ ] Ensure data is not transferred outside EU (if EU user)
- [ ] Get explicit consent for analytics services

---

## Testing

### Test Deletion Cascade
```bash
# Create test user
POST /api/v1/auth/register
{
  "email": "test@example.com",
  "password": "test123"
}

# Create playlists and data
POST /api/v1/playlists
{
  "title": "Test Playlist"
}

# Request deletion
DELETE /api/v1/gdpr/delete

# Verify user is deleted/anonymized
GET /api/v1/users/test-user-id (should return 404)
```

### Test Data Export
```bash
GET /api/v1/gdpr/export

# Verify export contains all user data
# File size should be reasonable (not empty or too large)
```

---

## Metrics to Monitor

- Deletion requests per month
- Average time to delete
- Data export requests per month
- Failed deletion attempts
- User retention (impact of GDPR features)

---

## References

- [GDPR Official Regulation](https://gdpr-info.eu/)
- [GDPR Compliance Checklist](https://gdpr-info.eu/compliance-checklist/)
- [Data Protection Impact Assessment](https://gdpr-info.eu/chapter-3/article-35/)
- [Data Processing Agreement Template](https://gdpr-info.eu/data-processing-agreement/)
