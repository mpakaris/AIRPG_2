/**
 * INPUT PREPROCESSING
 *
 * Cleans and normalizes player input before AI interpretation.
 * Reduces AI costs and improves interpretation accuracy.
 */

/**
 * Preprocess raw player input before AI interpretation.
 * Removes filler words, normalizes whitespace, extracts core actions from questions.
 */
export function preprocessInput(raw: string): string {
  if (!raw) return '';

  let cleaned = raw.trim();

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove trailing punctuation (but preserve in middle of sentences)
  cleaned = cleaned.replace(/[?!.]+$/g, '');

  // Remove leading filler words
  const fillerPattern = /^(um+|uh+|like|so|well|okay|ok|hey|hi|hello)\s+/i;
  cleaned = cleaned.replace(fillerPattern, '');

  // Extract action from question patterns
  const questionPatterns = [
    { pattern: /^can i (.+)/i, extract: 1 },
    { pattern: /^could i (.+)/i, extract: 1 },
    { pattern: /^should i (.+)/i, extract: 1 },
    { pattern: /^how do i (.+)/i, extract: 1 },
    { pattern: /^where do i (.+)/i, extract: 1 },
    { pattern: /^what if i (.+)/i, extract: 1 },
    { pattern: /^is it possible to (.+)/i, extract: 1 },
    { pattern: /^may i (.+)/i, extract: 1 },
    { pattern: /^would it work to (.+)/i, extract: 1 },
  ];

  for (const { pattern, extract } of questionPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[extract]) {
      cleaned = match[extract];
      break;
    }
  }

  return cleaned.trim();
}

/**
 * Check if input is a help request (no AI needed).
 */
export function isHelpRequest(input: string): boolean {
  const normalized = input.toLowerCase().trim();

  const helpPatterns = [
    /^help$/,
    /^\/help$/,
    /^what (do|can) i do/,
    /^what are my options/,
    /^i'?m? (stuck|lost|confused)/,
    /^idk$/,
    /^i don'?t know/,
    /^how does this work/,
    /^what (is|are) the commands?/,
  ];

  return helpPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Check if input is empty or gibberish.
 */
export function isEmptyOrGibberish(input: string): boolean {
  if (!input || input.length < 2) return true;
  if (input.length > 500) return true; // Too long
  if (!/[a-z]/i.test(input)) return true; // No letters

  // Check for random keyboard mashing (mostly consonants)
  const vowelRatio = (input.match(/[aeiou]/gi) || []).length / input.length;
  if (vowelRatio < 0.1 && input.length > 5) return true;

  return false;
}

/**
 * Detect multiple commands in input (e.g., "take key and use it on safe").
 * Returns array of individual command strings.
 */
export function detectMultipleCommands(input: string): string[] {
  // Common command separators
  const separators = [
    ' and then ',
    ' then ',
    ', then ',
    ' and ',
    ', and ',
    ' after that ',
    ' next ',
    ';'
  ];

  let commands = [input];

  // Split on each separator
  for (const separator of separators) {
    commands = commands.flatMap(cmd => {
      // Case-insensitive split
      const regex = new RegExp(separator, 'i');
      return cmd.split(regex);
    });
  }

  // Clean and filter
  return commands
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

/**
 * Get a smart message for unclear/gibberish input.
 */
export function getGibberishMessage(input: string): string {
  if (input.length === 0) {
    return "I'm listening. What would you like to do?";
  }

  if (input.length > 500) {
    return "That's a lot to process. Try a shorter command like 'look', 'examine', or 'take'.";
  }

  return "I didn't quite catch that. Try commands like: look, examine, take, use, or type /help for more options.";
}
