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
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";
import type { Id } from "@workspace/backend/_generated/dataModel";

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
  const [form, setForm] = useState({
    name: "",
    knowledgeBaseId: "",
    greetMessage: "Hi! How can I help you?",
    customSystemPrompt: "",
    primaryColor: "",
    size: "medium" as "small" | "medium" | "large",
    isDefault: false,
    suggestion1: "",
    suggestion2: "",
    suggestion3: "",
    assistantId: "",
    phoneNumber: "",
  });

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

  const handleCancel = () => {
    setForm({
      name: "",
      knowledgeBaseId: "",
      greetMessage: "Hi! How can I help you?",
      customSystemPrompt: "",
      primaryColor: "",
      size: "medium",
      isDefault: false,
      suggestion1: "",
      suggestion2: "",
      suggestion3: "",
      assistantId: "",
      phoneNumber: "",
    });
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
