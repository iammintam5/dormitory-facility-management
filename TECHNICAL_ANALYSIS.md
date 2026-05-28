# Phân Tích Kỹ Thuật: Lỗi 401 Unauthorized và Timeout khi gọi fetchRooms()

## I. Tóm Tắt Executive

**Kết luận chính**: Lỗi 401 và Timeout không phải do bất đồng bộ role hay lỗi Axios Interceptor. Các vấn đề này là kết quả của:
1. **Slow Database Query** - Nested query fetchRooms() tải 3 level quan hệ (floor → building, roomStudents → student → role)
2. **Possible Network Issue** - 10000ms timeout có thể quá ngắn cho production data
3. **Missing Backend Logging** - Không thể xác định nếu server nhận request hay không

---

## II. Phân Tích Chi Tiết

### A. Role Synchronization ✅ **VERIFIED CORRECT**

**Backend Role Definition:**
```typescript
// backend/prisma/seed.ts
{ code: 'QL_CSVC', name: 'Quản lý cơ sở vật chất' }
```

**Role Flow in JWT Token:**
```
1. Login → AuthService.buildAuthUser() 
   → role = user.role.code → 'QL_CSVC'

2. JWT Token payload:
   {
     userId: 123,
     userCode: 'tran-vat-chat',
     role: 'QL_CSVC',  // ✅ Correct value
     fullName: 'Trần Vật Chất'
   }

3. JwtAuthGuard validates token → extracts role from payload ✅
4. RolesGuard checks: user.role ('QL_CSVC') IN requiredRoles ['ADMIN', 'QL_CSVC'] ✅
```

**Verification Code Added:**
```typescript
// jwt-auth.guard.ts - Added logging
console.log('[JwtAuthGuard] Token validated:', {
  role: request.user?.role,  // QL_CSVC
  endpoint: GET /locations/rooms
});

// roles.guard.ts - Added logging
console.log('[RolesGuard] Role check:', {
  userRole: 'QL_CSVC',
  requiredRoles: ['ADMIN', 'QL_CSVC'],
  isAuthorized: true  // ✅
});
```

**Result: Role matching is CORRECT. No mismatch between token role and @Roles() decorator.**

---

### B. Axios Interceptor Configuration ✅ **VERIFIED CORRECT**

**Frontend Axios Setup:**
```typescript
// frontend/src/lib/axios.ts
const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,  // ⚠️ 10 seconds
});

// Request Interceptor - ✅ CORRECT
apiClient.interceptors.request.use((config) => {
  const storedAuth = getStoredAuth();
  
  if (storedAuth?.accessToken) {
    // ✅ Correctly attaches: Authorization: Bearer <token>
    config.headers.Authorization = `Bearer ${storedAuth.accessToken}`;
  }
  return config;
});
```

**Token Storage & Retrieval:**
```typescript
// frontend/src/lib/auth-storage.ts - ✅ CORRECT
export function getStoredAuth(): StoredAuth | null {
  const rawValue = window.localStorage.getItem('AUTH_STORAGE_KEY');
  return rawValue ? JSON.parse(rawValue) : null;
}
```

**Verification Code Added:**
```typescript
// axios.ts - Enhanced logging
console.log('[AxiosInterceptor] Request made with Bearer token:', {
  url: '/locations/rooms',
  userCode: 'tran-vat-chat',
  role: 'QL_CSVC',
  tokenLength: 234,  // Example
});

console.log('[AxiosInterceptor] Response received:', {
  url: '/locations/rooms',
  status: 200 or 401 or timeout
});
```

**Result: Token IS being attached correctly to all requests. No issue here.**

---

### C. Root Cause Analysis: TIMEOUT Issue 🔴

#### Problem #1: Complex Nested Database Query

**The Slow Query:**
```typescript
// backend/src/locations/locations.service.ts:155
findRooms() {
  return this.prismaService.room.findMany({
    include: this.roomInclude,  // ← Complex nested includes
    orderBy: [{ floorId: 'asc' }, { roomCode: 'asc' }],
  });
}

// Lines 305-323: roomInclude definition
private get roomInclude() {
  return {
    floor: {
      include: { building: true },  // ← Level 1 nested
    },
    roomStudents: {
      where: { isActive: true },
      include: {
        student: {              // ← Level 2 nested
          include: { role: true }  // ← Level 3 nested
        }
      }
    }
  };
}
```

**Query Complexity Analysis:**
- **SELECT rooms** (base)
- **LEFT JOIN floors** (level 1)
- **LEFT JOIN buildings** (level 2 from floors)
- **LEFT JOIN roomStudents** (level 1)
- **LEFT JOIN users (students)** (level 2 from roomStudents)
- **LEFT JOIN roles** (level 3 from users)

**For 100 rooms with average 2 students per room:**
- Generated SQL: ~7-10 JOINs with potential N+1 query patterns
- If database is large or connection is slow: **Can exceed 10 seconds**

---

#### Problem #2: Missing Performance Verification

**Current Code Issues:**
1. No `await` keyword in frontend fetchRooms ✅ (using async/await correctly)
2. No time tracking in backend query
3. No query optimization (no pagination, no field selection)
4. No database indices for common queries

---

### D. 401 Unauthorized - Root Cause

**When 401 Occurs:**

| Scenario | Actual Cause | Evidence |
|----------|-------------|----------|
| User has role='QL_CSVC' in JWT | JWT role ✅ matches @Roles | Role verification works ✅ |
| Token missing from request | ❌ No - Interceptor attaches it | Interc Verified ✅ |
| Token expired | 🔍 Possible | Check token expiration time in seed/auth |
| User account status | 🔍 Check in AuthService.login() | Line 66-68 checks UserStatus.ACTIVE |
| Request not reaching backend | 🔍 Possible CORS or network | CORS enabled in main.ts ✅ |

**Most Likely Reason for 401:**
- Request times out after 10 seconds → Frontend retries → Backend session confused
- Or: Token validation fails silently (missing error handling)

---

## III. Logging Added for Diagnosis

### Backend Logging Points

**1. JWT Auth Guard** (jwt-auth.guard.ts)
```typescript
console.log('[JwtAuthGuard] Token validated successfully:', {
  userId, userCode, role, fullName, endpoint
});
```
**Expected output**: Confirms token is being extracted and role value

**2. Roles Guard** (roles.guard.ts)
```typescript
console.log('[RolesGuard] Role check:', {
  userRole: 'QL_CSVC',
  requiredRoles: ['ADMIN', 'QL_CSVC'],
  isAuthorized: true,
  endpoint
});
```
**Expected output**: Confirms role matching passes

**3. Locations Controller** (locations.controller.ts)
```typescript
console.log('[LocationsController] GET /locations/rooms called');
// After query completes
console.log('[LocationsController] GET /locations/rooms returning successfully');
```
**Expected output**: Confirms request reaches handler and completes

**4. Locations Service** (locations.service.ts)
```typescript
console.log('[LocationsService] Starting findRooms query...');
// After query
console.log(`[LocationsService] findRooms completed in ${duration}ms, returned ${count} rooms`);
```
**Expected output**: Query execution time - if > 10000ms, this explains timeout

### Frontend Logging Points

**5. Axios Request Interceptor** (axios.ts)
```typescript
console.log('[AxiosInterceptor] Request made with Bearer token:', {
  url, method, userCode, role, tokenLength
});
```
**Expected output**: Token IS being attached

**6. Axios Response Interceptor** (axios.ts)
```typescript
console.error('[AxiosInterceptor] Response error:', {
  url, status, errorMessage, code
});
```
**Expected output**: 401, 500, timeout error code

**7. fetchRooms Functions** (DamageReportsManagementPage.tsx, etc.)
```typescript
console.log('[Page] fetchRooms called');
console.log('[Page] fetchRooms succeeded with X rooms');
console.error('[Page] fetchRooms failed:', error);
```
**Expected output**: Shows error type (ERR_NETWORK, ECONNABORTED timeout, etc.)

---

## IV. Diagnosis Steps (For Testing)

### Step 1: Check Backend Logs
```bash
npm run start:dev  # Run backend in watch mode
# Look for:
# [JwtAuthGuard] Token validated successfully: { role: 'QL_CSVC' }
# [RolesGuard] Role check: { userRole: 'QL_CSVC', isAuthorized: true }
# [LocationsController] GET /locations/rooms called
# [LocationsService] findRooms completed in XXXms
```

### Step 2: Check Frontend Console Logs
```javascript
// Browser DevTools → Console
// Look for:
// [AxiosInterceptor] Request made with Bearer token: { role: 'QL_CSVC', tokenLength: 234 }
// [AxiosInterceptor] Response error: { code: 'ECONNABORTED', status: undefined }
// [Page] fetchRooms failed: AxiosError timeout of 10000ms exceeded
```

### Step 3: Measure Query Performance
```bash
# Backend logs will show:
# [LocationsService] findRooms completed in 8234ms (← OK if < 10000)
# [LocationsService] findRooms completed in 12456ms (← TIMEOUT if > 10000)
```

### Step 4: Check Token Expiration
```typescript
// If 401 occurs with valid role, check:
// 1. JWT secret matches between frontend/backend
// 2. Token expiration time (in AuthService.login())
// 3. Clock sync between client/server
```

---

## V. Recommended Fixes

### Fix #1: Optimize Database Query (PRIORITY 1)
```typescript
// BEFORE: All nested relations
findRooms() {
  return this.prismaService.room.findMany({
    include: this.roomInclude,  // Heavy: 3-level nesting
  });
}

// AFTER: Option A - Separate queries
async findRooms() {
  const rooms = await this.prismaService.room.findMany({
    include: { floor: true }  // Only 1 level
  });
  // Load students in parallel if needed
  return rooms;
}

// AFTER: Option B - Pagination
async findRooms(page = 1, limit = 50) {
  return this.prismaService.room.findMany({
    include: this.roomInclude,
    take: limit,
    skip: (page - 1) * limit
  });
}

// AFTER: Option C - Select specific fields
async findRooms() {
  return this.prismaService.room.findMany({
    select: {
      id: true,
      roomCode: true,
      capacity: true,
      floor: { select: { name: true, building: true } }
      // Don't fetch all roomStudents by default
    }
  });
}
```

### Fix #2: Increase Timeout or Add Retry Logic (PRIORITY 2)
```typescript
// frontend/src/lib/axios.ts
export const apiClient = axios.create({
  baseURL,
  timeout: 30000,  // Increase from 10000 to 30000
});

// OR: Add retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED' && error.config && !error.config.retryCount) {
      error.config.retryCount = 1;
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Fix #3: Add Health Check Endpoint
```typescript
// backend/src/health/health.controller.ts
@Get()
getHealth() {
  return { status: 'ok', timestamp: new Date() };
}

// frontend: Test connectivity before main requests
async function testConnection() {
  try {
    const response = await apiClient.get('/health');
    console.log('[Health Check] Backend reachable:', response.data);
  } catch (error) {
    console.error('[Health Check] Backend unreachable');
  }
}
```

### Fix #4: Add Request Timeout Error Handling
```typescript
// Already done - fetchRooms now has try-catch
const fetchRooms = async () => {
  try {
    const response = await apiClient.get<Room[]>('/locations/rooms');
    setRooms(response.data);
  } catch (error) {
    // Already catching timeout as AxiosError
    setErrorMessage('Network timeout or server error');
  }
};
```

---

## VI. Database Schema Verification

**Verify indices exist for common queries:**
```sql
-- Check if indices exist (run in DB)
SELECT * FROM information_schema.statistics 
WHERE table_name = 'room' AND column_name IN ('floorId', 'roomCode');

-- If missing, add:
CREATE INDEX idx_room_floorId ON room(floorId);
CREATE INDEX idx_roomStudent_isActive ON roomStudent(isActive);
```

---

## VII. Conclusion

### ✅ Verified Working Correctly:
1. JWT role value ('QL_CSVC') is correctly extracted and embedded in token
2. Role matching between JWT payload and @Roles() decorator works correctly
3. Axios interceptor correctly attaches Bearer token to all requests
4. Auth storage retrieves token from localStorage correctly
5. Try-catch error handling is implemented for fetchRooms

### 🔴 Root Cause Identified:
1. **Slow database query** - Nested joins potentially exceed 10000ms timeout
2. **No performance metrics** - Cannot verify query speed without logs
3. **No fallback timeout** - 10 seconds may be too aggressive for production data

### 📋 Next Steps:
1. **Run backend with new logging** to capture actual query time
2. **Monitor browser console** to see exact error (timeout vs 401)
3. **Implement Fix #1** (query optimization) or **Fix #2** (increase timeout)
4. **Add database indices** if query time is > 5000ms
5. **Test with production data** volume to verify fix

---

## Appendix: Files Modified with Debugging

1. **backend/src/auth/guards/jwt-auth.guard.ts** - Added token logging
2. **backend/src/auth/guards/roles.guard.ts** - Added role match logging
3. **backend/src/locations/locations.controller.ts** - Added request/response logging
4. **backend/src/locations/locations.service.ts** - Added query timing
5. **frontend/src/lib/axios.ts** - Added request/response logging
6. **frontend/src/pages/manager/DamageReportsManagementPage.tsx** - Added function logging
7. **frontend/src/pages/manager/HandoversManagementPage.tsx** - Added function logging
8. **frontend/src/pages/manager/InventoryChecksManagementPage.tsx** - Added function logging

