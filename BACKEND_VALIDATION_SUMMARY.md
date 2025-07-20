# Backend Validation Summary

## Overview
This document summarizes all backend validations implemented to ensure that frontend constraints are enforced at the API level, preventing bypassing of business rules when accessing the service through API keys or direct API calls.

## Critical Requirement
**Frontend validation is only for user experience - it can be easily bypassed. The backend must enforce all business rules and constraints to ensure data integrity and security, regardless of how the service is accessed (frontend, API keys, direct API calls, etc.).**

## Implemented Validations

### 1. Projects (`/projects`)

#### Create Project (`POST /projects/`)
- ✅ **Name Length Validation**: 2-255 characters
- ✅ **Duplicate Name Validation**: Per user (owner_account_id)
- ✅ **Database Constraint**: `UniqueConstraint('owner_account_id', 'name')`

#### Update Project (`PUT /projects/{project_id}`)
- ✅ **Name Length Validation**: 2-255 characters
- ✅ **Duplicate Name Validation**: Per user (excluding current project)
- ✅ **Default Project Protection**: Cannot rename default project
- ✅ **Database Constraint**: `UniqueConstraint('owner_account_id', 'name')`

### 2. API Keys (`/api-keys`)

#### Create API Key (`POST /api-keys/`)
- ✅ **Name Length Validation**: 2-255 characters
- ✅ **Duplicate Name Validation**: Per user (user_account_id)
- ✅ **Max Keys Per User**: 5 keys maximum
- ✅ **Database Constraint**: `UniqueConstraint('user_account_id', 'name')`

#### Update API Key (`PUT /api-keys/{key_id}`)
- ✅ **Name Length Validation**: 2-255 characters
- ✅ **Duplicate Name Validation**: Per user (excluding current key)
- ✅ **Database Constraint**: `UniqueConstraint('user_account_id', 'name')`

### 3. Templates (`/templates`)

#### Create Template (`POST /templates/`)
- ✅ **Name Length Validation**: 2-255 characters
- ✅ **Duplicate Name Validation**: Per user (owner_account_id)
- ✅ **Admin Permission Check**: Only admins can create official templates
- ✅ **Database Constraint**: `UniqueConstraint('owner_account_id', 'name')`

#### Update Template (`PUT /templates/{template_id}`)
- ✅ **Name Length Validation**: 2-255 characters
- ✅ **Duplicate Name Validation**: Per user (excluding current template)
- ✅ **Permission Check**: Only owner or admin can update
- ✅ **Official Template Protection**: Only admins can update official templates
- ✅ **Database Constraint**: `UniqueConstraint('owner_account_id', 'name')`

### 4. Sandboxes (`/sandboxes`)

#### Create Sandbox (`POST /sandboxes/`)
- ✅ **Name Length Validation**: 2-100 characters
- ✅ **Duplicate Name Validation**: Per user (owner_account_id)
- ✅ **Database Constraint**: `UniqueConstraint('owner_account_id', 'name')`

#### Update Sandbox (`PUT /sandboxes/{sandbox_id}`)
- ✅ **Name Length Validation**: 2-100 characters
- ✅ **Duplicate Name Validation**: Per user (excluding current sandbox)
- ✅ **Database Constraint**: `UniqueConstraint('owner_account_id', 'name')`

## Validation Details

### Name Length Constraints
- **Projects**: 2-255 characters
- **API Keys**: 2-255 characters
- **Templates**: 2-255 characters
- **Sandboxes**: 2-100 characters

### Duplicate Name Logic
All duplicate name validations follow this pattern:
1. **Create**: Check if name exists for the same user
2. **Update**: Check if name exists for the same user (excluding current resource)
3. **Database Fallback**: Catch database constraint violations as backup

### Error Messages
Consistent error messages across all endpoints:
- **Too Short**: `"{Resource} name must be at least {N} characters"`
- **Too Long**: `"{Resource} name must be {N} characters or less"`
- **Duplicate**: `"A {resource} with this name already exists"`

### Database Constraints
All resources have database-level unique constraints:
```sql
-- Projects
UniqueConstraint('owner_account_id', 'name', name='unique_project_name_per_account')

-- API Keys  
UniqueConstraint('user_account_id', 'name', name='unique_api_key_name_per_user')

-- Templates
UniqueConstraint('owner_account_id', 'name', name='unique_template_name_per_owner')

-- Sandboxes
UniqueConstraint('owner_account_id', 'name', name='unique_sandbox_name_per_owner')
```

## Security Benefits

### 1. **API Key Protection**
- Users accessing via API keys cannot bypass frontend validations
- All business rules enforced at the API level
- Consistent behavior regardless of access method

### 2. **Data Integrity**
- Database constraints provide final safety net
- Application-level validation provides clear error messages
- No data corruption from invalid inputs

### 3. **Consistent UX**
- Same validation rules apply to frontend and API
- Users get consistent error messages
- No confusion about different validation behaviors

## Testing

### Manual Testing
All validations can be tested using:
```bash
cd back-end
source ../.venv/bin/activate
python scripts/test_backend_validations.py
```

### API Testing
Test with curl or Postman:
```bash
# Test name too short
curl -X POST "http://localhost:8000/projects/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "a", "description": "Test"}'

# Test duplicate name
curl -X POST "http://localhost:8000/projects/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Existing Project", "description": "Test"}'
```

## Future Considerations

### 1. **Additional Validations**
- Consider adding regex patterns for name format
- Add validation for special characters
- Implement reserved name protection

### 2. **Performance**
- Database constraints provide O(1) duplicate checking
- Application-level validation provides better error messages
- Consider caching for frequently accessed validation rules

### 3. **Monitoring**
- Log validation failures for security monitoring
- Track API usage patterns
- Monitor for potential abuse attempts

## Conclusion

All frontend validation constraints have been successfully implemented in the backend, ensuring that:

1. **Security**: No bypassing of business rules through API access
2. **Consistency**: Same validation behavior across all access methods  
3. **Reliability**: Database constraints provide final safety net
4. **User Experience**: Clear, consistent error messages

The system now provides robust protection against invalid data entry regardless of how users access the service. 