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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@workspace/ui/components/dropzone";
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";
import { FileUp, Globe } from "lucide-react";

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
  const [isScraping, setIsScraping] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: "",
    displayName: "",
    knowledgeBaseId: "",
  });
  const [scrapeForm, setScrapeForm] = useState({
    url: "",
    category: "",
    displayName: "",
    knowledgeBaseId: "",
  });

const handleFileDrop = (acceptedFiles: File[]) => {
  const file = acceptedFiles[0];

  if (file) {
    setUploadedFiles([file]);
    setUploadForm((prev) => ({
      ...prev,
      displayName: prev.displayName || file.name,
    }));
  }
};

const handleUpload = async () => {
  const displayName = uploadForm.displayName.trim();

  if (!displayName) {
    toast.error("Please enter a file name");
    return;
  }

  setIsUploading(true);
  try {
    const blob = uploadedFiles[0];

        if(!blob){
          return;
        }

        const originalFilename = blob.name || "uploaded-file";
        await addFile({
      bytes: await blob.arrayBuffer(),
      filename: originalFilename,
      displayName,
      mimeType: blob.type || "text/plain",
      category: uploadForm.category,
      knowledgeBaseId: uploadForm.knowledgeBaseId || undefined,
      sourceType: "uploaded",
    });

    onFileUploaded?.();
    handleCancel();



  } catch (error) {
    console.error(error);
  } finally {
    setIsUploading(false);
  }
}



const handleScrape = async () => {
  const displayName = scrapeForm.displayName.trim();

  if (!scrapeForm.url || !scrapeForm.category) {
    toast.error("URL and category are required");
    return;
  }

  if (!displayName) {
    toast.error("Please enter a file name");
    return;
  }

  setIsScraping(true);
  try {
    // Use Next.js API route to bypass CORS
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: scrapeForm.url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to scrape URL");
    }

    const { content, title } = await response.json();

    if (!content || content.length < 50) {
      throw new Error("No meaningful content found on the page");
    }

    // Convert text to blob
    const blob = new Blob([content], { type: "text/plain" });
    const hostname = new URL(scrapeForm.url).hostname;
    const filename = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${hostname}-${Date.now()}.txt`;

    await addFile({
      bytes: await blob.arrayBuffer(),
      filename,
      displayName,
      mimeType: "text/plain",
      category: scrapeForm.category,
      knowledgeBaseId: scrapeForm.knowledgeBaseId || undefined,
      sourceType: "scraped",
    });

    toast.success("Website content scraped and added successfully");
    onFileUploaded?.();
    handleCancel();
  } catch (error) {
    console.error(error);
    toast.error(error instanceof Error ? error.message : "Failed to scrape website");
  } finally {
    setIsScraping(false);
  }
};

const handleCancel = () => {
  onOpenChange(false);
  setUploadedFiles([]);
  setUploadForm({
    category: "",
    displayName: "",
    knowledgeBaseId: "",
  });
  setScrapeForm({
    url: "",
    category: "",
    displayName: "",
    knowledgeBaseId: "",
  });
}








return (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          Add Content to Knowledge Base
        </DialogTitle>
        <DialogDescription>
          Upload documents or scrape website content for AI-powered search and retrieval
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">
            <FileUp className="mr-2 h-4 w-4" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="scrape">
            <Globe className="mr-2 h-4 w-4" />
            Scrape URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 mt-4">

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
  <Label htmlFor="upload-filename">
    File Name <span className="text-muted-foreground text-xs">(required)</span>
  </Label>
  <Input
    className="w-full"
    id="upload-filename"
    onChange={(e) => setUploadForm((prev) => ({
      ...prev,
      displayName: e.target.value,
    }))}
    placeholder="Enter a friendly file name"
    type = "text"
    value={uploadForm.displayName}
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
              disabled={
                uploadedFiles.length === 0 ||
                isUploading ||
                !uploadForm.category ||
                uploadForm.displayName.trim().length === 0
              }
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </TabsContent>

        <TabsContent value="scrape" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="scrape-kb">
              Knowledge Base (Optional)
            </Label>
            <Select
              value={scrapeForm.knowledgeBaseId}
              onValueChange={(value) => setScrapeForm((prev) => ({ ...prev, knowledgeBaseId: value }))}
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
            <Label htmlFor="scrape-url">
              Website URL
            </Label>
            <Input
              id="scrape-url"
              type="url"
              placeholder="https://example.com/docs"
              value={scrapeForm.url}
              onChange={(e) => setScrapeForm((prev) => ({ ...prev, url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Enter the full URL of the webpage you want to scrape
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scrape-category">
              Category
            </Label>
            <Input
              id="scrape-category"
              type="text"
              placeholder="e.g., Documentation, Support, Product"
              value={scrapeForm.category}
              onChange={(e) => setScrapeForm((prev) => ({ ...prev, category: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scrape-filename">
              File Name <span className="text-muted-foreground text-xs">(required)</span>
            </Label>
            <Input
              id="scrape-filename"
              type="text"
              placeholder="Enter how this file should appear in the list"
              value={scrapeForm.displayName}
              onChange={(e) => setScrapeForm((prev) => ({ ...prev, displayName: e.target.value }))}
            />
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-sm">
            <p className="text-muted-foreground">
              💡 The scraper will extract text content from the webpage and add it to your knowledge base.
            </p>
          </div>

          <DialogFooter>
            <Button
              disabled={isScraping}
              onClick={handleCancel}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScrape}
              disabled={
                !scrapeForm.url ||
                !scrapeForm.category ||
                scrapeForm.displayName.trim().length === 0 ||
                isScraping
              }
            >
              {isScraping ? "Scraping..." : "Scrape & Add"}
            </Button>
          </DialogFooter>
        </TabsContent>
      </Tabs>









    </DialogContent>
  </Dialog>
);





};



