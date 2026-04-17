# API Versioning Strategy

## Current API Version
Current stable version: **v1**

## Versioning Pattern
```
/api/v1/songs
/api/v1/playlists
/api/v1/auth
```

## Future Versions
- v2: Breaking changes (TBA)
- v3: NextGen architecture (TBA)

## Deprecation Policy

### V1 Timeline
- **Now**: All services on v1
- **6 months**: v2 beta launch (alongside v1)
- **12 months**: v1 deprecated, only in maintenance
- **18 months**: v1 sunset, removed

### Breaking Changes
Must increment major version. Examples:
- Endpoint removal/rename
- Response payload structure change
- Authentication method change
- Database schema breaking change

### Non-Breaking Changes (v1.x)
- New optional fields
- New /api/v1/new-endpoint
- Bug fixes
- Performance improvements
- Deprecated field marked with @Deprecated

## Implementation
See `src/common/versioning/` for middleware setup.
