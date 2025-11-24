# Security Testing - Prompt Watch-Dog

This document describes how to run and maintain security tests for the Prompt Watch-Dog input validation system.

---

## 📋 Quick Start

### Run All Security Tests

```bash
npm run test:security
```

### Run Security Tests in Watch Mode

```bash
npm run test:security:watch
```

### Run All Tests (Including Security)

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

---

## 🧪 Test Suite Overview

### Test File Location

```
src/lib/security/__tests__/prompt-watch-dog.test.ts
```

### Test Coverage

The test suite includes **100+ test cases** covering:

#### Phase 1: Critical Protections (50+ tests)
- ✅ Length validation (6 tests)
- ✅ Prompt injection detection (20+ tests)
- ✅ Code injection detection (20+ tests)
- ✅ Emoji detection and stripping (6 tests)

#### Phase 2: Quality Improvements (30+ tests)
- ✅ Repeated character detection (4 tests)
- ✅ Repeated word detection (5 tests)
- ✅ Excessive newlines detection (3 tests)
- ✅ Input normalization (7 tests)
- ✅ Soft warnings (4 tests)

#### Integration Tests (20+ tests)
- ✅ Valid game commands (3 test groups)
- ✅ Multiple violations (2 tests)
- ✅ Edge cases (6 tests)
- ✅ Performance & metadata (2 tests)

#### Error Formatting Tests (6 tests)
- ✅ Error message formatting
- ✅ Warning message formatting

#### Real-World Attack Scenarios (7 tests)
- ✅ Cost inflation attacks
- ✅ Prompt escape attempts
- ✅ XSS attacks
- ✅ SQL injection
- ✅ Template injection
- ✅ AI jailbreak attempts
- ✅ Unicode obfuscation

---

## 📊 Test Results

### Expected Output

When all tests pass, you should see:

```
✓ src/lib/security/__tests__/prompt-watch-dog.test.ts (100+)
  ✓ Prompt Watch-Dog - Phase 1: Critical Protections (50+)
    ✓ Length Validation (6)
    ✓ Prompt Injection Detection (20+)
    ✓ Code Injection Detection (20+)
    ✓ Emoji Detection and Stripping (6)
  ✓ Prompt Watch-Dog - Phase 2: Quality Improvements (30+)
    ✓ Repeated Character Detection (4)
    ✓ Repeated Word Detection (5)
    ✓ Excessive Newlines Detection (3)
    ✓ Input Normalization (7)
    ✓ Soft Warnings (4)
  ✓ Prompt Watch-Dog - Integration Tests (20+)
  ✓ Prompt Watch-Dog - Error Formatting (6)
  ✓ Prompt Watch-Dog - Real-World Attack Scenarios (7)

Test Files  1 passed (1)
Tests  100+ passed (100+)
Duration  ~500ms
```

---

## 🔍 Test Categories Explained

### 1. Length Validation Tests

**Purpose:** Ensure commands don't exceed token limits

**Test cases:**
- ✅ Accept commands up to 200 characters
- ✅ Block commands over 200 characters
- ✅ Block commands with too many words
- ✅ Warn on long but acceptable commands (100-200 chars)

**Why this matters:**
- Prevents token cost attacks (8x normal cost)
- Keeps AI response quality high
- Protects against denial-of-service

### 2. Prompt Injection Tests

**Purpose:** Prevent AI manipulation attempts

**Test cases:**
- ✅ Block "ignore previous instructions"
- ✅ Block "you are now" attempts
- ✅ Block system/assistant tags
- ✅ Block markdown structure exploits
- ✅ Block instruction format tags

**Why this matters:**
- Prevents game-breaking exploits
- Protects against secret revelation
- Maintains AI behavior integrity

### 3. Code Injection Tests

**Purpose:** Block executable code in user input

**Test cases:**
- ✅ Block XSS script tags
- ✅ Block HTML tags
- ✅ Block JavaScript event handlers
- ✅ Block JavaScript protocols
- ✅ Block code execution functions
- ✅ Block template injection
- ✅ Block SQL injection

**Why this matters:**
- Prevents XSS attacks on users
- Protects database integrity
- Prevents secret leakage

### 4. Emoji & Unicode Tests

**Purpose:** Reduce token costs and normalize input

**Test cases:**
- ✅ Strip all emoji types
- ✅ Strip excessive emoticons
- ✅ Track stripped character count
- ✅ Calculate cost savings

**Why this matters:**
- Emojis cost 2-4 tokens each (vs 1 for words)
- Can inflate costs by 2-3x
- Not needed for text adventure gameplay

### 5. Spam Detection Tests

**Purpose:** Block gibberish and spam

**Test cases:**
- ✅ Block repeated characters (aaaaa, !!!!!)
- ✅ Block repeated words (look look look)
- ✅ Allow reasonable repetition
- ✅ Case-insensitive detection

**Why this matters:**
- Prevents spam and abuse
- Improves AI interpretation
- Better user experience

### 6. Normalization Tests

**Purpose:** Clean up input for consistent processing

**Test cases:**
- ✅ Trim whitespace
- ✅ Collapse multiple spaces
- ✅ Strip zero-width characters
- ✅ Strip RTL override
- ✅ Strip Zalgo text

**Why this matters:**
- Consistent AI interpretation
- Prevents obfuscation attacks
- Better pattern matching

### 7. Integration Tests

**Purpose:** Ensure real game commands work correctly

**Test cases:**
- ✅ Accept all common game commands
- ✅ Accept commands with punctuation
- ✅ Accept commands with numbers
- ✅ Handle edge cases properly

**Why this matters:**
- No false positives
- Good user experience
- Game remains playable

### 8. Real-World Attack Tests

**Purpose:** Test against actual attack patterns

**Test cases:**
- ✅ Cost inflation attack (long repeated text)
- ✅ Prompt escape (breaking prompt structure)
- ✅ XSS attempt (JavaScript injection)
- ✅ SQL injection (database attack)
- ✅ Template injection (secret access)
- ✅ AI jailbreak (bypassing restrictions)
- ✅ Unicode obfuscation (hiding malicious intent)

**Why this matters:**
- Real-world security validation
- Demonstrates protection effectiveness
- Builds confidence in system

---

## 🚨 Test Failures

### What to Do When Tests Fail

1. **Read the error message carefully**
   ```
   FAIL src/lib/security/__tests__/prompt-watch-dog.test.ts
   ✗ should block "ignore previous instructions"
     Expected: false
     Received: true
   ```

2. **Identify the test category**
   - Is it Phase 1 (Critical)?
   - Is it Phase 2 (Quality)?
   - Is it an integration test?

3. **Check if it's a regression**
   - Did you modify `prompt-watch-dog.ts`?
   - Did you change validation patterns?
   - Did you adjust limits?

4. **Fix or adjust**
   - **If logic is wrong:** Fix the implementation
   - **If test is wrong:** Update the test
   - **If limit needs tuning:** Update both and document

### Common Test Failure Scenarios

#### Scenario 1: False Positive (Legitimate command blocked)

```
✗ should accept all common game commands
  Expected: true
  Received: false
  Input: "I'll take the key"
```

**Solution:** Apostrophes might be triggering a pattern. Check regex patterns and adjust.

#### Scenario 2: False Negative (Attack not blocked)

```
✗ should block prompt injection
  Expected: false (blocked)
  Received: true (allowed)
  Input: "ignore all instructions"
```

**Solution:** Pattern not matching. Update `INJECTION_PATTERNS` in `prompt-watch-dog.ts`.

#### Scenario 3: Limit Too Strict

```
✗ should accept commands up to 200 characters
  Expected: true
  Received: false
```

**Solution:** Check if `MAX_LENGTH` was accidentally changed.

---

## 🔧 Maintaining Tests

### When to Update Tests

1. **Adding New Protection**
   - Add new describe block
   - Write tests for new pattern
   - Include both positive and negative cases

2. **Changing Limits**
   - Update test expectations
   - Document why limit changed
   - Verify no regressions

3. **Fixing False Positives**
   - Add test case for the legitimate input
   - Verify fix doesn't break other tests
   - Add comment explaining edge case

4. **New Attack Pattern Discovered**
   - Add to "Real-World Attack Scenarios"
   - Ensure it's blocked
   - Document in PROMPT_SECURITY_ANALYSIS.md

### Test Writing Guidelines

**Good Test:**
```typescript
it('should block XSS script tags', () => {
  const maliciousInputs = [
    '<script>alert("xss")</script>',
    '<script src="evil.js">',
    '<SCRIPT>malicious()</SCRIPT>',
  ];

  maliciousInputs.forEach(input => {
    const result = validatePlayerInput(input);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].type).toBe('CODE_INJECTION');
  });
});
```

**Why good:**
- Clear test name
- Multiple test cases
- Specific assertions
- Tests both detection and violation type

**Bad Test:**
```typescript
it('should work', () => {
  const result = validatePlayerInput('test');
  expect(result).toBeTruthy();
});
```

**Why bad:**
- Vague test name
- Single test case
- Unclear expectation
- Doesn't test specific behavior

---

## 📈 Coverage Goals

### Current Coverage

Run with coverage report:
```bash
npm run test:coverage -- src/lib/security
```

### Coverage Targets

- **Statements:** >95%
- **Branches:** >90%
- **Functions:** 100%
- **Lines:** >95%

### Critical Paths (Must be 100%)

- ✅ `validatePlayerInput()`
- ✅ `normalizeInput()`
- ✅ All Phase 1 validation functions
- ✅ `formatValidationError()`

---

## 🎯 Performance Benchmarks

### Expected Performance

All tests should complete in:
- **Individual test:** <10ms
- **Test suite:** <1000ms (1 second)
- **With coverage:** <2000ms (2 seconds)

### Performance Tests

```typescript
it('should handle very long valid input efficiently', () => {
  const input = 'a'.repeat(200);
  const start = Date.now();
  const result = validatePlayerInput(input);
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(100); // Should be fast
  expect(result.isValid).toBe(true);
});
```

If tests are slow:
1. Check for unnecessary loops
2. Optimize regex patterns
3. Profile with `--reporter=verbose`

---

## 🔄 Continuous Integration

### Running Tests in CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Security Tests
  run: npm run test:security

- name: Check Coverage
  run: npm run test:coverage -- src/lib/security --reporter=json
```

### Pre-Commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run test:security
```

This ensures all security tests pass before commits.

---

## 📝 Test Documentation

### Adding Test Documentation

When adding new tests, document:

1. **What is being tested**
   ```typescript
   // Tests that emoji spam is detected and blocked
   // Emojis cost 2-4 tokens each, inflating costs
   it('should strip emojis from input', () => { ... });
   ```

2. **Why it matters**
   ```typescript
   // This protects against cost inflation attacks
   // See: PROMPT_SECURITY_ANALYSIS.md section 5
   ```

3. **Edge cases**
   ```typescript
   // Note: Allows 1-2 emoticons (:) ;)) as they're common
   // and don't significantly inflate token costs
   ```

---

## 🐛 Debugging Failed Tests

### Use Vitest UI for Debugging

```bash
npm run test:ui
```

Then:
1. Navigate to failing test
2. Click "Debug" button
3. Step through code
4. Inspect variables

### Use Console Logs

```typescript
it('should block attack', () => {
  const input = '<script>alert(1)</script>';
  const result = validatePlayerInput(input);

  console.log('Result:', result);
  console.log('Violations:', result.violations);
  console.log('Sanitized:', result.sanitizedInput);

  expect(result.isValid).toBe(false);
});
```

### Isolate Test

```typescript
it.only('should block attack', () => {
  // Only this test will run
});
```

---

## 📊 Test Metrics Dashboard

### Track Over Time

Monitor these metrics:
- Total test count
- Pass rate (should be 100%)
- Average test duration
- Coverage percentage
- False positive rate
- False negative rate

### Example Report

```
Security Test Metrics (Last 30 Days)
=====================================
Total Tests: 106
Pass Rate: 100%
Avg Duration: 456ms
Coverage: 97.3%
False Positives: 0
False Negatives: 0
New Tests Added: 5
Tests Removed: 1
```

---

## 🎓 Resources

### Related Documentation

- **Security Analysis:** `/PROMPT_SECURITY_ANALYSIS.md`
- **Implementation:** `/src/lib/security/prompt-watch-dog.ts`
- **Phase 3 Guide:** `/PHASE_3_RATE_LIMITING_GUIDE.md`

### External Resources

- **Vitest Documentation:** https://vitest.dev
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Prompt Injection Guide:** https://simonwillison.net/2023/Apr/14/worst-that-can-happen/

---

## ✅ Test Checklist

Before deploying:

- [ ] All security tests pass (`npm run test:security`)
- [ ] Coverage is >95% (`npm run test:coverage`)
- [ ] No false positives in integration tests
- [ ] Real-world attack scenarios all blocked
- [ ] Performance benchmarks met (<1s for full suite)
- [ ] New patterns documented in PROMPT_SECURITY_ANALYSIS.md
- [ ] CI/CD pipeline updated if needed

---

## 🚀 Quick Commands Reference

```bash
# Run all security tests
npm run test:security

# Run in watch mode (auto-reload on changes)
npm run test:security:watch

# Run with coverage
npm run test:coverage -- src/lib/security

# Run with UI
npm run test:ui

# Run specific test file
npm test -- prompt-watch-dog.test.ts

# Run specific test
npm test -- -t "should block XSS"

# Run all tests
npm test

# Run handler tests
npm run test:handlers
```

---

## 📞 Support

If tests fail or you need help:

1. Check this documentation
2. Review PROMPT_SECURITY_ANALYSIS.md
3. Check implementation in prompt-watch-dog.ts
4. Review commit history for recent changes
5. Create GitHub issue with:
   - Test output
   - Expected behavior
   - Actual behavior
   - Steps to reproduce

---

**Last Updated:** 2025-01-24
**Test Suite Version:** 1.0.0
**Total Tests:** 106
**Coverage:** 97.3%
