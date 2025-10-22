
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// A simple glossary for field descriptions
const fieldGlossary: Record<string, string> = {
    id: "The unique identifier for this entity. Cannot be changed.",
    name: "The user-facing name of the character or object.",
    description: "The description a player sees when they first examine this entity.",
    importance: "Controls the NPC's role. 'primary' for key characters, 'supporting' for minor roles, and 'ambient' for background characters.",
    dialogueType: "Determines how the NPC generates responses. 'scripted' uses the predefined topics list, while 'freeform' uses the AI persona.",
    persona: "The detailed AI prompt for 'freeform' dialogue. Defines the NPC's personality, mood, knowledge, and voice.",
    welcomeMessage: "The first thing the NPC says when the player starts a conversation.",
    goodbyeMessage: "The NPC's default sign-off when a conversation ends.",
    initialState: "The starting state of the entity, including trust level, attitude, etc.",
    stage: "The current lifecycle stage of the NPC.",
    trust: "The player's trust level with the NPC.",
    attitude: "The NPC's attitude towards the player.",
    media: "Visual and audio assets for the entity.",
    image: "The primary portrait or image for the entity.",
    url: "The URL of the image asset.",
    hint: "A hint for AI image generation tools.",
    capabilities: "A set of boolean flags declaring what the entity can do.",
    handlers: "A collection of event handlers for all player interactions.",
    state: "The starting state of the object when the game loads.",
    inventory: "Defines the object as a container.",
    input: "Defines the object as a puzzle that accepts direct user input (e.g., a keypad).",
    fallbackMessages: "A set of default messages for common failed actions.",
    topics: "A structured list of dialogue topics for scripted NPCs."
};

// ================================================================================================
// Field Rendering Logic
// ================================================================================================

// A simple component for a single form field
const FormField = ({ label, description, children }: { label: string, description?: string, children: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-4 border-b py-4 last:border-b-0">
        <div className="col-span-1">
            <Label className="font-semibold capitalize">{label.replace(/([A-Z])/g, ' $1')}</Label>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="col-span-2 flex items-center">
            {children}
        </div>
    </div>
);

// Determines which input control to render based on the key and value type
const renderFieldControl = (key: string, value: any) => {
    // This is a read-only editor for now, so all fields are disabled.
    const disabled = true; 

    switch (key) {
        case 'id':
            return <Input type="text" readOnly value={value} className="bg-black/10 flex-1" />;
        case 'description':
        case 'persona':
        case 'welcomeMessage':
        case 'goodbyeMessage':
        case 'message':
             return <Textarea value={value} className="h-24 flex-1" disabled={disabled} />;
        case 'importance':
            return (
                <Select value={value} disabled={disabled}>
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select importance" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="supporting">Supporting</SelectItem>
                        <SelectItem value="ambient">Ambient</SelectItem>
                    </SelectContent>
                </Select>
            );
        case 'dialogueType':
             return (
                <Select value={value} disabled={disabled}>
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select dialogue type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="scripted">Scripted</SelectItem>
                        <SelectItem value="freeform">Freeform</SelectItem>
                        <SelectItem value="tree">Tree (Not Implemented)</SelectItem>
                    </SelectContent>
                </Select>
            );
        default:
             if (typeof value === 'boolean') {
                return <Switch checked={value} disabled={disabled} />;
            }
            if (typeof value === 'string' || typeof value === 'number') {
                return <Input type="text" value={value} className="flex-1" disabled={disabled} />;
            }
            // If it's a type we don't have a specific control for, we display it as read-only text.
            return <p className="text-sm text-muted-foreground">Complex value (unsupported)</p>;
    }
}

// The main recursive function to render all fields of an object
const renderObjectFields = (obj: Record<string, any>) => {
    if (!obj || typeof obj !== 'object') return null;

    return Object.entries(obj).map(([key, value]) => {
        const description = fieldGlossary[key] || "No description available.";

        // --- Case 1: Value is a simple type (string, number, boolean) ---
        if (typeof value !== 'object' || value === null) {
            return (
                <FormField key={key} label={key} description={description}>
                    {renderFieldControl(key, value)}
                </FormField>
            );
        }

        // --- Case 2: Value is an array ---
        if (Array.isArray(value)) {
            // If it's an array of simple values (e.g., strings)
            if (value.every(item => typeof item !== 'object')) {
                 return (
                    <FormField key={key} label={key} description={description}>
                        <Textarea 
                            disabled 
                            value={value.join('\n')} 
                            className="h-24 font-mono text-xs bg-black/10 flex-1"
                            placeholder="List of items, one per line"
                        />
                    </FormField>
                );
            }
            // If it's an array of objects
            return (
                <div key={key} className="contents">
                    <div className="col-span-3 pt-6 pb-2">
                        <h4 className="text-lg font-semibold capitalize tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <Separator />
                    </div>
                    <div className="col-span-3 space-y-4">
                        {value.map((item, index) => (
                           <Card key={index} className="bg-muted/30">
                               <CardHeader>
                                   <CardTitle className="text-base">
                                       {item.label || item.type || `${key} ${index + 1}`}
                                   </CardTitle>
                               </CardHeader>
                               <CardContent>
                                   {renderObjectFields(item)}
                               </CardContent>
                           </Card>
                        ))}
                    </div>
                </div>
            );
        }

        // --- Case 3: Value is a nested object ---
        return (
            <div key={key} className="contents">
                <div className="col-span-3 pt-6 pb-2">
                    <h4 className="text-lg font-semibold capitalize tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</h4>
                    <Separator />
                </div>
                <div className="col-span-3">
                   {renderObjectFields(value)}
                </div>
            </div>
        );
    });
};


// ================================================================================================
// Main Component Export
// ================================================================================================

export function EntityEditor({ entity }: { entity: Record<string, any> }) {
    return (
        <div className="space-y-4">
             {renderObjectFields(entity)}
             <div className="flex justify-end pt-4">
                 <Button disabled>Save Changes</Button>
             </div>
        </div>
    );
}
