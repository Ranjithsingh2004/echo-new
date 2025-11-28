"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { ChevronDown } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { THEME_PRESETS, type ThemePreset } from "../../constants/theme-presets";

type ChatbotFormState = {
  name: string;
  knowledgeBaseId: string;
  greetMessage: string;
  customSystemPrompt: string;
  primaryColor: string;
  size: "small" | "medium" | "large";
  isDefault: boolean;
  suggestion1: string;
  suggestion2: string;
  suggestion3: string;
  assistantId: string;
  phoneNumber: string;
};

const createInitialFormState = (): ChatbotFormState => ({
  name: "",
  knowledgeBaseId: "",
  greetMessage: "Hi! How can I help you?",
  customSystemPrompt: "",
  primaryColor: THEME_PRESETS.classic.primaryColor,
  size: "medium",
  isDefault: false,
  suggestion1: "",
  suggestion2: "",
  suggestion3: "",
  assistantId: "",
  phoneNumber: "",
});

interface CreateChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBases: any[];
}

export const CreateChatbotDialog = ({
  open,
  onOpenChange,
  knowledgeBases,
}: CreateChatbotDialogProps) => {
  const createChatbot = useMutation(api.private.chatbots.create);

  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>("classic");
  const [form, setForm] = useState<ChatbotFormState>(createInitialFormState());

  const handleCreate = async () => {
    if (!form.name.trim() || !form.knowledgeBaseId) {
      toast.error("Name and knowledge base are required");
      return;
    }

    setIsCreating(true);
    try {
      await createChatbot({
        name: form.name,
        knowledgeBaseId: form.knowledgeBaseId as Id<"knowledgeBases">,
        greetMessage: form.greetMessage,
        customSystemPrompt: form.customSystemPrompt || undefined,
        appearance: {
          primaryColor: form.primaryColor || undefined,
          size: form.size,
        },
        defaultSuggestions: {
          suggestion1: form.suggestion1 || undefined,
          suggestion2: form.suggestion2 || undefined,
          suggestion3: form.suggestion3 || undefined,
        },
        vapiSettings: {
          assistantId: form.assistantId || undefined,
          phoneNumber: form.phoneNumber || undefined,
        },
        isDefault: form.isDefault,
      });

      toast.success("Chatbot created successfully");

      handleCancel();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create chatbot");
    } finally {
      setIsCreating(false);
    }
  };

  const handleThemeChange = (theme: ThemePreset) => {
    setSelectedTheme(theme);
    setForm((prev) => ({ ...prev, primaryColor: THEME_PRESETS[theme].primaryColor }));
  };

  const handleCancel = () => {
    setForm(createInitialFormState());
    setSelectedTheme("classic");
    setShowAdvanced(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Chatbot</DialogTitle>
          <DialogDescription>
            Create a new chatbot with custom settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Chatbot Name</Label>
            <Input
              id="name"
              placeholder="e.g., Support Bot"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb">Knowledge Base</Label>
            <Select value={form.knowledgeBaseId} onValueChange={(value) => setForm({ ...form, knowledgeBaseId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select knowledge base" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases.map((kb) => (
                  <SelectItem key={kb._id} value={kb._id}>
                    {kb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="greet">Greeting Message</Label>
            <Textarea
              id="greet"
              value={form.greetMessage}
              onChange={(e) => setForm({ ...form, greetMessage: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Theme</Label>
            <RadioGroup value={selectedTheme} onValueChange={handleThemeChange}>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((themeKey) => {
                  const theme = THEME_PRESETS[themeKey];
                  return (
                    <div key={themeKey} className="relative">
                      <RadioGroupItem
                        value={themeKey}
                        id={themeKey}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={themeKey}
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <div className="mb-2 h-8 w-8 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                        <div className="text-center">
                          <div className="font-semibold">{theme.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{theme.description}</div>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                <span className="text-sm font-medium">Advanced Options (Optional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="custom-color">Custom Primary Color</Label>
                <div className="flex items-center gap-x-2">
                  <Input
                    id="custom-color"
                    placeholder={form.primaryColor}
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  />
                  <Input
                    className="h-10 w-20 cursor-pointer"
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    type="color"
                    value={form.primaryColor}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Override theme color with custom hex value</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Widget Size</Label>
                <Select value={form.size} onValueChange={(value: "small" | "medium" | "large") => setForm({ ...form, size: value })}>
                  <SelectTrigger id="size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium (Default)</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system-prompt">Custom System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  placeholder="Optional: Custom AI behavior instructions"
                  value={form.customSystemPrompt}
                  onChange={(e) => setForm({ ...form, customSystemPrompt: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Customize AI personality and behavior</p>
              </div>

              <div className="space-y-2">
                <Label>Default Suggestions</Label>
                <Input
                  placeholder="Suggestion 1"
                  value={form.suggestion1}
                  onChange={(e) => setForm({ ...form, suggestion1: e.target.value })}
                />
                <Input
                  placeholder="Suggestion 2"
                  value={form.suggestion2}
                  onChange={(e) => setForm({ ...form, suggestion2: e.target.value })}
                />
                <Input
                  placeholder="Suggestion 3"
                  value={form.suggestion3}
                  onChange={(e) => setForm({ ...form, suggestion3: e.target.value })}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="default"
              checked={form.isDefault}
              onCheckedChange={(checked) => setForm({ ...form, isDefault: checked as boolean })}
            />
            <Label htmlFor="default" className="cursor-pointer">
              Set as default chatbot
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
