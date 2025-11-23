"use client";


import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { useAction, useMutation, useQuery } from "convex/react";
import { MoreHorizontal , MoreHorizontalIcon, Wand2Icon, FileJsonIcon, DownloadIcon, CopyIcon} from "lucide-react";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {
  AIInput,
  AIInputButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from "@workspace/ui/components/ai/input";
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import { Form, FormField } from "@workspace/ui/components/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toUIMessages,useThreadMessages} from "@convex-dev/agent/react";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { ConversationStatusButton } from "../components/conversation-status-button";
import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";



//1
const formSchema = z.object({
  message: z.string().min(1, "Message is required"),
});


export const ConversationIdView = ({
  conversationId,
}: {
  conversationId: Id<"conversations">,
}) => {
  const conversation = useQuery(api.private.conversations.getOne, {
    conversationId,
  });
  const messages = useThreadMessages(
    api.private.messages.getMany,
    conversation?.threadId ? { threadId: conversation.threadId } : "skip",
    { initialNumItems: 10, }
  );

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
  } = useInfiniteScroll({
    status: messages.status,
    loadMore: messages.loadMore,
    loadSize: 10,
  });







  //2
  const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    message: "",
  },
 
});
const [isEnhancing,setIsEnhancing] =  useState(false);
const enhanceResponse = useAction(api.private.messages.enhanceResponse);
const handleEnhanceResponse = async () => {

  setIsEnhancing(true);
  const currentValue = form.getValues("message");

  try {
    const response = await enhanceResponse({ prompt: currentValue });

    form.setValue("message",response);
  } catch (error) {
    toast.error("Failed to enhance response.");
    console.error(error);
  }finally{

    setIsEnhancing(false);


  }
}






  const createMessage = useMutation(api.private.messages.create);
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
      try {
        await createMessage({
          conversationId,
          prompt: values.message,
        });

        form.reset();
      } catch (error) {
        console.error(error);
      }
    };

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);


    const updateConversationStatus = useMutation(api.private.conversations.updateStatus);
    const handleToggleStatus = async () => {
      if (!conversation) {
        return;
      }
       setIsUpdatingStatus(true);

      let newStatus: "unresolved" | "resolved" | "escalated";

      // Cyc
      if (conversation.status === "unresolved") {
        newStatus = "escalated";
      } else if (conversation.status === "escalated") {
        newStatus = "resolved";
      } else {
        newStatus = "unresolved";
      }

      try {
        await updateConversationStatus({
          conversationId,
          status: newStatus,
        });
      } catch (error) {
        console.error(error);
      }finally{
         setIsUpdatingStatus(false);
      }



    };

    const [isExporting, setIsExporting] = useState(false);
    const [exportedJson, setExportedJson] = useState<string | null>(null);
    const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);

    const exportToJson = useMutation(api.private.conversations.exportToJson);

    const handleExportJson = async () => {
      setIsExporting(true);
      try {
        const jsonString = await exportToJson({ conversationId });
        setExportedJson(jsonString);
        setIsJsonDialogOpen(true);
        toast.success("Conversation exported to JSON successfully!");
      } catch (error) {
        console.error(error);
        toast.error("Failed to export conversation");
      } finally {
        setIsExporting(false);
      }
    };

    const handleCopyJson = () => {
      if (exportedJson) {
        navigator.clipboard.writeText(exportedJson);
        toast.success("JSON copied to clipboard!");
      }
    };

    const handleDownloadJson = () => {
      if (exportedJson) {
        const blob = new Blob([exportedJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation-${conversation?.caseId || conversationId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("JSON downloaded!");
      }
    };

    if (conversation === undefined || messages.status === "LoadingFirstPage") {
      return <ConversationIdViewLoading />
    }










  
  


  return (
    <div className="flex h-full flex-col bg-muted">
    <header className="flex flex-col border-b bg-background">
      <div className="flex items-center justify-between p-2.5">
        <div className="flex items-center gap-2">
          <Button
              size="sm"
              variant="ghost"
          >
              <MoreHorizontalIcon />
          </Button>
          <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportJson}
                disabled={isExporting}
              >
                <FileJsonIcon className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export JSON"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col gap-0 p-0">
              <div className="flex flex-col gap-2 p-6 pb-4 border-b">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-lg font-semibold">Conversation JSON Export</DialogTitle>
                  <DialogDescription className="text-sm">
                    Complete conversation data including all messages and metadata
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyJson}
                    className="flex-1"
                  >
                    <CopyIcon className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadJson}
                    className="flex-1"
                  >
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download JSON
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-6 pt-4">
                <div className="h-full w-full rounded-lg border bg-slate-50 dark:bg-slate-950 overflow-auto">
                  <pre className="text-xs p-4 font-mono leading-relaxed whitespace-pre-wrap break-words min-h-full">
                    {exportedJson}
                  </pre>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {!!conversation &&(
        <ConversationStatusButton
          onClick = {handleToggleStatus}
          status={conversation?.status}
          disabled = {isUpdatingStatus}



        />
        )}
      </div>
      {conversation?.caseId && (
        <div className="px-2.5 pb-2.5 text-muted-foreground text-sm">
          Case ID: {conversation.caseId}
        </div>
      )}
    </header>
     {/* 1 */}
     <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />

            {toUIMessages(messages.results ?? [])?.map((message) => (
              <AIMessage
                key={message.id}
                // In reverse, because we are watching from "assistant" perspective
                from={message.role === "user" ? "assistant" : "user"}
              >
                <AIMessageContent>
                  <AIResponse>
                    {message.content}
                  </AIResponse>
                </AIMessageContent>
                {message.role === "user" && (
                  <DicebearAvatar
                    seed={conversation?.contactSessionId ?? "user"}
                    size={32}
                  />
                )}

                

              </AIMessage>
            ))}

        </AIConversationContent>
        <AIConversationScrollButton/>

    </AIConversation>
    <div className="p-2">
      <Form {...form}>
        <AIInput onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            disabled={conversation?.status === "resolved"}
            name="message"
            render={({ field }) => (
              <AIInputTextarea
                disabled={
                  conversation?.status === "resolved" ||
                  form.formState.isSubmitting||
                  isEnhancing
                  // TODO: OR if enhancing prompt
                }
                onChange={field.onChange}
                onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)();
                }
              }}
              placeholder={
                conversation?.status === "resolved"
                  ? "This conversation has been resolved"
                  : "Type your response as an operator..."
              }
              value={field.value}

              />
            )}

          />
          <AIInputToolbar>
            <AIInputTools>
              <AIInputButton
              onClick = {handleEnhanceResponse}
                disabled = {conversation?.status === "resolved" || 
                  isEnhancing || 
                  !form.formState.isValid||
                  isEnhancing
                }



              
              >
                <Wand2Icon/>

                {isEnhancing ? "Enhancing..." : "Enhance"}
              </AIInputButton>
            </AIInputTools>
            <AIInputSubmit 
              disabled={
                conversation?.status === "resolved" ||
                !form.formState.isValid ||
                form.formState.isSubmitting
                // TODO: OR if is enhancing prompt
              }
              status="ready"
              type="submit"

            
            />
          </AIInputToolbar>
          




        </AIInput>
      </Form>
    </div>





    </div>

  );
};

export const ConversationIdViewLoading = () => {
  return (
    <div className="flex h-full flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5">
        <Button disabled size="sm" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </header>
      <AIConversation className="max-h-[calc(100vh-180px)]">
  <AIConversationContent>
        {Array.from({ length: 8 }, (_, index) => {
          const isUser = index % 2 === 0;
          const widths = ["w-48", "w-60", "w-72"];
          const width = widths[index % widths.length];

          return (
            <div
              className={cn(
                'group flex w-full items-end justify-end gap-2 py-2 [&>div]:max-w-[80%]',
                isUser  ? "is-user" : "is-assistant flex-row-reverse"

              )}
              key = {index}
            >
              <Skeleton className={`h-9 ${width} rounded-lg bg-neutral-200`} />
              <Skeleton className="size-8 rounded-full bg-neutral-200" />

            </div>
          )
        })}
      </AIConversationContent>
    </AIConversation>
    <div className="p-2">
      <AIInput>
        <AIInputTextarea
          disabled
          placeholder="Type your response as an operator..."
        />
        <AIInputToolbar>
          <AIInputTools />
          <AIInputSubmit disabled status="ready" />
        </AIInputToolbar>
      </AIInput>
    </div>



    </div>
  );
};
