"use client";

import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
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
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";

interface EditKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBase: any | null;
}

export const EditKnowledgeBaseDialog = ({
  open,
  onOpenChange,
  knowledgeBase,
}: EditKnowledgeBaseDialogProps) => {
  const updateKnowledgeBase = useMutation(api.private.knowledgeBases.update);

  const [isUpdating, setIsUpdating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (knowledgeBase) {
      setForm({
        name: knowledgeBase.name || "",
        description: knowledgeBase.description || "",
      });
    }
  }, [knowledgeBase]);

  const handleUpdate = async () => {
    if (!form.name.trim() || !knowledgeBase) {
      toast.error("Knowledge base name is required");
      return;
    }

    setIsUpdating(true);
    try {
      await updateKnowledgeBase({
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        name: form.name,
        description: form.description || undefined,
      });

      toast.success("Knowledge base updated successfully");

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update knowledge base");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Knowledge Base</DialogTitle>
          <DialogDescription>
            Update the knowledge base details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Product Documentation"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Brief description of this knowledge base"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
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
