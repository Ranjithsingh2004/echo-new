"use client";

import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { useOrganization } from "@clerk/nextjs";
import { Organization } from "@clerk/nextjs/server";
import { Button } from "@workspace/ui/components/button";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@workspace/ui/components/separator";
import { IntegrationId, INTEGRATIONS } from "../../constants";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useState } from "react";
import { createScript } from "../../utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";


export const IntegrationsView = () => {

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSnippet, setSelectedSnippet] = useState("");
    const [selectedChatbotId, setSelectedChatbotId] = useState<string>("default");




    const {organization} = useOrganization();
    const chatbots = useQuery(api.private.chatbots.list);

    const handleIntegrationClick = (integrationId: IntegrationId) => {
        if (!organization) {
            toast.error("Organization ID not found");
            return;
        }

        const snippet = createScript(integrationId, organization.id, selectedChatbotId);
        setSelectedSnippet(snippet);
        setDialogOpen(true);
        };

    const handleCopyOrgId = async () => {
    try {
        await navigator.clipboard.writeText(organization?.id ?? "");
        toast.success("Copied to clipboard");
    } catch {
        toast.error("Failed to copy to clipboard");
    }
    };

    const handleCopyChatbotId = async () => {
    try {
        const chatbotId = selectedChatbot?.chatbotId ?? "";
        await navigator.clipboard.writeText(chatbotId);
        toast.success("Copied to clipboard");
    } catch {
        toast.error("Failed to copy to clipboard");
    }
    };

    const selectedChatbot = chatbots?.find(c => c.chatbotId === selectedChatbotId);





  return (
    <>
    <IntegrationsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        snippet={selectedSnippet}
        />

    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl">Setup & Integrations</h1>
          <p className="text-muted-foreground">
            Choose the integration that&apos;s right for you
          </p>
        </div>
        <div className="mt-8 space-y-6">
        <div className="flex items-center gap-4">
            <Label className="w-34" htmlFor="organization-id">
            Organization ID
            </Label>
            <Input
            disabled
            id="organization-id"
            readOnly
            value={organization?.id ?? ""}
            className="flex-1 bg-background font-mono text-sm"
            />
            <Button
                className="gap-2"
                onClick={handleCopyOrgId}
                size="sm"
                >
                <CopyIcon className="size-4" />
                Copy
                </Button>
        </div>

        <div className="space-y-3">
            <div className="flex items-center gap-4">
                <Label className="w-34" htmlFor="chatbot-select">
                Chatbot
                </Label>
                <Select
                    value={selectedChatbotId}
                    onValueChange={setSelectedChatbotId}
                >
                    <SelectTrigger id="chatbot-select" className="flex-1">
                        <SelectValue placeholder="Select chatbot" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default Chatbot</SelectItem>
                        {chatbots && chatbots.map((chatbot) => (
                            <SelectItem key={chatbot._id} value={chatbot.chatbotId}>
                                {chatbot.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedChatbotId !== "default" && selectedChatbot && (
                <div className="flex items-center gap-4">
                    <Label className="w-34" htmlFor="chatbot-id">
                    Chatbot ID
                    </Label>
                    <Input
                    disabled
                    id="chatbot-id"
                    readOnly
                    value={selectedChatbot.chatbotId}
                    className="flex-1 bg-background font-mono text-sm"
                    />
                    <Button
                        className="gap-2"
                        onClick={handleCopyChatbotId}
                        size="sm"
                        >
                        <CopyIcon className="size-4" />
                        Copy
                        </Button>
                </div>
            )}
        </div>
        </div>

        <Separator className="my-8" />
        <div className="space-y-6">
        <div className="space-y-1">
            <Label className="text-lg">Integrations</Label>
            <p className="text-muted-foreground text-sm">
            Add the following code to your website to enable the chatbox.
            </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

            {INTEGRATIONS.map((integration) => (
            <button
               key={integration.id}
                onClick={() => handleIntegrationClick(integration.id)}
                type="button"
                className="flex items-center gap-4 rounded-lg border bg-background p-4 hover:bg-accent"
                
            >
                <Image
                alt={integration.title}
                height={32}
                src={integration.icon}
                width={32}
                />
                <p>{integration.title}</p>

            </button>
            ))}



        </div>





        </div>






        



      </div>
    </div>  
    </>
  );
};

export const IntegrationsDialog = ({
  open,
  onOpenChange,
  snippet,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  snippet: string;
}) => {

    const handleCopy = async () => {
    try {
        await navigator.clipboard.writeText(snippet);
        toast.success("Copied to clipboard");
    } catch {
        toast.error("Failed to copy to clipboard");
    }
    };
    return (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Integrate with your website</DialogTitle>
        <DialogDescription>
            Follow these steps to add the chatbox to your website
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6">
        <div className="space-y-2">
            <div className="rounded-md bg-accent p-2 text-sm">
            1. Copy the following code
            </div>
            <div className="group relative">
                <pre className="max-h-[300px] overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-foreground p-2 font-mono text-secondary text-sm">
                    {snippet}
                    </pre>
                    <Button 
                       className="absolute top-4 right-6 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={handleCopy}
                        size="icon"
                        variant="secondary"

                      >
                        <CopyIcon className="size-3" />
                    </Button>



            </div>
        </div>



         <div className="space-y-2">
            <div className="rounded-md bg-accent p-2 text-sm">
            2. Add the code in your page
            </div>
            <p className="text-muted-foreground text-sm">
            Paste the chatbox code above in your page. You can add it in the HTML head section.
            </p>




        </div>
        </div>
    </DialogContent>
  </Dialog>
);



};

