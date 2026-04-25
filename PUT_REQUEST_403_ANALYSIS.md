# 403 Forbidden on PUT /api/admin/posts/[id] - Analysis

## Summary
PUT requests to update posts fail with 403 Forbidden on production/staging (startupnews.thebackend.in) due to **incomplete auth headers when sending multipart/form-data** combined with **WAF/CloudFront stripping Authorization headers on large requests**.

---

## 1. How Tokens Are Sent in PUT Requests

### Case 1: WITH Featured Image (multipart/form-data)
**File**: [src/app/(admin)/admin/posts/edit/[id]/page.tsx](src/app/(admin)/admin/posts/edit/[id]/page.tsx#L141-L154)

```typescript
if (featuredImageFile) {
  const form = new FormData();
  form.append('title', formData.title);
  // ... other fields ...
  form.append('featuredImageFile', featuredImageFile);
  if (token) form.append('_token', token);
  
  response = await fetch(`/api/admin/posts/${postId}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},  // ❌ INCOMPLETE!
    body: form,
  });
}
```

**Headers sent**:
- ✅ `Authorization: Bearer <token>` (if token exists)
- ✅ `_token` field in FormData (if token exists)
- ❌ **Missing**: `X-Admin-Token` header
- ❌ **Missing**: `X-Access-Token` header
- ❌ **Missing**: `Content-Type` header (browser auto-sets to multipart/form-data with boundary)

### Case 2: WITHOUT Featured Image (application/json)
**Same file**, lines 155-163

```typescript
response = await fetch(`/api/admin/posts/${postId}`, {
  method: 'PUT',
  headers: getAuthHeaders(),  // ✅ COMPLETE
  body: JSON.stringify({ ... }),
});
```

**Headers sent** (via `getAuthHeaders()` function):
- ✅ `Content-Type: application/json`
- ✅ `Authorization: Bearer <token>`
- ✅ `X-Admin-Token: <token>` (fallback for proxy stripping)

**This is the critical difference**: The multipart case is incomplete!

---

## 2. Content-Type Negotiation

### Multipart Handling
When FormData is used as request body:
- Browser **automatically** sets `Content-Type: multipart/form-data; boundary=----...`
- The code does NOT set Content-Type explicitly
- Server-side auth middleware uses `request.headers.get('content-type')` to determine parsing strategy

### JSON Content-Type
When JSON is sent, explicit headers include `'Content-Type': 'application/json'`

---

## 3. Auth Header Functions & Token Extension Patterns

### `getAuthHeaders()` Function
**File**: [src/lib/admin-auth.ts](src/lib/admin-auth.ts#L83-L92)

```typescript
export function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,      // Primary auth header
    'X-Admin-Token': token,                // Fallback for proxy stripping on GET
  };
}
```

**Purpose**: Returns headers suitable for JSON requests, with redundancy for proxy handling.

**Key comment** (line 81): "Sends token in both Authorization and X-Admin-Token so auth works when proxies strip Authorization on GET."

### `withAdminToken()` Function
**File**: [src/lib/admin-auth.ts](src/lib/admin-auth.ts#L95-L101)

```typescript
export function withAdminToken(url: string): string {
  const token = getAdminToken();
  if (!token) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}_token=${encodeURIComponent(token)}`;
}
```

**Purpose**: Adds `?_token=...` query parameter for GET calls where proxies strip auth headers.

**Note**: Used in data-fetching calls but NOT in PUT multipart request. The PUT function adds it to FormData instead.

---

## 4. Token Extraction on Server-Side (Auth Middleware)

**File**: [src/shared/middleware/auth.middleware.ts](src/shared/middleware/auth.middleware.ts#L17-L43)

```typescript
function getTokenFromRequest(request: NextRequest, formToken?: string | null): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7).trim();
  
  // 2. X-Admin-Token (fallback)
  const xToken = request.headers.get('x-admin-token');
  if (xToken?.trim()) return xToken.trim();
  
  // 3. X-Access-Token (fallback)
  const xAccessToken = request.headers.get('x-access-token');
  if (xAccessToken?.trim()) return xAccessToken.trim();
  
  // 4. Cookie
  const cookieToken = request.cookies.get('admin_token')?.value;
  if (cookieToken?.trim()) return cookieToken.trim();
  
  // 5. Form body _token (passed separately for multipart)
  if (formToken?.trim()) return formToken.trim();
  
  // 6. Query parameters (if proxy stripped all headers!)
  const queryToken = request.nextUrl?.searchParams?.get('_token');
  if (queryToken?.trim()) return queryToken.trim();
  
  return null;
}
```

**Fallback chain**:
1. Authorization header ← **PRODUCTION CASE: May be stripped by WAF on PUT**
2. X-Admin-Token header ← **NOT SENT in multipart!**
3. X-Access-Token header ← **Never sent**
4. Cookie ← Possible fallback
5. Form _token field ← Sent in multipart
6. Query _token ← Not used by client

**Critical issue**: If CloudFront/WAF strips the `Authorization` header on PUT requests (common for large requests), the fallback chain depends on X-Admin-Token, which is NOT sent in multipart cases.

---

## 5. WAF/CloudFront/Proxy Configuration Issues

### Evidence of WAF Header Stripping
**Multiple files reference WAF 403 issues on multipart**:

1. **[src/app/api/admin/presign/route.ts](src/app/api/admin/presign/route.ts#L10-L12)**
   ```
   Comment: "Request body is tiny JSON (no file data), so it passes through CloudFront WAF."
   ```
   → Implies: Large multipart requests are filtered differently

2. **[src/app/api/admin/upload/route.ts](src/app/api/admin/upload/route.ts#L72)**
   ```
   Comment: "Handle Binary Octet-Stream Upload (Bypasses WAF body inspection)"
   ```

3. **[src/app/api/admin/upload/route.ts](src/app/api/admin/upload/route.ts#L82)**
   ```
   Comment: "Handle JSON Base64 Upload (Fallback for WAF 403s on multipart)"
   ```

### WAF Behavior Pattern
- **Tiny JSON requests** → Pass through with all headers intact
- **Large multipart requests** → Deep inspection by WAF
  - May strip `Authorization` header
  - May block based on content patterns
  - Requires alternative auth methods (query params, form fields)

### AWS WAF Configuration
**File**: [aws-waf-setup.sh](aws-waf-setup.sh) contains WAF rules including:
- AWSManagedRulesCommonRuleSet
- AWSManagedRulesLinuxRuleSet
- AWSManagedRulesSQLiRuleSet
- AWSManagedRulesUnixRuleSet
- (potentially others)

These rules may strip or block based on:
- Request method (PUT is less common)
- Content-Type (multipart is scrutinized)
- Header presence (Authorization headers may be stripped on large multipart)
- Body content patterns

---

## 6. The Critical Bug: Multipart Missing X-Admin-Token

### Scenario: PUT with featured image on staging

```
Frontend:
  FormData { title, content, ..., featuredImageFile, _token }
  Headers: { Authorization: Bearer <token> }
  ↓
CloudFront/WAF:
  → Sees multipart + large body
  → Applies rule: Strip Authorization header (security policy)
  ↓
Backend receives:
  Method: PUT
  Path: /api/admin/posts/123
  Headers: { } ← NO Authorization, NO X-Admin-Token!!
  FormData: { _token field exists }
  ↓
Auth middleware token lookup:
  1. Authorization header? ❌ (stripped by WAF)
  2. X-Admin-Token header? ❌ (NOT sent by client!)
  3. X-Access-Token header? ❌ (NOT sent)
  4. Cookie? ❌ (may not exist)
  5. Form _token? ✅ FOUND!
  ↓
Auth succeeds (maybe)
```

**BUT**: Sometimes the form _token lookup fails if:
- Form parsing fails before token extraction
- Token is malformed
- WAF blocks the request before it reaches backend

---

## 7. Form Field Inclusion in Multipart

**File**: [src/app/(admin)/admin/posts/edit/[id]/page.tsx](src/app/(admin)/admin/posts/edit/[id]/page.tsx#L145)

```typescript
if (token) form.append('_token', token);
```

**Token IS included** in FormData when a token exists.

**Server-side extraction** (in PUT handler):
```typescript
const formData = await request.formData();
formToken = (formData.get('_token') as string) || null;
// ...
const auth = await getAuthUser(request, formToken ?? undefined);
```

**Potential issues**:
1. If WAF blocks the request before `request.formData()` is called → 403 before token is checked
2. If token string is corrupted/truncated in transmission → Invalid token
3. If form field order matters and _token comes after file → Processing order issues

---

## 8. What Frontend Actually Sends vs. Server Expects

### Frontend Sends (multipart with image)
```
PUT /api/admin/posts/123 HTTP/1.1
Host: startupnews.thebackend.in
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...   ← ⚠️ May be stripped by WAF!
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZ0gW...

------WebKitFormBoundary7MA4YWxkTrZ0gW...
Content-Disposition: form-data; name="title"

My Post Title
------WebKitFormBoundary7MA4YWxkTrZ0gW...
...
Content-Disposition: form-data; name="_token"

eyJhbGciOiJIUzI1NiIs...
------WebKitFormBoundary7MA4YWxkTrZ0gW...
Content-Disposition: form-data; name="featuredImageFile"; filename="image.jpg"
Content-Type: image/jpeg

[binary image data...]
------WebKitFormBoundary7MA4YWxkTrZ0gW...--
```

### Server Receives (after WAF stripping)
```
PUT /api/admin/posts/123 HTTP/1.1
Host: startupnews.thebackend.in
Authorization: <STRIPPED BY WAF>           ← ❌ GONE
X-Admin-Token: <MISSING - NOT SENT>        ← ❌ SHOULD HAVE BEEN SENT
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZ0gW...

[FormData as above with _token field intact]
```

### Server Expects
1. Authorization header (primary) OR
2. X-Admin-Token header (fallback) OR
3. _token in FormData field (last resort) OR
4. Token in query params

**Problem**: Client doesn't send #2, #4. If #1 is stripped, auth fails.

---

## 9. Token Format & Expiration

**Token format**: JWT (Bearer token)
**Generated by**: [src/modules/users/service/auth.service.ts]
**Stored in**: 
- localStorage: `admin_token` key
- Cookie: `admin_token` (HttpOnly, SameSite=Lax)

**Expiration**: Depends on JWT payload (typically hours/days, see auth config)

**Expiration handling**:
- No client-side refresh on 401
- No automatic re-auth
- User must manually log in again if token expires

---

## Root Cause Summary

| Issue | Impact | Severity |
|-------|--------|----------|
| **Multipart only sends Authorization header, not X-Admin-Token** | If WAF strips Authorization, auth fails | 🔴 Critical |
| **WAF/CloudFront strips Authorization on large PUT requests** | Multipart requests lose primary auth | 🔴 Critical |
| **No query parameter fallback in client code** | Can't bypass header stripping | 🟡 Medium |
| **Form _token field relies on correct parsing** | If form parsing fails, entire request fails | 🟡 Medium |
| **No exponential backoff on 403** | User gets stuck without retry hint | 🟢 Low |

---

## Recommended Fixes (Priority Order)

### Fix 1: Add X-Admin-Token Header to Multipart Requests (HIGHEST PRIORITY)
**File**: [src/app/(admin)/admin/posts/edit/[id]/page.tsx](src/app/(admin)/admin/posts/edit/[id]/page.tsx#L141-L154)

**Current code**:
```typescript
response = await fetch(`/api/admin/posts/${postId}`, {
  method: 'PUT',
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: form,
});
```

**Fixed code**:
```typescript
const headers: HeadersInit = {};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
  headers['X-Admin-Token'] = token;  // ← ADD THIS
}
response = await fetch(`/api/admin/posts/${postId}`, {
  method: 'PUT',
  headers,
  body: form,
});
```

### Fix 2: Fallback to JSON Base64 Upload if Multipart Fails
Use presigned S3 upload + JSON metadata request (like media ingest route does)

### Fix 3: Add Token in Query Parameter as Last Resort
If both headers are stripped, send `?_token=...` in URL:
```typescript
const urlWithToken = token ? `${url}?_token=${encodeURIComponent(token)}` : url;
response = await fetch(urlWithToken, { method: 'PUT', body: form, ... });
```

---

## Testing Checklist

- [ ] Test PUT with featured image on localhost (no WAF)
- [ ] Test PUT with featured image on staging (with WAF)
- [ ] Test PUT without featured image (JSON) on staging
- [ ] Verify X-Admin-Token header appears in Network tab
- [ ] Test token expiration scenarios
- [ ] Test with CloudFront in front (cache behavior)
- [ ] Check WAF logs for stripped headers
- [ ] Monitor for 403 errors post-fix

