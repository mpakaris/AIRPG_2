# Photography System 📸

## Overview

The Photography System allows players to take photos of objects and NPCs using camera devices (like the phone). This creates a more realistic and immersive experience where not everything can be physically taken.

## Features

✅ **Camera Devices** - Items with camera capability (phone, camera)
✅ **Photographable Entities** - Objects/NPCs that can be photographed
✅ **Auto-Generated Photos** - Dynamic creation of photo items
✅ **Media Preservation** - Photos reuse original entity's media
✅ **Duplicate Prevention** - Can't photograph same thing twice
✅ **Auto-Exit Phone Mode** - Phone mode closes automatically after photo
✅ **Auto-End Conversations** - Active conversations end after taking photo

## How It Works

### 1. Define Camera Device

Add `isCamera: true` to item capabilities:

```typescript
capabilities: {
  isTakable: false,
  isUsable: true,
  isCamera: true,  // ✅ Enables photography
  // ...
}
```

**Example:** Player Phone

```typescript
'item_player_phone': {
  capabilities: {
    isCamera: true  // Can take photos
  }
}
```

### 2. Define Photographable Object

Add `photographable: true` to GameObject capabilities:

```typescript
capabilities: {
  readable: true,
  takable: false,     // Can't take it physically
  photographable: true  // ✅ Can photograph it
}
```

**Example:** Business Card

```typescript
'obj_business_card': {
  name: 'Business Card',
  capabilities: {
    readable: true,
    takable: false,        // Barista won't let you take it
    photographable: true   // But you can photograph it!
  },
  handlers: {
    onTake: {
      fail: {
        message: "The barista says, \"Sorry, that belongs to my boss. But feel free to take a picture if you want.\"\n\nHint: Try USE PHONE ON BUSINESS CARD"
      }
    }
  },
  media: {
    images: {
      default: {
        url: 'https://example.com/business-card.jpg',
        description: 'Business card with contact info'
      }
    }
  }
}
```

### 3. Player Experience

```
> take business card
The barista says, "Sorry, that belongs to my boss. But feel free to take a picture if you want."

Hint: Try USE PHONE ON BUSINESS CARD

> use phone on business card
📸 You take a photo of the Business Card. The image is saved to your Phone.

[Shows same media URL as original business card]
[Phone mode automatically closes]
[Conversation with barista automatically ends]

> inventory
You are carrying:
- Phone
- Photo of Business Card

> examine photo of business card
[Shows image again]
You review the photo of Business Card.

> read photo of business card
[Shows image]
You look closely at the photo of Business Card.
```

## Implementation Details

### Auto-Generated Photo Items

When photographed, the system automatically creates:

```typescript
{
  id: 'photo_of_<entity_id>',
  name: 'Photo of <Entity Name>',
  archetype: 'Image',
  description: 'A photo you took of <Entity Name>.',
  capabilities: {
    isTakable: false,  // Already in inventory
    isReadable: true,
    isPhotographable: false  // Can't photograph a photo
  },
  media: {
    image: <same_as_original>  // Reuses original media!
  }
}
```

### Flags Set

- `photographed_<entity_id>` - Prevents duplicate photos

### Effects Generated

```typescript
[
  {
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: '📸 You take a photo of the Business Card...',
    messageType: 'image',
    imageId: 'photo_of_obj_business_card',
    imageEntityType: 'item'
  },
  {
    type: 'ADD_ITEM',
    itemId: 'photo_of_obj_business_card'
  },
  {
    type: 'SET_FLAG',
    flag: 'photographed_obj_business_card',
    value: true
  },
  {
    type: 'CLEAR_DEVICE_FOCUS'  // ✅ Automatically exit phone mode
  },
  {
    type: 'END_CONVERSATION'  // ✅ Automatically end conversation
  }
]
```

## Use Cases

### 1. Evidence That Can't Be Removed

```
- Crime scene photos
- Documents on walls
- Evidence that's too large
- Items belonging to NPCs
```

### 2. Progressive Discovery

```
- Photo wall maps to reference later
- Photograph codes/passwords on screens
- Document evidence without alerting NPCs
- Collect clues without physical inventory clutter
```

### 3. Realistic Limitations

```
Player: "Why can't I take this?"
Game: "It belongs to someone else, but you can photograph it."
```

## Code Architecture

### Files Modified

1. **src/lib/game/types.ts**
   - Added `camera` capability to Capabilities
   - Added `photographable` capability

2. **src/lib/game/utils/photography-helper.ts**
   - `attemptPhotograph()` - Main photography logic
   - `isCameraDevice()` - Check if item is a camera
   - Auto-generates photo items with media

3. **src/lib/game/actions/handle-use.ts**
   - Integrated photography check before normal handlers
   - `USE camera ON target` triggers photography

4. **src/lib/game/cartridge.ts**
   - Phone has `isCamera: true`
   - Business card is photographable GameObject

## Future Enhancements

Possible future features:

- **Photo Album** - Special UI for viewing all photos
- **Photo Quality** - Different cameras = different quality
- **Zoom/Enhance** - Examine photos more closely
- **Photo Sharing** - Send photos to NPCs
- **Photo Destruction** - Delete unwanted photos
- **Film Limit** - Limited number of photos (old cameras)

## Testing Checklist

- [ ] Player can use phone on photographable object
- [ ] Photo is added to inventory automatically
- [ ] Photo shows same media as original
- [ ] Can't photograph same thing twice
- [ ] Can't take photographable object physically
- [ ] Non-photographable objects show appropriate message
- [ ] Photo can be examined/read to view image

## Example: Complete Business Card Implementation

```typescript
// 1. GameObject (Photographable)
'obj_business_card': {
  capabilities: {
    readable: true,
    takable: false,
    photographable: true
  },
  handlers: {
    onTake: {
      fail: {
        message: "Can't take it. Try photographing it instead."
      }
    }
  },
  media: {
    images: {
      default: {
        url: 'https://example.com/card.jpg'
      }
    }
  }
}

// 2. Camera Item
'item_phone': {
  capabilities: {
    isCamera: true
  }
}

// 3. Player Action
> use phone on business card

// 4. Result (Auto-Generated)
Item created:
{
  id: 'photo_of_obj_business_card',
  name: 'Photo of Business Card',
  media: { image: { url: 'https://example.com/card.jpg' } }
}
```

## Notes

- **NPCs are always photographable** by default (for character portraits)
- **Photos are read-only** - can't be modified or dropped
- **Media is required** - objects without media can still be photographed, but photo won't show image
- **One photo per entity** - enforced by flag system
- **Auto-cleanup** - Taking a photo automatically:
  - Exits phone mode (closes device focus)
  - Ends active conversations
  - Returns player to normal mode
- **Conversation-safe** - Player can photograph while talking to NPCs (e.g., barista shows card, player photographs it, conversation ends automatically)

---

**Status:** ✅ Fully Implemented
**Version:** 1.0
**Last Updated:** 2025-11-29
