"use client";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";
import type { PublicFile } from "@workspace/backend/private/files";
import { Button } from "@workspace/ui/components/button";
import {  FileIcon, MoreHorizontalIcon, PlusIcon, TrashIcon, UploadIcon, GlobeIcon, RefreshCwIcon, CheckCircle2Icon, AlertCircleIcon, Loader2Icon } from "lucide-react";
import {Badge} from "@workspace/ui/components/badge";
import { UploadDialog } from "../components/upload-dialog";
import { useState, useEffect, useMemo } from "react";
import { tr } from "zod/v4/locales";
import { DeleteFileDialog } from "../components/delete-file-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useOrganization } from "@clerk/nextjs";

const KB_FILTER_STORAGE_KEY = "files-kb-filter";
const SOURCE_FILTER_STORAGE_KEY = "files-source-filter";

export const FilesView = () => {

    const { organization } = useOrganization();
    const organizationId = organization?.id ?? null;
    const scopedKbStorageKey = organizationId ? `${KB_FILTER_STORAGE_KEY}-${organizationId}` : null;
    const scopedSourceStorageKey = organizationId ? `${SOURCE_FILTER_STORAGE_KEY}-${organizationId}` : null;

    const knowledgeBases = useQuery(api.private.knowledgeBases.list);
    const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string>("all");

    const [sourceFilter, setSourceFilter] = useState<"all" | "uploaded" | "scraped">("all");

    // Load persisted filters whenever organization changes
    useEffect(() => {
      if (!scopedKbStorageKey || typeof window === "undefined") {
        setSelectedKnowledgeBaseId("all");
        return;
      }
      const storedKb = localStorage.getItem(scopedKbStorageKey);
      setSelectedKnowledgeBaseId(storedKb || "all");
    }, [scopedKbStorageKey]);

    useEffect(() => {
      if (!scopedSourceStorageKey || typeof window === "undefined") {
        setSourceFilter("all");
        return;
      }
      const storedSource = localStorage.getItem(scopedSourceStorageKey) as "all" | "uploaded" | "scraped" | null;
      setSourceFilter(storedSource || "all");
    }, [scopedSourceStorageKey]);

    // Persist filter selections to localStorage scoped per organization
    useEffect(() => {
      if (!scopedKbStorageKey || typeof window === "undefined") {
        return;
      }
      localStorage.setItem(scopedKbStorageKey, selectedKnowledgeBaseId);
    }, [selectedKnowledgeBaseId, scopedKbStorageKey]);

    useEffect(() => {
      if (!scopedSourceStorageKey || typeof window === "undefined") {
        return;
      }
      localStorage.setItem(scopedSourceStorageKey, sourceFilter);
    }, [sourceFilter, scopedSourceStorageKey]);

    // Ensure selected KB belongs to current organization
    useEffect(() => {
      if (!knowledgeBases || selectedKnowledgeBaseId === "all") {
        return;
      }
      const exists = knowledgeBases.some((kb) => kb.knowledgeBaseId === selectedKnowledgeBaseId);
      if (!exists) {
        setSelectedKnowledgeBaseId("all");
      }
    }, [knowledgeBases, selectedKnowledgeBaseId]);

    const hasValidKbSelection =
      selectedKnowledgeBaseId !== "all" &&
      !!knowledgeBases?.some((kb) => kb.knowledgeBaseId === selectedKnowledgeBaseId);

    const files = usePaginatedQuery(
        api.private.files.list,
        !hasValidKbSelection
          ? {}
          : { knowledgeBaseId: selectedKnowledgeBaseId },
        {
            initialNumItems: 10,
        },
        );

        const {
  topElementRef,
  handleLoadMore,
  canLoadMore,
  isLoadingFirstPage,
  isLoadingMore,
} = useInfiniteScroll({
  status: files.status,
  loadMore: files.loadMore,
  loadSize: 10,
});

const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null);
const retryFile = useMutation(api.private.files.retryFileProcessing);

const handleDeleteClick = (file: PublicFile) => {
  setSelectedFile(file);
  setDeleteDialogOpen(true);
};

const handleRetryClick = async (file: PublicFile) => {
  try {
    await retryFile({ entryId: file.id });
    toast.success("Retrying file processing...");
  } catch (error) {
    console.error(error);
    toast.error("Failed to retry file processing");
  }
};

const handleFileDeleted = () => {
  setSelectedFile(null);
}

const getKnowledgeBaseName = (knowledgeBaseId: string | null | undefined) => {
  if (!knowledgeBaseId) return "Default";
  const kb = knowledgeBases?.find(kb => kb.knowledgeBaseId === knowledgeBaseId);
  return kb?.name || "Unknown";
};

const uniqueFiles = useMemo(() => {
  const seen = new Map<string, PublicFile>();
  for (const file of files.results) {
    const key = `${file.name}-${file.knowledgeBaseId ?? "default"}`;
    if (!seen.has(key)) {
      seen.set(key, file);
    }
  }
  return Array.from(seen.values());
}, [files.results]);





  return (
    <>
    <DeleteFileDialog 
    onOpenChange={setDeleteDialogOpen}
      open={deleteDialogOpen}
      file={selectedFile}
      onDeleted={handleFileDeleted}
    
    
    />

    <UploadDialog
      onOpenChange={setUploadDialogOpen}
      open={uploadDialogOpen}
      onFileUploaded={() => files.loadMore(10)}
    />

    <div className="flex min-h-screen flex-col bg-muted p-8">
    <div className="mx-auto w-full max-w-screen-md">
        <div className="space-y-2">
        <h1 className="text-2xl md:text-4xl">
            Knowledge Base Files
        </h1>
        <p className="text-muted-foreground">
            Upload and manage documents for your AI assistant
        </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kb-filter">Filter by Knowledge Base</Label>
            <Select
              value={selectedKnowledgeBaseId}
              onValueChange={setSelectedKnowledgeBaseId}
            >
              <SelectTrigger id="kb-filter">
                <SelectValue placeholder="Select knowledge base" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Knowledge Bases</SelectItem>
                {knowledgeBases && knowledgeBases.map((kb) => (
                  <SelectItem key={kb._id} value={kb.knowledgeBaseId}>
                    {kb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Filter by Source</Label>
            <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as "all" | "uploaded" | "scraped")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All Files
                </TabsTrigger>
                <TabsTrigger value="uploaded">
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Uploaded
                </TabsTrigger>
                <TabsTrigger value="scraped">
                  <GlobeIcon className="mr-2 h-4 w-4" />
                  Scraped
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="mt-8 rounded-lg border bg-background">
        <div className="flex items-center justify-end border-b px-6 py-4">
            <Button
             onClick={()=>setUploadDialogOpen(true)}
            >
            <PlusIcon />
            Add New
            </Button>
        </div>

        <Table>
  <TableHeader>
    <TableRow>
      <TableHead className="px-6 py-4 font-medium">Name</TableHead>
      <TableHead className="px-6 py-4 font-medium">Knowledge Base</TableHead>
      <TableHead className="px-6 py-4 font-medium">Source</TableHead>
      <TableHead className="px-6 py-4 font-medium">Type</TableHead>
      <TableHead className="px-6 py-4 font-medium">Size</TableHead>
      <TableHead className="px-6 py-4 font-medium">Status</TableHead>
      <TableHead className="px-6 py-4 font-medium">Actions</TableHead>

    </TableRow>
  </TableHeader>

  <TableBody>
  {(() => {
    if (isLoadingFirstPage) {
      return (
        <TableRow>
          <TableCell className="h-24 text-center" colSpan={7}>
            Loading files...
          </TableCell>
        </TableRow>
      );
    }

    // Apply source filter
    const filteredFiles = sourceFilter === "all"
      ? uniqueFiles
      : uniqueFiles.filter(file => (file.sourceType || "uploaded") === sourceFilter);

    if (filteredFiles.length === 0) {
        return(
            <TableRow>
          <TableCell className="h-24 text-center" colSpan={7}>
           No files found
          </TableCell>
        </TableRow>
        )

    }


    return filteredFiles.map((file) => (
  <TableRow className="hover:bg-muted/50" key={file.id}>
    <TableCell className="px-6 py-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <FileIcon />
          <span className="font-medium">{file.name}</span>
        </div>
        <span className="text-sm text-muted-foreground ml-7">
          Original upload: {file.originalFilename ?? file.name}
        </span>
      </div>
    </TableCell>
    <TableCell className="px-6 py-4">
      <Badge variant="secondary">
        {getKnowledgeBaseName(file.knowledgeBaseId)}
      </Badge>
    </TableCell>
    <TableCell className="px-6 py-4">
      {file.sourceType === "scraped" ? (
        <Badge variant="default" className="gap-1">
          <GlobeIcon className="h-3 w-3" />
          Scraped
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1">
          <UploadIcon className="h-3 w-3" />
          Uploaded
        </Badge>
      )}
    </TableCell>
    <TableCell className="px-6 py-4">
      <Badge
        className ="uppercase"
        variant="outline"
      >

        {file.type}
      </Badge>
    </TableCell>

    <TableCell className="px-6 py-4 text-muted-foreground">
      {file.size}
    </TableCell>
    <TableCell className="px-6 py-4">
      {file.status === "ready" && (
        <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
          <CheckCircle2Icon className="h-3 w-3" />
          Ready
        </Badge>
      )}
      {file.status === "processing" && (
        <Badge variant="secondary" className="gap-1">
          <Loader2Icon className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      )}
      {file.status === "error" && (
        <Badge variant="destructive" className="gap-1">
          <AlertCircleIcon className="h-3 w-3" />
          Failed
        </Badge>
      )}
    </TableCell>
    <TableCell className="px-6 py-4">

        <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      className="size-8 p-0"
      size="sm"
      variant="ghost"
    >
      <MoreHorizontalIcon />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">

    {file.status === "error" && (
      <DropdownMenuItem onClick={() => handleRetryClick(file)}>
        <RefreshCwIcon className="size-4 mr-2" />
        Retry Processing
      </DropdownMenuItem>
    )}

    <DropdownMenuItem
      className="text-destructive"
      onClick={() => handleDeleteClick(file)}
    >
      <TrashIcon className="size-4 mr-2" />
      Delete
    </DropdownMenuItem>






  </DropdownMenuContent>
</DropdownMenu>

        
    </TableCell>
  </TableRow>
));





  })()}
</TableBody>





</Table>

{!isLoadingFirstPage && uniqueFiles.length > 0 && (canLoadMore || isLoadingMore) && (
  <div className="border-t px-6 py-4">
    <InfiniteScrollTrigger
      canLoadMore={canLoadMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
      ref={topElementRef}
    />
  </div>
)}





        </div>

    </div>
    </div>

    </>

  );
};
