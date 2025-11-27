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
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateKnowledgeBaseDialog = ({
  open,
  onOpenChange,
}: CreateKnowledgeBaseDialogProps) => {
  const createKnowledgeBase = useMutation(api.private.knowledgeBases.create);

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Knowledge base name is required");
      return;
    }

    setIsCreating(true);
    try {
      await createKnowledgeBase({
        name: form.name,
        description: form.description || undefined,
      });

      toast.success("Knowledge base created successfully");

      handleCancel();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create knowledge base");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: "", description: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
          <DialogDescription>
            Create a new knowledge base to organize your documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Product Documentation"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this knowledge base"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
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
