# Post Editing Issues Analysis

## Issue 1: Selective 403 Forbidden Errors

### Root Cause: NULL/0 author_id Ownership Check

**Location:** [/api/admin/posts/[id] PUT endpoint](src/app/api/admin/posts/[id]/route.ts#L160-L175)

```typescript
// Check post ownership for authors
if (auth.user.role === 'author') {
  const existingPost = await postsRepository.findById(postId);
  if (!existingPost) {
    return NextResponse.json(
      { success: false, error: 'Post not found' },
      { status: 404 }
    );
  }
  if (existingPost.author_id !== auth.user.id) {
    return NextResponse.json(
      { success: false, error: 'You can only edit your own posts.' },
      { status: 403 }
    );
  }
}
```

### The Problem

**Type Definition Issue:**
- `PostEntity.author_id` is typed as `number` only (not `number | null`)
- But the database column **can store NULL** (particularly for RSS-imported posts or legacy data)
- When TypeScript/JavaScript retrieves NULL from the database, it becomes `null` at runtime

**Ownership Check Logic:**
```typescript
// When author_id is NULL in database:
null !== auth.user.id  // Always TRUE, even if the user is the original author
// Result: 403 "You can only edit your own posts."
```

### Why Post 593911 Gets 403

Post 593911 likely has one of these conditions:
1. **`author_id = NULL`** — Common for RSS-imported posts that don't have an internal author assigned
2. **`author_id = 0`** — Possible if there's historical data with a user-id 0 that doesn't exist
3. **`author_id = different_value`** — The post belongs to a different author than who's trying to edit it

### Affected Users

- ⚠️ **'author' role only**: Admins and editors have no ownership check, so they can edit any post
- ✅ Posts with matching `author_id` edit fine
- ❌ Posts with NULL/0/mismatched `author_id` return 403, even if you're the original author

### Error Message

Users see: **"You can only edit your own posts."**

This is **misleading** because the actual issue is that the post has no author assigned (NULL) or the wrong author assigned.

---

## Issue 2: Missing Page Refresh After Save

### Current Flow

**Location:** [Edit post form handleSubmit](src/app/(admin)/admin/posts/edit/[id]/page.tsx#L131-L190)

**Current behavior:**
1. User submits the form → `handleSubmit()` is called
2. Form sends PUT request to `/api/admin/posts/{id}`
3. **Success:** `router.push('/admin/posts')` — Redirect to posts list
4. **Error:** `setError()` is set, and form stays on the page

```typescript
const data = await response.json();

if (!data.success) {
  setError(data.error || 'Failed to update post');
  setSaving(false);
  return;
}

router.push('/admin/posts');  // ← Navigate away after success
```

### What's NOT Happening

✅ **Does redirect:** After successful save, `router.push('/admin/posts')` sends user to the posts list

❌ **Does NOT refresh current form:** No `fetchPost()` call to re-fetch updated data

❌ **Does NOT mutate/invalidate cache:** No cache invalidation for the `/api/admin/posts/[id]` endpoint

### Why Users See Stale Data

**Scenario 1: User stays on edit page (redirect fails silently)**
1. Save button is clicked
2. PUT request succeeds (200 OK)
3. `router.push()` is supposed to execute, but something prevents it:
   - Network error in redirect
   - Error in router.push() caught by the outer try-catch
   - Navigation blocked by something else
4. Form state is **NOT updated** with the new data from the response
5. User sees old form data and thinks changes didn't save

**Current Code Issue:**
```typescript
try {
  // ... form submission code ...
  const data = await response.json();
  
  if (!data.success) {
    setError(data.error || 'Failed to update post');
    setSaving(false);
    return;
  }
  
  router.push('/admin/posts');  // If this throws, it's caught below and silently fails
} catch {
  setError('An error occurred while updating the post');
  setSaving(false);
  // ← Error from router.push() is SILENTLY caught here
}
```

**The catch block is TOO BROAD:**
- It catches errors from the actual form submission (good)
- But it also catches errors from `router.push()` (bad)
- If `router.push()` fails, user sees a generic error **but form data isn't refreshed**

### Scenario 2: Browser/Next.js caching

When user navigates back to the edit page:
1. The `useEffect` with `fetchPost()` is called on mount
2. The GET endpoint returns fresh data (no caching headers)
3. But if the user navigated away and back quickly, there might be a race condition

---

## Implications

### 403 Error Impact
- **Severity:** High
- **Scope:** Only 'author' role users with posts missing/mismatched author_id
- **User Impact:** Authors cannot edit specific posts, even if they created them
- **Root Cause:** Database design allows NULL author_id, but ownership check doesn't account for it

### Refresh After Save Impact
- **Severity:** Medium
- **Scope:** All users
- **User Impact:** Confusion about whether save succeeded; requires manual refresh to verify
- **Root Cause:** Over-broad error handling + no fallback data refresh

---

## Recommended Fixes

### For 403 Error

**Option 1: Handle NULL author_id in the ownership check** (Quick fix)
```typescript
if (auth.user.role === 'author') {
  const existingPost = await postsRepository.findById(postId);
  if (!existingPost) {
    return NextResponse.json(
      { success: false, error: 'Post not found' },
      { status: 404 }
    );
  }
  // Treat NULL author_id as "not owned by anyone" - only real author can edit
  const postAuthorId = existingPost.author_id ?? null;
  if (postAuthorId === null || postAuthorId !== auth.user.id) {
    return NextResponse.json(
      { success: false, error: 'You can only edit your own posts.' },
      { status: 403 }
    );
  }
}
```

**Option 2: Update type definition to reflect reality**
```typescript
export interface PostEntity {
  // ...
  author_id: number | null;  // ← Update from just 'number'
  // ...
}
```

**Option 3: Populate author_id for all posts** (Long-term)
- Backfill NULL author_id values with the current logged-in user's ID
- Or assign RSS posts to a default "RSS Import" system user

### For Missing Refresh

**Option 1: Update form state with response data** (Simplest)
```typescript
const data = await response.json();

if (!data.success) {
  setError(data.error || 'Failed to update post');
  setSaving(false);
  return;
}

// Update form with latest saved data (from response)
if (data.data) {
  const post = data.data;
  setFormData({
    title: post.title || '',
    slug: post.slug || '',
    // ... update all fields ...
  });
}

// Now navigate away
router.push('/admin/posts');
```

**Option 2: Refetch post data after save**
```typescript
if (!data.success) {
  setError(data.error || 'Failed to update post');
  setSaving(false);
  return;
}

// Refetch post to ensure UI matches server state
await fetchPost();

// Then navigate away
router.push('/admin/posts');
```

**Option 3: Separate error handling for router.push()** (More robust)
```typescript
try {
  // ... form submission code ...
  const data = await response.json();
  
  if (!data.success) {
    setError(data.error || 'Failed to update post');
    setSaving(false);
    return;
  }

  setSaving(false);
} catch (err) {
  setError('An error occurred while updating the post');
  setSaving(false);
  return;
}

// Navigate OUTSIDE the try-catch
try {
  await router.push('/admin/posts');
} catch (err) {
  console.error('Navigation failed:', err);
  setError('Save succeeded, but navigation failed. Please refresh the page.');
}
```

---

## Database Schema Check Needed

Run this query to find posts with problematic author_id values:

```sql
-- Posts with NULL author_id
SELECT id, title, slug, author_id, status 
FROM posts 
WHERE author_id IS NULL 
LIMIT 20;

-- Posts that match post 593911
SELECT id, title, slug, author_id, status 
FROM posts 
WHERE id = 593911;

-- Count of posts with NULL author_id
SELECT COUNT(*) as null_author_count 
FROM posts 
WHERE author_id IS NULL;

-- Count of posts with author_id = 0
SELECT COUNT(*) as zero_author_count 
FROM posts 
WHERE author_id = 0;
```

---

## Summary

| Issue | Root Cause | Impact | Fix Difficulty |
|-------|-----------|--------|-----------------|
| 403 for post 593911 | NULL/0 author_id + no type safety | Authors can't edit own RSS posts | Easy |
| No refresh after save | Redirect may fail silently, no fallback | UI doesn't update, user confusion | Easy-Medium |
