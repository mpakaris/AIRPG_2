
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { NPC } from '@/lib/game/types';
import { Button } from '@/components/ui/button';

const fieldGlossary: Record<string, string> = {
    id: "The unique identifier for this NPC. Cannot be changed.",
    name: "The user-facing name of the character.",
    description: "The description a player sees when they first examine this NPC.",
    importance: "Controls the NPC's role. 'primary' for key characters, 'supporting' for minor roles, and 'ambient' for background characters.",
    dialogueType: "Determines how the NPC generates responses. 'scripted' uses the predefined topics list, while 'freeform' uses the AI persona.",
    persona: "The detailed AI prompt for 'freeform' dialogue. Defines the NPC's personality, mood, knowledge, and voice.",
    welcomeMessage: "The first thing the NPC says when the player starts a conversation.",
    goodbyeMessage: "The NPC's default sign-off when a conversation ends.",
    // Add more descriptions here as we build out the form
};

const FormField = ({ label, description, children }: { label: string, description: string, children: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-4 border-b py-4">
        <div className="col-span-1">
            <Label className="font-semibold">{label}</Label>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="col-span-2">
            {children}
        </div>
    </div>
);

export function EntityEditor({ entity }: { entity: NPC }) {

    const renderField = (key: string, value: any) => {
        const description = fieldGlossary[key] || "No description available.";

        // Special rendering for complex objects/arrays
        if (typeof value === 'object' && value !== null) {
            return (
                <FormField key={key} label={key} description={description}>
                    <Textarea 
                        readOnly 
                        value={JSON.stringify(value, null, 2)} 
                        className="h-48 font-mono text-xs bg-black/10"
                    />
                </FormField>
            );
        }

        // Render appropriate input based on key or value type
        switch (key) {
            case 'id':
                return (
                    <FormField key={key} label={key} description={description}>
                        <Input type="text" readOnly value={value} className="bg-black/10" />
                    </FormField>
                );
            case 'description':
            case 'persona':
            case 'welcomeMessage':
            case 'goodbyeMessage':
                 return (
                    <FormField key={key} label={key} description={description}>
                        <Textarea value={value} className="h-24" />
                    </FormField>
                );
            case 'importance':
                return (
                    <FormField key={key} label={key} description={description}>
                        <Select value={value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select importance" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="supporting">Supporting</SelectItem>
                                <SelectItem value="ambient">Ambient</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                );
            case 'dialogueType':
                 return (
                    <FormField key={key} label={key} description={description}>
                        <Select value={value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select dialogue type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="scripted">Scripted</SelectItem>
                                <SelectItem value="freeform">Freeform</SelectItem>
                                <SelectItem value="tree">Tree (Not Implemented)</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                );
            default:
                 if (typeof value === 'boolean') {
                    return (
                        <FormField key={key} label={key} description={description}>
                            <div className="flex items-center h-full">
                               <Switch checked={value} />
                            </div>
                        </FormField>
                    );
                }
                return (
                    <FormField key={key} label={key} description={description}>
                        <Input type="text" value={value} />
                    </FormField>
                );
        }
    }

    return (
        <div className="space-y-4">
             {Object.entries(entity).map(([key, value]) => renderField(key, value))}
             <div className="flex justify-end pt-4">
                 <Button disabled>Save Changes</Button>
             </div>
        </div>
    );
}
