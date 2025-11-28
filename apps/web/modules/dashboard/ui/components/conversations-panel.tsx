"use client";

import { useEffect } from "react";
import {formatDistanceToNow} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ListIcon, ArrowRightIcon, ArrowUpIcon, CheckIcon, CornerUpLeftIcon } from "lucide-react";
import {ScrollArea} from "@workspace/ui/components/scroll-area"
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { usePaginatedQuery } from "convex/react";
import { getCountryFromTimezone } from "@/lib/country-utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import {ConversationStatusIcon} from "@workspace/ui/components/conversation-status-icon";
import { getCountryFlagUrl } from "@/lib/country-utils";
import { useAtomValue,useSetAtom } from "jotai/react";
import { useOrganization } from "@clerk/nextjs";
import {useInfiniteScroll} from "@workspace/ui/hooks/use-infinite-scroll"
import {InfiniteScrollTrigger} from "@workspace/ui/components/infinite-scroll-trigger"
import { Skeleton } from "@workspace/ui/components/skeleton";
import { statusFilterAtom, chatbotFilterAtom } from "../../atoms";
import { STATUS_FILTER_KEY, CHATBOT_FILTER_KEY } from "../../constants";
import { useQuery } from "convex/react";

const STATUS_FILTER_VALUES = new Set([
  "all",
  "unresolved",
  "escalated",
  "resolved",
]);

const parseStatusFilter = (
  value: string | null,
): "all" | "unresolved" | "escalated" | "resolved" => {
  if (value && STATUS_FILTER_VALUES.has(value)) {
    return value as "all" | "unresolved" | "escalated" | "resolved";
  }
  return "all";
};



export const ConversationsPanel = () => {

    const pathname = usePathname();

    const statusFilter = useAtomValue(statusFilterAtom);
    const setStatusFilter = useSetAtom(statusFilterAtom);
    const chatbotFilter = useAtomValue(chatbotFilterAtom);
    const setChatbotFilter = useSetAtom(chatbotFilterAtom);
    const { organization } = useOrganization();
    const organizationId = organization?.id ?? null;
    const chatbots = useQuery(api.private.chatbots.list);

    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      if (!organizationId) {
        setStatusFilter("all");
        setChatbotFilter("all");
        return;
      }

      const scopedStatusKey = `${STATUS_FILTER_KEY}:${organizationId}`;
      const scopedChatbotKey = `${CHATBOT_FILTER_KEY}:${organizationId}`;

      const storedStatus = localStorage.getItem(scopedStatusKey);
      setStatusFilter(parseStatusFilter(storedStatus));

      const storedChatbot = localStorage.getItem(scopedChatbotKey);
      const resolvedChatbot =
        storedChatbot && storedChatbot !== "all"
          ? (storedChatbot as Id<"chatbots">)
          : "all";
      setChatbotFilter(resolvedChatbot);
    }, [organizationId, setStatusFilter, setChatbotFilter]);

    useEffect(() => {
      if (typeof window === "undefined" || !organizationId) {
        return;
      }

      const scopedStatusKey = `${STATUS_FILTER_KEY}:${organizationId}`;
      localStorage.setItem(scopedStatusKey, statusFilter);
    }, [organizationId, statusFilter]);

    useEffect(() => {
      if (typeof window === "undefined" || !organizationId) {
        return;
      }

      const scopedChatbotKey = `${CHATBOT_FILTER_KEY}:${organizationId}`;
      localStorage.setItem(scopedChatbotKey, chatbotFilter);
    }, [organizationId, chatbotFilter]);

    useEffect(() => {
      if (!chatbots || chatbotFilter === "all") {
        return;
      }

      const matchesCurrentOrg = chatbots.some(
        (chatbot) => chatbot._id === chatbotFilter,
      );

      if (!matchesCurrentOrg) {
        setChatbotFilter("all");
      }
    }, [chatbots, chatbotFilter, setChatbotFilter]);

    const conversations = usePaginatedQuery(
        api.private.conversations.getMany,
        {
           status:
                statusFilter === "all"
                    ? undefined
                    : statusFilter,
           chatbotId:
                chatbotFilter === "all"
                    ? undefined
                    : chatbotFilter,

        },
        {
            initialNumItems: 10,
        },

    );
    const {
        topElementRef,
        handleLoadMore,
        canLoadMore,
        isLoadingMore,
        isLoadingFirstPage,

    } = useInfiniteScroll({
        status: conversations.status,
        loadMore: conversations.loadMore,
        loadSize: 10,
        });






  return (
    <div className="flex h-full w-full flex-col bg-background text-sidebar-foreground">
      <div className="flex flex-col gap-2 border-b p-2">
        <Select
            defaultValue="all"
            onValueChange={(value) => setStatusFilter(
                value as "unresolved" | "escalated" | "resolved" | "all"
            )}
            value={statusFilter}
            >
            <SelectTrigger
            className="h-8 border-none px-1.5 shadow-none ring-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-0"
            >
                <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">
                    <div className="flex items-center gap-2">
                    <ListIcon className="size-4" />
                    <span>All</span>
                    </div>
                </SelectItem>
                <SelectItem value="unresolved">
                    <div className="flex items-center gap-2">
                        <ArrowRightIcon className="size-4" />
                        <span>Unresolved</span>
                    </div>
                    </SelectItem>
                <SelectItem value="escalated">
                    <div className="flex items-center gap-2">
                        <ArrowUpIcon className="size-4" />
                        <span>Escalated</span>
                    </div>
                    </SelectItem>
                    <SelectItem value="resolved">
                    <div className="flex items-center gap-2">
                        <CheckIcon className="size-4" />
                        <span>Resolved</span>
                    </div>
                    </SelectItem>


            </SelectContent>

        </Select>

        <Select
            defaultValue="all"
            onValueChange={(value) => setChatbotFilter(value as any)}
            value={chatbotFilter}
            >
            <SelectTrigger
            className="h-8 border-none px-1.5 shadow-none ring-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-0"
            >
                <SelectValue placeholder="Filter by Chatbot" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">
                    <div className="flex items-center gap-2">
                    <ListIcon className="size-4" />
                    <span>All Chatbots</span>
                    </div>
                </SelectItem>
                {chatbots && chatbots.map((chatbot) => (
                    <SelectItem key={chatbot._id} value={chatbot._id}>
                        {chatbot.name}
                    </SelectItem>
                ))}
            </SelectContent>

        </Select>


      </div>
      {isLoadingFirstPage ? (
        <SkeletonConversations />
      ):(
        <ScrollArea className="max-h-[calc(100vh-53px)]">
            <div className="flex w-full flex-1 flex-col text-sm">

            {conversations.results.map((conversation) => {
                    const isLastMessageFromOperator =
                        conversation.lastMessage?.message?.role === "assistant";

                    const country = getCountryFromTimezone(
                        conversation.contactSession.metadata?.timezone
                    );
                    const countryFlagUrl= country?.code
                    ?getCountryFlagUrl(country.code)
                    : undefined
                    ;

                    return (
                    <Link
                        key={conversation._id}
                        className={cn(
                        "relative flex cursor-pointer items-start gap-3 border-b p-4 py-5 text-sm text-accent-foreground transition-colors hover:bg-accent/70",
                        pathname === `/conversations/${conversation._id}` &&
                        "bg-accent/80 text-accent-foreground"
                        )}
                        href={`/conversations/${conversation._id}`}
                    >

                        <div className={cn(
                            "-translate-y-1/2 absolute top-1/2 left-0 h-[64%] w-1 rounded-r-full bg-neutral-300 opacity-0 transition-opacity",
                            pathname === `/conversations/${conversation._id}` &&
                                "opacity-100"
                        )} />

                        <DicebearAvatar
                            seed={conversation.contactSession._id}
                            badgeImageUrl={countryFlagUrl}
                            size={40}
                            className="shrink-0"
                        />
                        <div className="flex-1">
                        <div className="flex w-full items-center gap-2">
                            <span className="truncate font-bold">
                            {conversation.contactSession.name}
                            </span>
                            <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                            {formatDistanceToNow(conversation._creationTime)}
                            </span>

                        </div>
                        {(conversation.caseId || conversation.chatbotName) && (
                          <div className="text-muted-foreground text-xs mt-0.5 flex items-center gap-2">
                            {conversation.caseId && (
                              <span>Case ID: {conversation.caseId}</span>
                            )}
                            {conversation.caseId && conversation.chatbotName && (
                              <span>•</span>
                            )}
                            {conversation.chatbotName && (
                              <span>{conversation.chatbotName}</span>
                            )}
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="flex w-0 grow items-center gap-1">
                            {isLastMessageFromOperator && (
                            <CornerUpLeftIcon className="size-3 shrink-0 text-muted-foreground" />
                            )}
                            <span
                            className={cn(
                                "line-clamp-1 text-muted-foreground text-xs",
                                !isLastMessageFromOperator && "font-bold text-black"
                                )}

                            >
                                {conversation.lastMessage?.text}
                            </span>
                        </div>
                        <ConversationStatusIcon status = {conversation.status}/>
                        </div>



                        </div>





                        

                    </Link>
    )

                    })}
                    <InfiniteScrollTrigger
                        canLoadMore={canLoadMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={handleLoadMore}
                        ref={topElementRef}
                    />




            </div>
        </ScrollArea>
    )}


    </div>
  );
}

export const SkeletonConversations = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <div className="relative flex w-full min-w-0 flex-col p-2">
        <div className="w-full space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              className="flex items-start gap-3 rounded-lg p-4"
              key={index}
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex w-full items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="ml-auto h-3 w-12 shrink-0" />
                    </div>
                    <div className="mt-2">
                    <Skeleton className="h-3 w-full" />
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
