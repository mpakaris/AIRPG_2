
export const AVAILABLE_COMMANDS = [
  // Navigation
  'go <location or object name>',

  // Examination
  'examine <object or item>',
  'look at <object or item>',
  'look around',
  'look behind <object>',

  // Interaction (Objects)
  'open <object>',
  'close <object>',
  'move <object>',
  'search <object>',
  'break <object>',
  'smash <object>',

  // Interaction (Items)
  'take <item>',
  'pick up <item>',
  'grab <item>',
  'drop <item>',
  'discard <item>',
  'use <item>',
  'use <item> on <object>',
  'combine <item> with <item>',
  'read <item>',

  // NPCs
  'talk to <npc>',

  // Phone/Communication
  'call <phone number>',
  'dial <phone number>',
  'call <phone number> on <device>',
  'dial <phone number> with <device>',

  // System
  'inventory',
  'help',
  '/map',  // Show map of current chapter
  '/password <phrase or PIN>',  // Explicit password command (when focused on locked object)
  'password for <object> "<phrase>"',
  'say "<phrase>" to <object>',
  'say "<phrase>"',
  'enter "<phrase>" for <object>',
  'enter "<phrase>"',
  'exit',
  'goodbye',
  'invalid',
];
