"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { AISuggestion,AISuggestions } from "@workspace/ui/components/ai/suggestion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import {useThreadMessages,toUIMessages} from "@convex-dev/agent/react";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { Button} from "@workspace/ui/components/button";
import { ArrowLeft, MenuIcon } from "lucide-react";
import { useAtomValue,useSetAtom } from "jotai";
import { conversationIdAtom, organizationIdAtom, contactSessionIdAtomFamily, screenAtom, widgetSettingsAtom } from"../../atoms/widget-atoms";
import { api } from "@workspace/backend/_generated/api";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {DicebearAvatar} from "@workspace/ui/components/dicebear-avatar";
import {useAction,useQuery} from "convex/react";
import { Form,FormField } from "@workspace/ui/components/form";
import {useInfiniteScroll} from "@workspace/ui/hooks/use-infinite-scroll";
import {InfiniteScrollTrigger} from "@workspace/ui/components/infinite-scroll-trigger";

import {
  AIInput,
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
import { TypingIndicator } from "@workspace/ui/components/ai/typing-indicator";
import { useMemo, useState, useEffect, useRef } from "react";

const formSchema = z.object({
  message: z.string().min(1,"Message is required"),

});




export const WidgetChatScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const widgetSettings = useAtomValue(widgetSettingsAtom);
    const assistantLogoUrl = widgetSettings?.appearance?.logo?.url ?? undefined;

  const conversationId = useAtomValue(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  const [isAITyping, setIsAITyping] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState(false);
  const previousMessageCountRef = useRef(0);
  const previousUserMessageCountRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

   const onBack = () => {
    setConversationId(null);
    setScreen("selection");
  };

  const suggestions = useMemo(() => {
  if (!widgetSettings) {
    return [];
  }

  return Object.keys(widgetSettings.defaultSuggestions).map((key) => {
    return widgetSettings.defaultSuggestions[
      key as keyof typeof widgetSettings.defaultSuggestions
    ];
  });
}, [widgetSettings]);





  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        }
      : "skip"
  );

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId
      ? {
          threadId: conversation.threadId,
          contactSessionId,
        }
      : "skip",
      { initialNumItems: 10 },
    );

    const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } = useInfiniteScroll({
      status: messages.status,
      loadMore: messages.loadMore,
      loadSize: 10
    });





  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const createMessage = useAction(api.public.messages.create);
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!conversation || !contactSessionId) {
      return;
    }

    form.reset();
    setPendingUserMessage(true);

    // Scroll to bottom when message is sent
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    await createMessage({
      threadId: conversation.threadId,
      prompt: values.message,
      contactSessionId,
    });
  };

  // Handle typing animation flow
  useEffect(() => {
    const uiMessages = toUIMessages(messages.results ?? []);
    const currentMessageCount = uiMessages?.length || 0;
    const userMessages = uiMessages?.filter(m => m.role === "user") || [];
    const currentUserMessageCount = userMessages.length;

    // When user's message appears, show typing indicator
    if (pendingUserMessage && currentUserMessageCount > previousUserMessageCountRef.current) {
      setPendingUserMessage(false);
      setIsAITyping(true);
    }

    // When AI responds, hide typing indicator (check if message count increased)
    if (currentMessageCount > previousMessageCountRef.current) {
      const lastMessage = uiMessages?.[uiMessages.length - 1];
      if (lastMessage?.role === "assistant") {
        setIsAITyping(false);
      }
    }

    // Failsafe: If typing is showing but last message is assistant, hide it
    if (isAITyping && currentMessageCount > 0) {
      const lastMessage = uiMessages?.[uiMessages.length - 1];
      if (lastMessage?.role === "assistant" && currentMessageCount === previousMessageCountRef.current) {
        // Message hasn't changed but typing is still showing
        setIsAITyping(false);
      }
    }

    previousMessageCountRef.current = currentMessageCount;
    previousUserMessageCountRef.current = currentUserMessageCount;
  }, [messages.results, isAITyping, pendingUserMessage]);











 


  return (
    <>
      <WidgetHeader className="flex flex-col items-start gap-y-1">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-x-2">
            <Button
              size ="icon"
              variant="transparent"
              onClick={onBack}

            >
              <ArrowLeft />


            </Button>
            <DicebearAvatar
              imageUrl={assistantLogoUrl}
              seed={widgetSettings?.chatbotName || "assistant"}
              size={32}
            />
            <p>{widgetSettings?.chatbotName || "Support Assistant"}</p>


          </div>
          <Button
            size="icon"
            variant="transparent"
          >
            <MenuIcon />
          </Button>
        </div>
        {conversation?.caseId && (
          <div className="ml-12 text-xs text-muted-foreground">
            Case ID: {conversation.caseId}
          </div>
        )}
      </WidgetHeader>
      <AIConversation>
        <AIConversationContent>
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />

          {toUIMessages(messages.results ?? [])?.map((message) => {
            return (
              <AIMessage
                from={message.role === "user" ? "user" : "assistant"}
                key={message.id}
              >
                <AIMessageContent>
                  <AIResponse>
                    {message.content}
                  </AIResponse>
                </AIMessageContent>

                {message.role === "assistant" && (
                  <DicebearAvatar
                    imageUrl={assistantLogoUrl}
                    seed={widgetSettings?.chatbotName || "assistant"}
                    size={32}
                  />
                )}



              </AIMessage>
            );
          })}

          {isAITyping && (
            <AIMessage from="assistant">
              <AIMessageContent>
                <TypingIndicator />
              </AIMessageContent>
              <DicebearAvatar
                imageUrl={assistantLogoUrl}
                seed={widgetSettings?.chatbotName || "assistant"}
                size={32}
              />
            </AIMessage>
          )}
          <div ref={messagesEndRef} />
        </AIConversationContent>
    </AIConversation>
    {toUIMessages(messages.results ?? [])?.length === 1 && (
    <AISuggestions className="flex w-full flex-col items-end p-2">
      {suggestions.map((suggestion) => {
        if (!suggestion) {
          return null;
        }

        return (
          <AISuggestion
            key={suggestion}
            onClick={() => {
              form.setValue("message", suggestion, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              });
              form.handleSubmit(onSubmit)();

            }}
            suggestion={suggestion}
          />
        );
      })}
    </AISuggestions>
    )}

     

    <Form {...form}>
      <AIInput
        className="rounded-none border-x-0 border-b-0"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          disabled={conversation?.status === "resolved"}
          name="message"
          render={({ field }) => (
            <AIInputTextarea
              disabled={conversation?.status === "resolved"}
              onChange={field.onChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)();
                }
              }}
                            placeholder={
                conversation?.status === "resolved"
                  ? "This conversation has been resolved."
                  : "Type your message..."
              }
              value={field.value}
              />


            
            
          )}
        />

        <AIInputToolbar>
          <AIInputTools />
          <AIInputSubmit
            disabled={conversation?.status === "resolved" || !form.formState.isValid}
            status="ready"
            type="submit"
          />
      </AIInputToolbar>


      </AIInput>
    </Form>



      
    </>
  )
}
