'use client';

import { useAction, useMutation } from "convex/react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { api } from "@workspace/backend/_generated/api";

type ChatbotDoc = Doc<"chatbots">;
type BaseLogo = NonNullable<NonNullable<ChatbotDoc["appearance"]>["logo"]>;
type ResolvedLogo = BaseLogo & { url?: string | null };

interface LogoManagerProps {
  chatbotId: ChatbotDoc["chatbotId"];
  logo?: ResolvedLogo;
}

export const LogoManager = ({ chatbotId, logo }: LogoManagerProps) => {
  const uploadLogo = useAction(api.private.chatbots.uploadLogo);
  const setLogo = useMutation(api.private.chatbots.setLogo);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(logo?.url ?? logo?.externalUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isUrlDialogOpen) {
      setUrlValue(logo?.type === "url" ? logo?.externalUrl ?? logo?.url ?? "" : "");
    }
  }, [isUrlDialogOpen, logo]);

  useEffect(() => {
    setPreviewUrl(logo?.url ?? logo?.externalUrl ?? null);
  }, [logo]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-uploading same file

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isSvg = file.type === "image/svg+xml" || lowerName.endsWith(".svg");

    if (!isSvg) {
      toast.error("Only SVG logos are supported");
      return;
    }

    if (file.size > 64 * 1024) {
      toast.error("Logo must be smaller than 64KB");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadLogo({
        chatbotId,
        filename: file.name,
        mimeType: file.type || "image/svg+xml",
        bytes: await file.arrayBuffer(),
      });
      setPreviewUrl(result.logo?.url ?? null);
      toast.success("Logo updated");
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to upload logo"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = async () => {
    if (!logo) {
      return;
    }

    setIsSaving(true);
    try {
      await setLogo({ chatbotId, logo: { type: "default" } });
      setPreviewUrl(null);
      toast.success("Logo reset to default");
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to reset logo"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyUrl = async () => {
    const trimmed = urlValue.trim();

    if (!trimmed) {
      toast.error("Please enter an SVG URL");
      return;
    }

    setIsSaving(true);
    try {
      await setLogo({ chatbotId, logo: { type: "url", url: trimmed } });
      setPreviewUrl(trimmed);
      toast.success("Logo updated");
      setIsUrlDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to save URL"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {previewUrl ? (
            <img alt="Chatbot logo preview" className="h-full w-full object-contain" src={previewUrl} />
          ) : (
            <span className="text-xs text-muted-foreground">No logo</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Button disabled={isUploading || isSaving} onClick={handleUploadClick} variant="default" type="button">
            {isUploading ? "Uploading..." : "Upload SVG"}
          </Button>
          <Button disabled={isUploading || isSaving} onClick={() => setIsUrlDialogOpen(true)} variant="secondary" type="button">
            Use URL
          </Button>
          <Button disabled={isUploading || isSaving || !logo} onClick={handleReset} variant="ghost" type="button">
            Reset to default
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Logos must be HTTPS-hosted SVGs under 64KB. They appear in chat headers, avatars, and embed buttons.
      </p>

      <input
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      <Dialog onOpenChange={setIsUrlDialogOpen} open={isUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use external SVG</DialogTitle>
            <DialogDescription>Provide an HTTPS link to an SVG file.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="https://example.com/logo.svg"
            type="url"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
          />
          <DialogFooter>
            <Button onClick={() => setIsUrlDialogOpen(false)} type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleApplyUrl} type="button" disabled={isSaving || urlValue.trim().length === 0}>
              {isSaving ? "Saving..." : "Save URL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
    const raw = (error as any).message as string;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.message) {
        return parsed.message;
      }
    } catch {
      if (raw) {
        return raw;
      }
    }
  }
  return fallback;
}
