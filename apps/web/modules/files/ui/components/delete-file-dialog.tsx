"use client";

import { useMutation } from "convex/react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";
import type { PublicFile } from "@workspace/backend/private/files";

interface DeleteFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PublicFile | null;
  onDeleted?: () => void;
}

export const DeleteFileDialog = ({
  open,
  onOpenChange,
  file,
  onDeleted,
}: DeleteFileDialogProps) => {
  const deleteFile = useMutation(api.private.files.deleteFile);

  const handleDelete = async () => {
    if (!file) {
      return;
    }

    // Close dialog immediately
    onOpenChange(false);

    // Process deletion in background
    (async () => {
      try {
        await deleteFile({ entryId: file.id });

        // Trigger refresh (notification will be shown via NotificationsBell)
        if (onDeleted) {
          onDeleted();
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : `Failed to delete "${file.name}"`
        );
      }
    })();
  };

  return (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          Delete File
        </DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this file? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      {file && ( 

        <div className="py-4">
        <div className="rounded-lg border bg-muted/50 p-4">
            <p className="font-medium">{file.name}</p>
            <p className="text-muted-foreground text-sm">
            Type: {file.type.toUpperCase()} | Size: {file.size}
            </p>
        </div>
        </div>



      )}


      <DialogFooter>
        <Button
          onClick={() => onOpenChange(false)}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={!file}
          onClick={handleDelete}
          variant="destructive"
        >
          Delete
        </Button>
      </DialogFooter>



    </DialogContent>
  </Dialog>
)












};

