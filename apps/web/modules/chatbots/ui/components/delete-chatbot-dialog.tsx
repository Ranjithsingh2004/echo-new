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

interface DeleteChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: any | null;
}

export const DeleteChatbotDialog = ({
  open,
  onOpenChange,
  chatbot,
}: DeleteChatbotDialogProps) => {
  const deleteChatbot = useMutation(api.private.chatbots.deleteChatbot);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!chatbot) return;

    setIsDeleting(true);
    try {
      await deleteChatbot({
        chatbotId: chatbot.chatbotId,
      });

      toast.success("Chatbot deleted successfully");

      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.data || "Failed to delete chatbot");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Chatbot</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{chatbot?.name}"? This action cannot be undone.
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
