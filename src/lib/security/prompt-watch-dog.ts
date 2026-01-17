/**
 * Prompt Watch-Dog - Input Validation & Security
 *
 * Protects against:
 * - Cost attacks (excessive token usage from long inputs)
 * - Prompt injection (AI manipulation attempts)
 * - Code injection (XSS, SQL, template injection)
 * - Spam (repeated characters, emoji spam)
 *
 * See: /PROMPT_SECURITY_ANALYSIS.md for full threat analysis
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const LIMITS = {
    // Phase 1: Critical Protections
    MAX_LENGTH: 200,              // Maximum characters allowed
    MAX_WORDS: 30,                // Maximum words (~6-7 chars per word)

    // Phase 2: Quality Improvements
    MAX_REPEATED_CHAR: 4,         // Max same character in a row (e.g., "!!!!")
    MAX_REPEATED_WORD: 2,         // Max same word repeated (e.g., "look look")
    MAX_NEWLINES: 1,              // Maximum line breaks allowed

    // Soft limits (warn but don't block)
    SOFT_LENGTH_WARNING: 100,     // Warn if over 100 chars (most commands < 100)
    LONG_WORD_LENGTH: 20,         // Warn if single word > 20 chars (likely typo)

    // Phase 3: Rate Limiting (NOT IMPLEMENTED YET - see documentation)
    // MAX_COMMANDS_PER_MINUTE: 30,
    // MIN_COMMAND_INTERVAL_MS: 100,
};

// Phase 1: Prompt Injection Patterns
const INJECTION_PATTERNS = [
    /ignore\s+(previous|prior|above|all)\s+(instruction|command|prompt)/i,
    /ignore\s+everything/i,
    /you\s+are\s+now/i,
    /act\s+as\s+(if|though)/i,
    /pretend\s+(to\s+be|you\s+are)/i,
    /new\s+instructions?:/i,
    /system\s*:/i,
    /<system>/i,
    /assistant\s*:/i,
    /<assistant>/i,
    /human\s*:/i,
    /<human>/i,
    /user\s*:/i,
    /<user>/i,
    /###\s*\w+/,                   // Markdown headers (could break prompt structure)
    /---+/,                         // Horizontal rules (prompt separators)
    /\[INST\]/i,                   // Llama instruction tags
    /\[\/INST\]/i,
    /<\|im_start\|>/i,            // ChatML tags
    /<\|im_end\|>/i,
];

// Phase 1: Code Injection Patterns
const CODE_INJECTION_PATTERNS = [
    /<script[\s>]/i,               // XSS: <script> tags
    /<\/\w+>/,                     // HTML closing tags
    /<iframe/i,                    // Embedded iframes
    /<object/i,                    // Embedded objects
    /<embed/i,                     // Embedded content
    /javascript:/i,                // JS protocol
    /on\w+\s*=/i,                  // Event handlers (onclick, onerror, etc.)
    /\b(eval|Function|require)\s*\(/i,  // Code execution
    /\$\{.+\}/,                    // Template literals
    /\{\{.+\}\}/,                  // Template syntax (Handlebars, etc.)
    /\{%.+%\}/,                    // Template syntax (Jinja, Liquid)
    /\b(DROP|DELETE)\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW)/i,  // SQL injection (more specific)
    /\b(UPDATE|INSERT|ALTER|EXEC|UNION)\s+/i,  // SQL keywords (excluding DROP/DELETE to avoid false positives)
    /['"];?\s*(DROP|DELETE)\s+(TABLE|DATABASE)/i,  // SQL injection attempts
];

// Phase 2: Emoji & Special Unicode
const EMOJI_PATTERN = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
const EMOTICON_PATTERN = /[:\-;=][)(\[\]{}DPpOo|\\\/]/g;  // :) :( :-D etc.
const ZALGO_PATTERN = /[\u0300-\u036F\u0489]{3,}/g;      // Combining diacritics (Zalgo text)
const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;     // Zero-width spaces
const RTL_OVERRIDE_PATTERN = /[\u202A-\u202E]/g;         // Right-to-left override

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    sanitizedInput: string;
    violations: ValidationViolation[];
    warnings: ValidationWarning[];
    metadata: {
        originalLength: number;
        sanitizedLength: number;
        strippedChars: number;
    };
}

export interface ValidationViolation {
    type: ViolationType;
    message: string;
    severity: 'critical' | 'high' | 'medium';
}

export interface ValidationWarning {
    type: string;
    message: string;
}

export type ViolationType =
    | 'TOO_LONG'
    | 'TOO_MANY_WORDS'
    | 'PROMPT_INJECTION'
    | 'CODE_INJECTION'
    | 'REPEATED_CHARS'
    | 'REPEATED_WORDS'
    | 'EXCESSIVE_NEWLINES'
    | 'EMOJI_SPAM'
    | 'INVALID_CHARACTERS';

// ============================================================================
// PHASE 1: CRITICAL PROTECTIONS
// ============================================================================

/**
 * Phase 1.1: Length Validation
 * Protects against excessive token usage from long inputs
 */
function validateLength(input: string): ValidationViolation | null {
    if (input.length > LIMITS.MAX_LENGTH) {
        return {
            type: 'TOO_LONG',
            severity: 'critical',
            message: `That command is too long! Keep it under ${LIMITS.MAX_LENGTH} characters. (Example: 'examine the door')`,
        };
    }

    const wordCount = input.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > LIMITS.MAX_WORDS) {
        return {
            type: 'TOO_MANY_WORDS',
            severity: 'critical',
            message: `That command has too many words! Keep it under ${LIMITS.MAX_WORDS} words. Try to be more concise.`,
        };
    }

    return null;
}

/**
 * Phase 1.2: Prompt Injection Detection
 * Protects against AI manipulation attempts
 */
function detectPromptInjection(input: string): ValidationViolation | null {
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return {
                type: 'PROMPT_INJECTION',
                severity: 'critical',
                message: "That doesn't look like a valid game command. Try simpler instructions like 'look around' or 'examine door'.",
            };
        }
    }
    return null;
}

/**
 * Phase 1.3: Code Injection Detection
 * Protects against XSS, SQL, and template injection
 */
function detectCodeInjection(input: string): ValidationViolation | null {
    for (const pattern of CODE_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return {
                type: 'CODE_INJECTION',
                severity: 'high',
                message: "Invalid characters detected. Use only letters, numbers, and basic punctuation (.,!?'\"-()).",
            };
        }
    }
    return null;
}

/**
 * Phase 1.4: Emoji Detection
 * Emojis inflate token count (2-4 tokens each vs 1 for words)
 */
function detectEmojiSpam(input: string): ValidationViolation | null {
    const emojiCount = (input.match(EMOJI_PATTERN) || []).length;
    const emoticonCount = (input.match(EMOTICON_PATTERN) || []).length;

    if (emojiCount > 0 || emoticonCount > 2) {
        return {
            type: 'EMOJI_SPAM',
            severity: 'medium',
            message: "Please use text only - emojis aren't supported in this game.",
        };
    }
    return null;
}

// ============================================================================
// PHASE 2: QUALITY IMPROVEMENTS
// ============================================================================

/**
 * Phase 2.1: Repeated Character Detection
 * Blocks spam like "aaaaa" or "!!!!!!!!"
 */
function detectRepeatedChars(input: string): ValidationViolation | null {
    const repeatedCharPattern = new RegExp(`(.)\\1{${LIMITS.MAX_REPEATED_CHAR},}`, 'g');
    if (repeatedCharPattern.test(input)) {
        return {
            type: 'REPEATED_CHARS',
            severity: 'medium',
            message: "That looks like gibberish! Try a real command like 'look around' or 'help'.",
        };
    }
    return null;
}

/**
 * Phase 2.2: Repeated Word Detection
 * Blocks spam like "look look look look"
 */
function detectRepeatedWords(input: string): ValidationViolation | null {
    const words = input.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();

    for (const word of words) {
        if (word.length < 3) continue; // Skip short words (a, to, in, etc.)
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    for (const [word, count] of wordCounts.entries()) {
        if (count > LIMITS.MAX_REPEATED_WORD) {
            return {
                type: 'REPEATED_WORDS',
                severity: 'medium',
                message: `You repeated "${word}" too many times. Try a different command.`,
            };
        }
    }

    return null;
}

/**
 * Phase 2.3: Excessive Newlines Detection
 * Multiple newlines could be injection attempts or just messy input
 */
function detectExcessiveNewlines(input: string): ValidationViolation | null {
    const newlineCount = (input.match(/\n/g) || []).length;
    if (newlineCount > LIMITS.MAX_NEWLINES) {
        return {
            type: 'EXCESSIVE_NEWLINES',
            severity: 'medium',
            message: "Please keep your command on one line.",
        };
    }
    return null;
}

/**
 * Phase 2.4a: Decode Encoding Bypasses
 * Decode various encoding schemes that could be used to bypass validation
 * This must run BEFORE pattern matching to catch encoded injection attempts
 */
function decodeEncodingBypasses(input: string): string {
    let decoded = input;

    // 1. Unicode escape sequences (\u003c → <, \u003e → >)
    // This catches attempts like: \u003cscript\u003e
    decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });

    // 2. Hex escape sequences (\x3c → <)
    decoded = decoded.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });

    // 3. HTML entities (&lt; → <, &#60; → <, &#x3c; → <)
    decoded = decoded.replace(/&([a-z]+|#\d+|#x[0-9a-fA-F]+);/gi, (match) => {
        const entities: Record<string, string> = {
            'lt': '<',
            'gt': '>',
            'amp': '&',
            'quot': '"',
            'apos': "'",
            'script': 'script', // Decode named entity
        };

        const lower = match.toLowerCase();
        if (lower in entities) return entities[lower];

        // Numeric entities (&#60; or &#x3c;)
        if (match.startsWith('&#x')) {
            const hex = match.slice(3, -1);
            return String.fromCharCode(parseInt(hex, 16));
        } else if (match.startsWith('&#')) {
            const dec = match.slice(2, -1);
            return String.fromCharCode(parseInt(dec, 10));
        }

        return match;
    });

    // 4. URL encoding (%3C → <, %3E → >)
    try {
        decoded = decodeURIComponent(decoded);
    } catch (e) {
        // If decoding fails, continue with current decoded value
    }

    // 5. Base64 detection (not decoding, but flagging)
    // Pattern: sequences that look like base64 (long alphanumeric strings with +/= padding)
    // We'll just flag this as suspicious, not decode it
    const base64Pattern = /^[A-Za-z0-9+/]{20,}={0,2}$/;
    if (base64Pattern.test(decoded.trim())) {
        // Flag by adding a marker that will be caught by code injection detection
        decoded = '<base64-detected>' + decoded;
    }

    return decoded;
}

/**
 * Phase 2.4b: Input Normalization
 * Clean up whitespace and unicode issues
 */
function normalizeInput(input: string): string {
    let normalized = input;

    // Trim leading/trailing whitespace
    normalized = normalized.trim();

    // Strip emojis and emoticons
    normalized = normalized.replace(EMOJI_PATTERN, '');
    normalized = normalized.replace(EMOTICON_PATTERN, '');

    // Strip Zalgo text and combining characters
    normalized = normalized.replace(ZALGO_PATTERN, '');

    // Strip zero-width characters
    normalized = normalized.replace(ZERO_WIDTH_PATTERN, '');

    // Strip RTL override characters
    normalized = normalized.replace(RTL_OVERRIDE_PATTERN, '');

    // Normalize whitespace (multiple spaces → single space)
    normalized = normalized.replace(/\s+/g, ' ');

    // Remove multiple newlines
    normalized = normalized.replace(/\n{2,}/g, '\n');

    // Trim again after normalization
    normalized = normalized.trim();

    return normalized;
}

// ============================================================================
// PHASE 2: SOFT WARNINGS (Don't block, just warn)
// ============================================================================

function checkSoftWarnings(input: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Warn if command is getting long
    if (input.length > LIMITS.SOFT_LENGTH_WARNING) {
        warnings.push({
            type: 'LENGTH_WARNING',
            message: `That's a long command (${input.length} chars). Try to be more concise for better results.`,
        });
    }

    // Warn if command has a very long word (likely typo)
    const words = input.split(/\s+/);
    for (const word of words) {
        if (word.length > LIMITS.LONG_WORD_LENGTH) {
            warnings.push({
                type: 'LONG_WORD',
                message: `"${word}" seems unusually long. Is it spelled correctly?`,
            });
            break; // Only warn once
        }
    }

    // Warn if mostly uppercase (shouting)
    const uppercaseCount = (input.match(/[A-Z]/g) || []).length;
    const letterCount = (input.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 10 && uppercaseCount / letterCount > 0.7) {
        warnings.push({
            type: 'ALL_CAPS',
            message: "No need to shout! Lowercase works just fine.",
        });
    }

    return warnings;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Prompt Watch-Dog - Main Validation
 *
 * Validates and sanitizes user input before sending to AI.
 *
 * @param input - Raw user input
 * @returns ValidationResult with sanitized input and any violations
 */
export function validatePlayerInput(input: string): ValidationResult {
    const originalLength = input.length;
    const violations: ValidationViolation[] = [];
    const warnings: ValidationWarning[] = [];

    // Detect emojis and newlines BEFORE normalization (on original input)
    const emojiViolation = detectEmojiSpam(input);
    if (emojiViolation) violations.push(emojiViolation);

    const newlineViolation = detectExcessiveNewlines(input);
    if (newlineViolation) violations.push(newlineViolation);

    // CRITICAL: Decode encoding bypasses FIRST (before any pattern matching)
    // This catches unicode escapes, HTML entities, URL encoding, etc.
    let sanitized = decodeEncodingBypasses(input);

    // Then normalize (clean up whitespace, emojis, etc.)
    sanitized = normalizeInput(sanitized);

    // PHASE 1: Critical Security Checks (Block if violated)

    const lengthViolation = validateLength(sanitized);
    if (lengthViolation) violations.push(lengthViolation);

    const injectionViolation = detectPromptInjection(sanitized);
    if (injectionViolation) violations.push(injectionViolation);

    const codeViolation = detectCodeInjection(sanitized);
    if (codeViolation) violations.push(codeViolation);

    // PHASE 2: Quality Checks (Block spam)

    const repeatedCharViolation = detectRepeatedChars(sanitized);
    if (repeatedCharViolation) violations.push(repeatedCharViolation);

    const repeatedWordViolation = detectRepeatedWords(sanitized);
    if (repeatedWordViolation) violations.push(repeatedWordViolation);

    // PHASE 2: Soft Warnings (Don't block)
    const softWarnings = checkSoftWarnings(sanitized);
    warnings.push(...softWarnings);

    // Final normalization after all checks
    sanitized = normalizeInput(sanitized);

    // Check if input is now empty after sanitization
    if (sanitized.length === 0 && violations.length === 0) {
        violations.push({
            type: 'INVALID_CHARACTERS',
            severity: 'high',
            message: "Your command contained only invalid characters. Please use regular text.",
        });
    }

    const sanitizedLength = sanitized.length;
    const strippedChars = originalLength - sanitizedLength;

    return {
        isValid: violations.length === 0,
        sanitizedInput: sanitized,
        violations,
        warnings,
        metadata: {
            originalLength,
            sanitizedLength,
            strippedChars,
        },
    };
}

// ============================================================================
// PHASE 3: FUTURE ENHANCEMENTS (NOT YET IMPLEMENTED)
// ============================================================================

/**
 * PHASE 3 - RATE LIMITING & ABUSE PREVENTION
 *
 * To be implemented when/if abuse becomes an issue.
 *
 * Features to add:
 *
 * 1. **Rate Limiting Per User**
 *    - Track commands per user per minute
 *    - Block if > 30 commands/min (2 per second)
 *    - Implement exponential backoff for repeat offenders
 *
 *    Implementation:
 *    ```typescript
 *    interface RateLimitState {
 *        userId: string;
 *        commandTimestamps: number[];
 *        blockedUntil?: number;
 *    }
 *
 *    function checkRateLimit(userId: string): boolean {
 *        const now = Date.now();
 *        const userState = getRateLimitState(userId);
 *
 *        // Remove timestamps older than 1 minute
 *        userState.commandTimestamps = userState.commandTimestamps.filter(
 *            ts => now - ts < 60000
 *        );
 *
 *        // Check if blocked
 *        if (userState.blockedUntil && now < userState.blockedUntil) {
 *            return false; // Still blocked
 *        }
 *
 *        // Check rate limit
 *        if (userState.commandTimestamps.length >= LIMITS.MAX_COMMANDS_PER_MINUTE) {
 *            userState.blockedUntil = now + 60000; // Block for 1 minute
 *            return false;
 *        }
 *
 *        // Add current timestamp
 *        userState.commandTimestamps.push(now);
 *        saveRateLimitState(userId, userState);
 *        return true;
 *    }
 *    ```
 *
 * 2. **Minimum Command Interval**
 *    - Require 100ms between commands (prevent script spam)
 *    - Track last command timestamp per user
 *
 * 3. **Per-User Abuse Tracking**
 *    - Track violation counts per user
 *    - Implement progressive penalties:
 *      - 1-3 violations: Warning messages
 *      - 4-10 violations: Temporary slowdown (5 sec cooldown)
 *      - 10+ violations: Temporary ban (1 hour)
 *
 *    Implementation:
 *    ```typescript
 *    interface AbuseTracker {
 *        userId: string;
 *        violationCount: number;
 *        lastViolation: number;
 *        penaltyLevel: 'none' | 'warning' | 'slowdown' | 'banned';
 *        bannedUntil?: number;
 *    }
 *
 *    function updateAbuseTracker(userId: string, violation: ValidationViolation) {
 *        const tracker = getAbuseTracker(userId);
 *        tracker.violationCount++;
 *        tracker.lastViolation = Date.now();
 *
 *        // Progressive penalties
 *        if (tracker.violationCount >= 10) {
 *            tracker.penaltyLevel = 'banned';
 *            tracker.bannedUntil = Date.now() + 3600000; // 1 hour
 *        } else if (tracker.violationCount >= 4) {
 *            tracker.penaltyLevel = 'slowdown';
 *        } else {
 *            tracker.penaltyLevel = 'warning';
 *        }
 *
 *        saveAbuseTracker(userId, tracker);
 *    }
 *    ```
 *
 * 4. **Adaptive Limits Based on User Behavior**
 *    - Trusted users (no violations for 7 days) get higher limits
 *    - New users get stricter limits initially
 *    - Premium users (if applicable) get more lenient limits
 *
 * 5. **IP-Based Rate Limiting**
 *    - Track commands per IP address
 *    - Prevent multiple accounts from same IP spamming
 *    - Useful for detecting coordinated attacks
 *
 * 6. **Admin Dashboard Integration**
 *    - Show real-time validation metrics
 *    - Alert on unusual patterns (sudden spike in violations)
 *    - Allow admins to manually ban/unban users
 *    - View per-user violation history
 *
 * 7. **Honeypot Detection**
 *    - Add hidden fields to form (bots will fill them)
 *    - Track users who submit with honeypot filled
 *    - Auto-ban suspected bots
 *
 * Storage Requirements for Phase 3:
 * - Add `rate_limits` collection in Firestore
 * - Add `abuse_tracking` collection in Firestore
 * - Add `banned_users` collection with expiry timestamps
 * - Consider Redis cache for real-time rate limiting
 *
 * Metrics to Track:
 * - Commands per minute (per user, per IP, globally)
 * - Violation rate (% of commands blocked)
 * - False positive rate (legitimate commands blocked)
 * - Most common violation types
 * - Peak usage times
 *
 * When to Implement Phase 3:
 * ✅ Implement if you see:
 *    - Users spamming >10 commands/sec
 *    - Same user repeatedly triggering violations
 *    - Coordinated attacks from multiple accounts
 *    - Monthly costs exceed $50 due to abuse
 *
 * ❌ Don't implement if:
 *    - User base is small (<100 active users)
 *    - No abuse patterns detected
 *    - Costs are under control
 *    - Phase 1 & 2 are handling issues well
 */

// ============================================================================
// UTILITY: Format Validation Error for User Display
// ============================================================================

/**
 * Format validation result into a user-friendly error message
 */
export function formatValidationError(result: ValidationResult): string {
    if (result.isValid) return '';

    // Show the most severe violation
    const critical = result.violations.find(v => v.severity === 'critical');
    const high = result.violations.find(v => v.severity === 'high');
    const medium = result.violations.find(v => v.severity === 'medium');

    const primaryViolation = critical || high || medium;

    if (!primaryViolation) return 'Invalid command. Please try again.';

    return primaryViolation.message;
}

/**
 * Get all warning messages (for display to user)
 */
export function formatWarnings(result: ValidationResult): string[] {
    return result.warnings.map(w => w.message);
}
