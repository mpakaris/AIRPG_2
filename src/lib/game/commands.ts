
export const AVAILABLE_COMMANDS = [
  // Navigation
  'go <direction or location name>',
  'goto <object or npc>',
  'move to <object or npc>',
  'shift to <object or npc>',

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
