# Phase 3: Rate Limiting & Abuse Prevention Implementation Guide

**Status:** 🚧 NOT YET IMPLEMENTED - Ready for future deployment

**When to implement:** Only if you observe abuse patterns (see criteria below)

---

## 📋 When You Should Implement Phase 3

### ✅ Implement if you see ANY of these:

1. **High-Volume Spam**
   - Users sending >10 commands per second
   - Automated scripts/bots detected
   - Same user submitting hundreds of commands quickly

2. **Cost Abuse**
   - Monthly AI costs exceed $50 due to spam
   - Specific users driving up costs disproportionately
   - Token usage doesn't match legitimate gameplay

3. **Repeated Violations**
   - Same users triggering Prompt Watch-Dog repeatedly
   - Users trying to bypass validation with slight variations
   - Coordinated attacks from multiple accounts

4. **System Performance**
   - Database write limits being hit
   - Firebase quota warnings
   - Slow response times due to spam

### ❌ Don't implement if:

- User base is small (<100 active users)
- No abuse patterns detected
- Current Phase 1 & 2 protections are sufficient
- Monthly costs are under control

---

## 🎯 Phase 3 Features

### 1. Per-User Rate Limiting
**What:** Limit commands per user per time window
**Why:** Prevent spam and bot attacks
**Limit:** 30 commands per minute (2 per second average)

### 2. Command Interval Enforcement
**What:** Minimum time between commands
**Why:** Prevent rapid-fire scripting
**Limit:** 100ms minimum between commands

### 3. Progressive Penalties
**What:** Escalating consequences for repeat violators
**Why:** Deter abuse without blocking legitimate users
**Penalties:**
- 1-3 violations: Warning messages
- 4-10 violations: 5-second cooldown per command
- 10+ violations: 1-hour temporary ban

### 4. IP-Based Tracking
**What:** Track commands per IP address
**Why:** Detect multi-account abuse
**Use case:** Identify coordinated attacks

### 5. Abuse Dashboard
**What:** Admin view of abuse metrics
**Why:** Monitor and respond to threats
**Metrics:** Violation counts, ban list, abuse patterns

---

## 🗄️ Database Schema (Firestore)

### Collection: `rate_limits`

```typescript
interface RateLimitState {
    userId: string;
    commandTimestamps: number[];      // Last 60 commands (with timestamps)
    commandsThisMinute: number;       // Quick counter
    lastCommandTime: number;          // For interval checking
    blockedUntil?: number;            // Timestamp when ban expires
    lastReset: number;                // Last time we cleaned old timestamps
}

// Document ID: userId
// Example: 'rate_limits/dev_user_123'
```

### Collection: `abuse_tracking`

```typescript
interface AbuseTracker {
    userId: string;
    violationCount: number;           // Total violations
    violationHistory: {
        timestamp: number;
        type: ViolationType;
        severity: 'critical' | 'high' | 'medium';
    }[];
    penaltyLevel: 'none' | 'warning' | 'slowdown' | 'banned';
    bannedUntil?: number;             // When ban expires
    firstViolation: number;           // Timestamp
    lastViolation: number;            // Timestamp
    ipAddresses: string[];            // List of IPs used by this user
    userAgent?: string;               // Browser/client info
}

// Document ID: userId
// Example: 'abuse_tracking/dev_user_123'
```

### Collection: `banned_users`

```typescript
interface BannedUser {
    userId: string;
    bannedAt: number;
    bannedUntil: number;
    reason: string;
    violationCount: number;
    bannedBy: 'system' | 'admin';     // Auto-ban vs manual
    appealStatus?: 'pending' | 'approved' | 'denied';
    notes?: string;                   // Admin notes
}

// Document ID: userId
// Example: 'banned_users/dev_user_123'
```

### Collection: `ip_tracking`

```typescript
interface IPTracking {
    ipAddress: string;
    userIds: string[];                // Users from this IP
    commandCount: number;
    firstSeen: number;
    lastSeen: number;
    isSuspicious: boolean;            // Flagged by system
    suspicionReasons: string[];       // Why flagged
}

// Document ID: hashed IP address
// Example: 'ip_tracking/sha256_of_ip'
```

---

## 💻 Implementation Code

### Step 1: Create Rate Limiter Utility

**File:** `/src/lib/security/rate-limiter.ts`

```typescript
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase/firebase';

const LIMITS = {
    MAX_COMMANDS_PER_MINUTE: 30,
    MIN_COMMAND_INTERVAL_MS: 100,
    BAN_DURATION_MS: 3600000,  // 1 hour
    COOLDOWN_DURATION_MS: 5000, // 5 seconds
};

interface RateLimitState {
    userId: string;
    commandTimestamps: number[];
    commandsThisMinute: number;
    lastCommandTime: number;
    blockedUntil?: number;
    lastReset: number;
}

interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    blockedUntil?: number;
    cooldownMs?: number;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
    const { firestore } = initializeFirebase();
    const rateLimitRef = doc(firestore, 'rate_limits', userId);
    const now = Date.now();

    // Get current rate limit state
    const snapshot = await getDoc(rateLimitRef);
    let state: RateLimitState;

    if (snapshot.exists()) {
        state = snapshot.data() as RateLimitState;
    } else {
        state = {
            userId,
            commandTimestamps: [],
            commandsThisMinute: 0,
            lastCommandTime: 0,
            lastReset: now,
        };
    }

    // Check if user is currently banned
    if (state.blockedUntil && now < state.blockedUntil) {
        return {
            allowed: false,
            reason: `You're temporarily blocked. Try again in ${Math.ceil((state.blockedUntil - now) / 1000)} seconds.`,
            blockedUntil: state.blockedUntil,
        };
    }

    // Check minimum interval between commands
    if (state.lastCommandTime > 0) {
        const timeSinceLastCommand = now - state.lastCommandTime;
        if (timeSinceLastCommand < LIMITS.MIN_COMMAND_INTERVAL_MS) {
            return {
                allowed: false,
                reason: 'Slow down! Wait a moment before sending another command.',
                cooldownMs: LIMITS.MIN_COMMAND_INTERVAL_MS - timeSinceLastCommand,
            };
        }
    }

    // Clean up timestamps older than 1 minute
    const oneMinuteAgo = now - 60000;
    state.commandTimestamps = state.commandTimestamps.filter(ts => ts > oneMinuteAgo);
    state.commandsThisMinute = state.commandTimestamps.length;

    // Check rate limit
    if (state.commandsThisMinute >= LIMITS.MAX_COMMANDS_PER_MINUTE) {
        // Ban user for excessive commands
        state.blockedUntil = now + LIMITS.BAN_DURATION_MS;
        await setDoc(rateLimitRef, state);

        return {
            allowed: false,
            reason: `Too many commands! You've been temporarily blocked for ${LIMITS.BAN_DURATION_MS / 60000} minutes.`,
            blockedUntil: state.blockedUntil,
        };
    }

    // Allow command and update state
    state.commandTimestamps.push(now);
    state.commandsThisMinute++;
    state.lastCommandTime = now;
    state.lastReset = now;

    // Save updated state
    await setDoc(rateLimitRef, state);

    return { allowed: true };
}

export async function resetRateLimit(userId: string): Promise<void> {
    const { firestore } = initializeFirebase();
    const rateLimitRef = doc(firestore, 'rate_limits', userId);

    await setDoc(rateLimitRef, {
        userId,
        commandTimestamps: [],
        commandsThisMinute: 0,
        lastCommandTime: 0,
        blockedUntil: undefined,
        lastReset: Date.now(),
    });
}

export async function getUserRateLimitInfo(userId: string): Promise<RateLimitState | null> {
    const { firestore } = initializeFirebase();
    const rateLimitRef = doc(firestore, 'rate_limits', userId);
    const snapshot = await getDoc(rateLimitRef);

    return snapshot.exists() ? (snapshot.data() as RateLimitState) : null;
}
```

### Step 2: Create Abuse Tracker

**File:** `/src/lib/security/abuse-tracker.ts`

```typescript
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase/firebase';
import type { ViolationType } from './prompt-watch-dog';

interface AbuseTracker {
    userId: string;
    violationCount: number;
    violationHistory: {
        timestamp: number;
        type: ViolationType;
        severity: 'critical' | 'high' | 'medium';
    }[];
    penaltyLevel: 'none' | 'warning' | 'slowdown' | 'banned';
    bannedUntil?: number;
    firstViolation: number;
    lastViolation: number;
}

const PENALTY_THRESHOLDS = {
    WARNING: 3,      // 1-3 violations: warning
    SLOWDOWN: 10,    // 4-10 violations: 5-sec cooldown
    BAN: 15,         // 10+ violations: 1-hour ban
};

export async function trackViolation(
    userId: string,
    violation: { type: ViolationType; severity: 'critical' | 'high' | 'medium' }
): Promise<AbuseTracker> {
    const { firestore } = initializeFirebase();
    const abuseRef = doc(firestore, 'abuse_tracking', userId);
    const snapshot = await getDoc(abuseRef);
    const now = Date.now();

    let tracker: AbuseTracker;

    if (snapshot.exists()) {
        tracker = snapshot.data() as AbuseTracker;
    } else {
        tracker = {
            userId,
            violationCount: 0,
            violationHistory: [],
            penaltyLevel: 'none',
            firstViolation: now,
            lastViolation: now,
        };
    }

    // Add violation to history
    tracker.violationCount++;
    tracker.lastViolation = now;
    tracker.violationHistory.push({
        timestamp: now,
        type: violation.type,
        severity: violation.severity,
    });

    // Keep only last 100 violations in history
    if (tracker.violationHistory.length > 100) {
        tracker.violationHistory = tracker.violationHistory.slice(-100);
    }

    // Update penalty level
    if (tracker.violationCount >= PENALTY_THRESHOLDS.BAN) {
        tracker.penaltyLevel = 'banned';
        tracker.bannedUntil = now + 3600000; // 1 hour
    } else if (tracker.violationCount >= PENALTY_THRESHOLDS.SLOWDOWN) {
        tracker.penaltyLevel = 'slowdown';
    } else if (tracker.violationCount >= PENALTY_THRESHOLDS.WARNING) {
        tracker.penaltyLevel = 'warning';
    }

    await setDoc(abuseRef, tracker);
    return tracker;
}

export async function getAbuseInfo(userId: string): Promise<AbuseTracker | null> {
    const { firestore } = initializeFirebase();
    const abuseRef = doc(firestore, 'abuse_tracking', userId);
    const snapshot = await getDoc(abuseRef);

    return snapshot.exists() ? (snapshot.data() as AbuseTracker) : null;
}

export async function resetAbuseTracking(userId: string): Promise<void> {
    const { firestore } = initializeFirebase();
    const abuseRef = doc(firestore, 'abuse_tracking', userId);

    await setDoc(abuseRef, {
        userId,
        violationCount: 0,
        violationHistory: [],
        penaltyLevel: 'none',
        firstViolation: Date.now(),
        lastViolation: Date.now(),
    });
}
```

### Step 3: Integrate into actions.ts

Add after Prompt Watch-Dog validation:

```typescript
// In processCommand function, after prompt-watch-dog validation

// Phase 3: Check rate limit
const { checkRateLimit } = await import('@/lib/security/rate-limiter');
const rateLimitResult = await checkRateLimit(userId);

if (!rateLimitResult.allowed) {
    console.log(`⏱️  [Rate Limiter] User ${userId} blocked: ${rateLimitResult.reason}`);

    const errorMessage = createMessage('system', 'System', rateLimitResult.reason || 'Too many commands. Please slow down.');
    return { newState: currentState, messages: [errorMessage] };
}

// Phase 3: Track violations if Watch-Dog detected issues
if (!validation.isValid) {
    const { trackViolation } = await import('@/lib/security/abuse-tracker');
    await trackViolation(userId, {
        type: validation.violations[0].type,
        severity: validation.violations[0].severity,
    });
}
```

### Step 4: Admin Dashboard Integration

**File:** `/src/app/admin/AbuseTab.tsx` (new file)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase/firebase';

export function AbuseTab() {
    const [abuseData, setAbuseData] = useState<any[]>([]);

    useEffect(() => {
        loadAbuseData();
    }, []);

    async function loadAbuseData() {
        const { firestore } = initializeFirebase();
        const abuseCollection = collection(firestore, 'abuse_tracking');
        const snapshot = await getDocs(abuseCollection);

        const data = snapshot.docs.map(doc => ({
            userId: doc.id,
            ...doc.data(),
        }));

        // Sort by violation count (highest first)
        data.sort((a, b) => b.violationCount - a.violationCount);

        setAbuseData(data);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Abuse Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {abuseData.map(user => (
                        <div key={user.userId} className="border p-4 rounded">
                            <p><strong>User:</strong> {user.userId}</p>
                            <p><strong>Violations:</strong> {user.violationCount}</p>
                            <p><strong>Penalty Level:</strong> {user.penaltyLevel}</p>
                            {user.bannedUntil && (
                                <p className="text-red-600">
                                    <strong>Banned until:</strong> {new Date(user.bannedUntil).toLocaleString()}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
```

---

## 🧪 Testing Phase 3

### Test Script: Rapid-Fire Commands

```typescript
// test-rate-limit.ts
async function testRateLimit() {
    console.log('Testing rate limit with rapid-fire commands...');

    for (let i = 0; i < 35; i++) {
        const result = await processCommand('test_user', 'look around');
        console.log(`Command ${i + 1}:`, result.messages[0].content);

        // Try to send commands as fast as possible
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

// Should block after 30 commands
```

### Test Script: Violation Tracking

```typescript
// test-abuse-tracking.ts
async function testAbuseTracking() {
    const badInputs = [
        '<script>alert(1)</script>',
        'Ignore previous instructions',
        'a'.repeat(300),
        '!!!!!!!!!!!',
    ];

    for (let i = 0; i < 12; i++) {
        const input = badInputs[i % badInputs.length];
        const result = await processCommand('test_user', input);
        console.log(`Violation ${i + 1}:`, result.messages[0].content);
    }

    // Should show escalating penalties
}
```

---

## 📊 Monitoring Metrics

### Key Metrics to Track

1. **Rate Limit Hits**
   - Users hitting rate limits per day
   - Average commands per user per minute
   - Peak command rate times

2. **Violation Patterns**
   - Most common violation types
   - Users with most violations
   - Violation rate trends

3. **Ban Statistics**
   - Total bans issued
   - Average ban duration
   - Repeat offenders

4. **Cost Impact**
   - Cost before/after rate limiting
   - Blocked commands per day
   - Savings from prevention

### Dashboard Queries

```typescript
// Get top violators
const topViolators = await getDocs(
    query(
        collection(firestore, 'abuse_tracking'),
        orderBy('violationCount', 'desc'),
        limit(10)
    )
);

// Get currently banned users
const bannedUsers = await getDocs(
    query(
        collection(firestore, 'abuse_tracking'),
        where('penaltyLevel', '==', 'banned'),
        where('bannedUntil', '>', Date.now())
    )
);
```

---

## 🚀 Deployment Checklist

When implementing Phase 3:

- [ ] Create Firestore indexes for queries
- [ ] Test rate limiter with various scenarios
- [ ] Set up monitoring alerts
- [ ] Document admin procedures
- [ ] Train staff on abuse dashboard
- [ ] Create user appeal process
- [ ] Set up automated unbanning
- [ ] Monitor false positive rate
- [ ] Adjust limits based on data
- [ ] Create incident response plan

---

## 📞 Support & Maintenance

### When Users Complain

**"I'm blocked but I didn't do anything wrong!"**
1. Check abuse_tracking for their userId
2. Review violation history
3. Check if legitimate use triggered false positive
4. Manually reset if needed: `resetRateLimit(userId)`

### Adjusting Limits

Edit limits in rate-limiter.ts:
```typescript
const LIMITS = {
    MAX_COMMANDS_PER_MINUTE: 30,  // Increase if too strict
    MIN_COMMAND_INTERVAL_MS: 100, // Decrease to allow faster typing
    BAN_DURATION_MS: 3600000,     // Adjust ban duration
};
```

### False Positive Handling

If legitimate users are being blocked:
1. Lower violation thresholds
2. Whitelist trusted users
3. Implement reputation system
4. Add manual override in admin dashboard

---

## 📚 Additional Resources

- **Firestore Security Rules:** Update rules to allow rate_limits reads/writes
- **Cloud Functions:** Consider moving rate limiting to Cloud Functions for better performance
- **Redis Alternative:** For high-traffic apps, use Redis instead of Firestore
- **Analytics:** Integrate with Google Analytics to track abuse patterns

---

## ✅ Success Criteria

Phase 3 is successful if:
- ✅ Spam is reduced by >90%
- ✅ Legitimate users are not impacted
- ✅ Monthly costs stay under budget
- ✅ No false positive complaints
- ✅ Admin dashboard provides actionable insights

**Remember:** Only implement Phase 3 if abuse becomes a real problem. Current Phase 1 & 2 protections should handle most issues!
