# Author Management Enhancement - Implementation Guide

## Overview
Enhanced the StartupNews.fyi backend to support comprehensive author management with:
- Author names, emails, descriptions, and photos
- "Team StartupNews.fyi" as the default author for news posts
- Full CRUD operations for authors in the admin panel
- Author selection when creating/editing posts

## Database Changes

### Required Migration
Run the migration script to add the `author_description` column and create the default Team author:

```bash
npm run tsx scripts/add-author-description-field.ts
```

This migration:
1. Adds `author_description` (LONGTEXT) column to the `users` table if it doesn't exist
2. Creates the "Team StartupNews.fyi" default author with description and avatar

## Backend Changes

### 1. Database Schema
**File**: (runs via migration script)
- **New Column**: `author_description` LONGTEXT NULL (in `users` table)
- **New Default Author**: Team StartupNews.fyi (role='author')

### 2. TypeScript Types
**File**: `src/modules/users/domain/types.ts`
- Added `author_description?: string` to `UserEntity`
- Added `authorDescription?: string` to `User` DTO
- Updated `CreateUserDto` and `UpdateUserDto` to include `authorDescription`

### 3. Repository Layer
**File**: `src/modules/users/repository/users.repository.ts`
- Updated `create()` method to accept and store `authorDescription`
- Uses snake_case SQL (`author_description`) ↔ camelCase TypeScript mappings

### 4. Service Layer
**File**: `src/modules/users/service/users.service.ts`
- No changes needed (service passes through repository layer)

### 5. Utility Functions
**File**: `src/modules/users/utils/users.utils.ts`
- Updated `entityToUser()` to map `author_description` → `authorDescription`

### 6. API Routes
**Files**:
- `src/app/api/admin/authors/route.ts` (GET/POST)
  - GET: Lists all authors with search and filter support
  - POST: Creates new author with description field
  
- `src/app/api/admin/authors/[id]/route.ts` (GET/PUT/DELETE)
  - GET: Fetches single author with description
  - PUT: Updates author including description
  - DELETE: Removes author (with delete protection for posts)

## Frontend Changes

### 1. Author Admin Pages
**File**: `src/app/(admin)/admin/authors/create/page.tsx`
- Added "Author Description" textarea field
- Accepts multi-line author bio/description

**File**: `src/app/(admin)/admin/authors/edit/[id]/page.tsx`
- Added "Author Description" textarea field for editing existing authors
- Loads and updates descriptions from API

### 2. Post Creation Form
**File**: `src/app/(admin)/admin/posts/create/page.tsx`
- Updated `fetchAuthors()` to default to "Team StartupNews.fyi"
- Author dropdown includes all available authors
- **Default Behavior**: When creating a post without an explicit author, automatically selects Team StartupNews.fyi

### 3. Post Edit Form
**File**: `src/app/(admin)/admin/posts/edit/[id]/page.tsx`
- Fetches and displays existing author selection
- Allows changing author for existing posts

## Admin Panel Features

### Author Management (`/admin/authors`)
1. **List Authors**
   - Search by name or email
   - Filter by active/inactive status
   - View author details with description, photo, and role

2. **Create Author**
   - Name (required)
   - Email (required, unique)
   - Password (required, min 6 chars)
   - Avatar URL (optional)
   - Author Description (optional)
   - Active/Inactive toggle

3. **Edit Author**
   - Modify all above fields
   - Optional password change
   - Delete protection: Cannot delete author if assigned to posts

4. **Delete Author**
   - Protected: Shows error if author has posts
   - Must reassign posts to another author first

## Default Author Configuration

### Team StartupNews.fyi
- **Name**: Team StartupNews.fyi
- **Email**: team@startupnews.fyi
- **Role**: author
- **Avatar**: https://startupnews.fyi/images/team-logo.svg
- **Description**: "Global startup and technology media platform covering venture funding, innovation, and emerging technologies."
- **Status**: Active

### Default Selection Logic
When creating a new post:
1. Check for "Team StartupNews.fyi" author → use if found
2. Otherwise, use currently logged-in user if they're an author
3. Otherwise, use the first available author
4. If no authors exist, author field is left blank

## API Examples

### Get All Authors
```bash
GET /api/admin/authors?search=tech&includeInactive=false
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Team StartupNews.fyi",
      "email": "team@startupnews.fyi",
      "role": "author",
      "avatarUrl": "https://...",
      "authorDescription": "Global startup and technology...",
      "isActive": true
    }
  ]
}
```

### Create Author
```bash
POST /api/admin/authors
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "avatarUrl": "https://example.com/avatar.jpg",
  "authorDescription": "Tech journalist with 10 years experience",
  "isActive": true
}
```

### Update Author
```bash
PUT /api/admin/authors/2
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Jane Smith",
  "authorDescription": "Updated bio",
  "password": "NewPassword123"
}
```

## Build Status
✅ **Build Successful** - All TypeScript changes compile correctly
- No breaking changes
- Type-safe author field handling
- Backward compatible with existing post data

## Migration Checklist
- [ ] Back up database before running migration
- [ ] Run migration: `npm run tsx scripts/add-author-description-field.ts`
- [ ] Verify "Team StartupNews.fyi" author was created
- [ ] Test author creation in admin panel
- [ ] Test posting with default Team author
- [ ] Test author editing and updating descriptions

## Testing Recommendations
1. **Author CRUD**: Create, read, update, delete authors
2. **Default Author**: Create a post without selecting an author, verify it defaults to Team
3. **Author Descriptions**: Verify descriptions are stored and displayed correctly
4. **Author Photos**: Test avatar URLs load correctly
5. **Delete Protection**: Try deleting an author with posts, should show error
6. **Search**: Search for authors by name/email in admin panel

## Files Modified
- `src/modules/users/domain/types.ts`
- `src/modules/users/repository/users.repository.ts`
- `src/modules/users/utils/users.utils.ts`
- `src/app/api/admin/authors/route.ts`
- `src/app/api/admin/authors/[id]/route.ts`
- `src/app/(admin)/admin/authors/create/page.tsx`
- `src/app/(admin)/admin/authors/edit/[id]/page.tsx`
- `src/app/(admin)/admin/posts/create/page.tsx`
- `src/app/(admin)/admin/posts/edit/[id]/page.tsx`

## Files Created
- `scripts/add-author-description-field.ts` (Migration script)

## Next Steps
1. Run the migration script to update the database
2. Test author management features in the admin panel
3. Verify posts are created with Team author as default
4. Update author descriptions and photos as needed
5. Monitor author assignments in published posts
