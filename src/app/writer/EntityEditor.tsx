
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { NPC } from '@/lib/game/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const fieldGlossary: Record<string, string> = {
    id: "The unique identifier for this NPC. Cannot be changed.",
    name: "The user-facing name of the character.",
    description: "The description a player sees when they first examine this NPC.",
    importance: "Controls the NPC's role. 'primary' for key characters, 'supporting' for minor roles, and 'ambient' for background characters.",
    dialogueType: "Determines how the NPC generates responses. 'scripted' uses the predefined topics list, while 'freeform' uses the AI persona.",
    persona: "The detailed AI prompt for 'freeform' dialogue. Defines the NPC's personality, mood, knowledge, and voice.",
    welcomeMessage: "The first thing the NPC says when the player starts a conversation.",
    goodbyeMessage: "The NPC's default sign-off when a conversation ends.",
    initialState: "The starting state of the NPC, including their attitude and trust level.",
    stage: "The current lifecycle stage of the NPC.",
    trust: "The player's trust level with the NPC.",
    attitude: "The NPC's attitude towards the player.",
    media: "Visual and audio assets for the NPC.",
    image: "The primary portrait or image for the NPC.",
    url: "The URL of the image asset.",
    hint: "A hint for AI image generation tools.",
    // Add more descriptions here
};

const FormField = ({ label, description, children }: { label: string, description: string, children: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-4 border-b py-4">
        <div className="col-span-1">
            <Label className="font-semibold capitalize">{label.replace(/([A-Z])/g, ' $1')}</Label>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="col-span-2 flex items-center">
            {children}
        </div>
    </div>
);

const renderFieldControl = (key: string, value: any) => {
    switch (key) {
        case 'id':
            return <Input type="text" readOnly value={value} className="bg-black/10 flex-1" />;
        case 'description':
        case 'persona':
        case 'welcomeMessage':
        case 'goodbyeMessage':
             return <Textarea value={value} className="h-24 flex-1" />;
        case 'importance':
            return (
                <Select value={value}>
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
                <Select value={value}>
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
                return <Switch checked={value} />;
            }
            if (typeof value === 'string' || typeof value === 'number') {
                return <Input type="text" value={value} className="flex-1" />;
            }
            // Fallback for unknown types (though we try to avoid this)
            return <Input type="text" value={String(value)} className="flex-1" />;
    }
}


const renderObjectFields = (obj: Record<string, any>, isNested: boolean = false) => {
    return Object.entries(obj).map(([key, value]) => {
        const description = fieldGlossary[key] || "No description available.";

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return (
                <div key={key} className="contents">
                    <div className="col-span-3 pt-6 pb-2">
                        <h4 className="text-lg font-semibold capitalize tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <Separator />
                    </div>
                    {renderObjectFields(value, true)}
                </div>
            );
        }

        // For now, render arrays of objects as JSON.
        // A more complex UI is needed to edit these.
        if (Array.isArray(value)) {
            return (
                 <FormField key={key} label={key} description={description}>
                    <Textarea 
                        readOnly 
                        value={JSON.stringify(value, null, 2)} 
                        className="h-48 font-mono text-xs bg-black/10 flex-1"
                    />
                </FormField>
            );
        }
        
        return (
            <FormField key={key} label={key} description={description}>
                {renderFieldControl(key, value)}
            </FormField>
        );
    });
};


export function EntityEditor({ entity }: { entity: NPC }) {
    return (
        <div className="space-y-4">
             {renderObjectFields(entity)}
             <div className="flex justify-end pt-4">
                 <Button disabled>Save Changes</Button>
             </div>
        </div>
    );
}
