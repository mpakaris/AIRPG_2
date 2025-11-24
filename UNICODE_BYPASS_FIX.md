# Unicode Bypass Fix - Security Enhancement

## Issue Discovered

The unicode bypass attempt `\u003cscript\u003ealert('XSS')\u003c/script\u003e` **bypassed validation** and reached the AI processing layer, causing a temperature configuration error instead of being blocked.

### Root Cause

The Prompt Watch-Dog was checking for malicious patterns like `<script>` but **not decoding unicode escape sequences first**. This meant:

- `\u003cscript\u003e` (encoded) ≠ `<script>` (decoded)
- Pattern matching failed because it checked literal characters
- Encoded injection attempts passed through unchecked

## Security Fix Applied

### 1. Added Encoding Bypass Detection

**New Function: `decodeEncodingBypasses()`** (src/lib/security/prompt-watch-dog.ts:270-327)

Decodes multiple encoding schemes that could bypass validation:

#### Unicode Escape Sequences
```javascript
\u003cscript\u003e → <script>
\u0027DROP TABLE\u0027 → 'DROP TABLE'
```

#### Hex Escape Sequences
```javascript
\x3cscript\x3e → <script>
\x27 → '
```

#### HTML Entities
```javascript
&lt;script&gt; → <script>
&#60;script&#62; → <script>
&#x3c;script&#x3e; → <script>
```

#### URL Encoding
```javascript
%3Cscript%3E → <script>
%27DROP%20TABLE%27 → 'DROP TABLE'
```

#### Base64 Detection
```javascript
// Flags suspicious base64 sequences (20+ chars)
YWxlcnQoJ1hTUycpOw== → <base64-detected>YWxlcnQoJ1hTUycpOw==
```

### 2. Updated Validation Flow

**Before:**
1. Normalize input (remove emojis, whitespace)
2. Check patterns on normalized input
3. ❌ Encoded attacks pass through

**After:**
1. **Decode all encoding schemes first** (NEW)
2. Normalize decoded input
3. Check patterns on decoded input
4. ✅ Encoded attacks are caught

**Code Change** (src/lib/security/prompt-watch-dog.ts:428-433):
```typescript
// CRITICAL: Decode encoding bypasses FIRST (before any pattern matching)
let sanitized = decodeEncodingBypasses(input);

// Then normalize (clean up whitespace, emojis, etc.)
sanitized = normalizeInput(sanitized);

// THEN run pattern checks on decoded content
```

## Bonus Fix: Temperature Configuration Error

### Issue
The model `gpt-5-nano-2025-08-07` doesn't support custom temperature values - only default (1).

### Fix Applied

Made temperature parameter conditional based on model support:

**src/ai/flows/interpret-with-safety-net.ts:207-218**
```typescript
const model = 'gpt-5-nano-2025-08-07';
const supportsTemperature = !model.includes('gpt-5-nano');

const response = await openai.chat.completions.create({
  model: model,
  messages: [...],
  ...(supportsTemperature ? { temperature: 0.3 } : {}), // Conditional
  response_format: { type: 'json_object' },
});
```

**src/ai/local-llm-client.ts:69-78**
```typescript
const supportsTemperature = !finalConfig.model.includes('gpt-5-nano');

const requestBody = {
  model: finalConfig.model,
  messages,
  ...(supportsTemperature ? { temperature: 0.3 } : {}), // Conditional
  max_tokens: 500,
};
```

## Testing

### Test Cases That Now Get Blocked

All of these should now be caught by the Prompt Watch-Dog:

1. **Unicode Escape**
   ```
   \u003cscript\u003ealert('XSS')\u003c/script\u003e
   ```

2. **Hex Escape**
   ```
   \x3cscript\x3ealert('XSS')\x3c/script\x3e
   ```

3. **HTML Entities**
   ```
   &lt;script&gt;alert('XSS')&lt;/script&gt;
   ```

4. **URL Encoding**
   ```
   %3Cscript%3Ealert('XSS')%3C/script%3E
   ```

5. **Mixed Encoding**
   ```
   \u003cscript\u003ealert(\x27XSS\x27)\u003c/script\u003e
   ```

### Expected Behavior

For each test case:
- ✅ Input is **decoded** to reveal actual content
- ✅ Malicious patterns are **detected** in decoded content
- ✅ **Single consolidated error entry** is created in database
- ✅ **Red-highlighted error message** is shown to player
- ✅ Admin dashboard shows complete violation details

### Database Entry Structure

Each blocked attempt creates ONE entry:
```typescript
{
  type: 'validation_error',
  errorId: 'error_1234567890',
  timestamp: 1234567890,

  // What the player prompted (original encoded input)
  originalInput: "\\u003cscript\\u003ealert('XSS')\\u003c/script\\u003e",

  // What the system replied
  systemResponse: "Invalid characters detected. Use only letters, numbers...",

  // What the Watchdog filtered and why
  violations: [{
    type: 'CODE_INJECTION',
    severity: 'high',
    message: 'Invalid characters detected...'
  }],

  // Full context
  context: {
    userId: 'user_abc',
    gameId: 'game_123',
    chapterId: 'ch1',
    locationId: 'loc_office'
  },

  // UI display (single red message)
  uiMessages: [...]
}
```

## Files Modified

1. **src/lib/security/prompt-watch-dog.ts**
   - Added `decodeEncodingBypasses()` function (lines 270-327)
   - Updated validation flow to decode first (lines 428-433)

2. **src/ai/flows/interpret-with-safety-net.ts**
   - Made temperature conditional for gpt-5-nano (lines 207-218)

3. **src/ai/local-llm-client.ts**
   - Made temperature conditional for gpt-5-nano (lines 69-78)

## Security Impact

### Before Fix
- **Vulnerability**: Unicode/hex/HTML entity encoded injections bypassed validation
- **Risk**: XSS, SQL injection, prompt injection via encoded payloads
- **Exploitation**: Trivial - any attacker could encode malicious payloads

### After Fix
- **Protection**: All encoding schemes decoded before validation
- **Coverage**: Unicode, hex, HTML entities, URL encoding, base64
- **Defense Depth**: Multi-layer (decode → normalize → validate)

## Recommendations

### Additional Test Cases

Try these to verify the fix works:

1. **Double Encoding**
   ```
   %255Cu003cscript%255Cu003e
   ```

2. **Mixed Case Unicode**
   ```
   \U003Cscript\U003E
   ```

3. **Partial Encoding**
   ```
   <scr\u0069pt>alert('XSS')</script>
   ```

4. **Nested Encoding**
   ```
   \u0025\u0033\u0043script\u0025\u0033\u0045
   ```

### Future Enhancements

Consider adding:

1. **Double Decoding** - Decode multiple times to catch nested encoding
2. **Encoding Detection Logging** - Track which encoding schemes are being attempted
3. **Automatic Ban** - Auto-ban users who repeatedly try encoding bypasses
4. **Pattern Learning** - Use ML to detect novel encoding patterns
