"use client";

import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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

interface EditChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: any | null;
  knowledgeBases: any[];
}

export const EditChatbotDialog = ({
  open,
  onOpenChange,
  chatbot,
  knowledgeBases,
}: EditChatbotDialogProps) => {
  const updateChatbot = useMutation(api.private.chatbots.update);

  const [isUpdating, setIsUpdating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    knowledgeBaseId: "",
    greetMessage: "",
    isDefault: false,
  });

  useEffect(() => {
    if (chatbot) {
      setForm({
        name: chatbot.name || "",
        knowledgeBaseId: chatbot.knowledgeBaseId || "",
        greetMessage: chatbot.greetMessage || "",
        isDefault: chatbot.isDefault || false,
      });
    }
  }, [chatbot]);

  const handleUpdate = async () => {
    if (!form.name.trim() || !form.knowledgeBaseId || !chatbot) return;

    setIsUpdating(true);
    try {
      await updateChatbot({
        chatbotId: chatbot.chatbotId,
        name: form.name,
        knowledgeBaseId: form.knowledgeBaseId as Id<"knowledgeBases">,
        greetMessage: form.greetMessage,
        customSystemPrompt: chatbot.customSystemPrompt,
        appearance: chatbot.appearance,
        defaultSuggestions: chatbot.defaultSuggestions,
        vapiSettings: chatbot.vapiSettings,
        isDefault: form.isDefault,
      });

      toast.success("Chatbot updated successfully");

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update chatbot");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Chatbot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Knowledge Base</Label>
            <Select value={form.knowledgeBaseId} onValueChange={(value) => setForm({ ...form, knowledgeBaseId: value })}>
              <SelectTrigger>
                <SelectValue />
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
            <Label>Greeting Message</Label>
            <Textarea
              value={form.greetMessage}
              onChange={(e) => setForm({ ...form, greetMessage: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-default"
              checked={form.isDefault}
              onCheckedChange={(checked) => setForm({ ...form, isDefault: checked as boolean })}
            />
            <Label htmlFor="edit-default" className="cursor-pointer">
              Set as default chatbot
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
