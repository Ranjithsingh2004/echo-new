"use client";

import { useAction, useQuery } from "convex/react";
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
import { Button } from "@workspace/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@workspace/ui/components/dropzone";
import { api } from "@workspace/backend/_generated/api";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUploaded?: () => void;
}

export const UploadDialog = ({
  open,
  onOpenChange,
  onFileUploaded,
}: UploadDialogProps) => {
  const addFile = useAction(api.private.files.addFile);
  const knowledgeBases = useQuery(api.private.knowledgeBases.list);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
const [isUploading, setIsUploading] = useState(false);
const [uploadForm, setUploadForm] = useState({
  category: "",
  filename: "",
  knowledgeBaseId: "",
});

const handleFileDrop = (acceptedFiles: File[]) => {
  const file = acceptedFiles[0];

  if (file) {
    setUploadedFiles([file]);
    if (!uploadForm.filename) {
      setUploadForm((prev) => ({ ...prev, filename: file.name }));
    }
  }
};

const handleUpload = async () => {
  setIsUploading(true);
  try {
    const blob = uploadedFiles[0];

        if(!blob){
          return;
        }

        const filename = uploadForm.filename || blob.name;
        await addFile({
      bytes: await blob.arrayBuffer(),
      filename,
      mimeType: blob.type || "text/plain",
      category: uploadForm.category,
      knowledgeBaseId: uploadForm.knowledgeBaseId || undefined,
    });

    onFileUploaded?.();
    handleCancel();



  } catch (error) {
    console.error(error);
  } finally {
    setIsUploading(false);
  }
}



const handleCancel = () => {
  onOpenChange(false);
  setUploadedFiles([]);
  setUploadForm({
    category: "",
    filename: "",
    knowledgeBaseId: "",
  });
}








return (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          Upload Document
        </DialogTitle>
        <DialogDescription>

          Upload documents to your knowledge base for AI-powered search and retrieval



        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">

      <div className="space-y-2">
  <Label htmlFor="knowledgeBase">
    Knowledge Base (Optional)
  </Label>
  <Select
    value={uploadForm.knowledgeBaseId}
    onValueChange={(value) => setUploadForm((prev) => ({ ...prev, knowledgeBaseId: value }))}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select knowledge base (or use default)" />
    </SelectTrigger>
    <SelectContent>
      {knowledgeBases && knowledgeBases.map((kb) => (
        <SelectItem key={kb._id} value={kb.knowledgeBaseId}>
          {kb.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

      <div className="space-y-2">
  <Label htmlFor="category">
    Category
  </Label>
  <Input
    className="w-full"
    id="category"
    onChange={(e) => setUploadForm((prev) => ({
      ...prev,
      category: e.target.value,
    }))}
    placeholder="e.g., Documentation, Support, Product"
    type = "text"
    value={uploadForm.category}
  />
</div>

<div className="space-y-2">
  <Label htmlFor="filename">
    Filename
    <span className="text-muted-foreground text-xs">(optional)</span>
  </Label>
  <Input
    className="w-full"
    id="category"
    onChange={(e) => setUploadForm((prev) => ({
      ...prev,
      filename: e.target.value,
    }))}
    placeholder="Override default filename"
    type = "text"
    value={uploadForm.filename}
  />
</div>


<Dropzone
  accept={{
    "application/pdf": [".pdf"],
    "text/csv": [".csv"],
    "text/plain": [".txt"],
  }}
  disabled={isUploading}
  maxFiles={1}
  onDrop={handleFileDrop}
  src={uploadedFiles}
>
  <DropzoneEmptyState />
  <DropzoneContent />
</Dropzone>
</div>

<DialogFooter>
  <Button
    disabled={isUploading}
    onClick={handleCancel}
    variant="outline"
  >
    Cancel
  </Button>
  <Button
    onClick={handleUpload}
    disabled={uploadedFiles.length === 0 || isUploading || !uploadForm.category}
  >
    {isUploading ? "Uploading..." : "Upload"}
  </Button>
</DialogFooter>









    </DialogContent>
  </Dialog>
);





};



