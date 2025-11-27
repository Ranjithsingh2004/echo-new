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
import { Button } from "@workspace/ui/components/button";
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";

interface DeleteKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBase: any | null;
}

export const DeleteKnowledgeBaseDialog = ({
  open,
  onOpenChange,
  knowledgeBase,
}: DeleteKnowledgeBaseDialogProps) => {
  const deleteKnowledgeBase = useMutation(api.private.knowledgeBases.deleteKnowledgeBase);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!knowledgeBase) return;

    setIsDeleting(true);
    try {
      await deleteKnowledgeBase({
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      });

      toast.success("Knowledge base deleted successfully");

      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.data || "Failed to delete knowledge base");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Knowledge Base</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{knowledgeBase?.name}"? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
