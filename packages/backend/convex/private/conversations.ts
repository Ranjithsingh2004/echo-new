import { action, mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { MessageDoc,saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import { Doc } from "../_generated/dataModel";

const WORKFLOW_WEBHOOK_URL =
  "https://workflows.spinabot.com/api/webhooks/webhook?workflowId=cmibvtewu0001k004e4a4qke6";

const loadInternalApi = async (): Promise<any> =>
  (await import("../_generated/api")).internal;


export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.union(
      v.literal("unresolved"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
  },
  handler: async (ctx,args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }
    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const conversation = await ctx.db.get(args.conversationId);

      if (!conversation) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Conversation not found"
        });
      }

      if (conversation.organizationId !== orgId) {
        throw new ConvexError({
          code: "UNAUTHORIZED",
          message: "Invalid Organization ID"
        });
      }

      await ctx.db.patch(args.conversationId, {
        status: args.status,
      });



  },
})



export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }
    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }
    const conversation = await ctx.db.get(args.conversationId);

      if (!conversation) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Conversation not found"
        });
      }

      if (conversation.organizationId !== orgId) {
        throw new ConvexError({
          code: "UNAUTHORIZED",
          message: "Invalid Organization ID"
        });
      }
      const contactSession = await ctx.db.get(conversation.contactSessionId);

      if (!contactSession) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Contact Session not found"
        });
      }

      return{
        ...conversation,
        contactSession,
      };




  },
});



export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal("unresolved"),
        v.literal("escalated"),
        v.literal("resolved")
      )
    ),

  },
  handler: async (ctx, args) => {

    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }
    let conversations: PaginationResult<Doc<"conversations">>;
    if (args.status) {
      conversations = await ctx.db
        .query("conversations")
        .withIndex("by_status_and_organization_id", (q) =>
          q
            .eq(
              "status",
              args.status as Doc<"conversations">["status"],
            )
            .eq("organizationId", orgId)
            )
            .order("desc")
            .paginate(args.paginationOpts)

          }else {
              conversations = await ctx.db
                .query("conversations")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                .order("desc")
                .paginate(args.paginationOpts)
            }

            const conversationsWithAdditionalData = await Promise.all(
            conversations.page.map(async (conversation) => {
              let lastMessage: MessageDoc | null = null;

              const contactSession = await ctx.db.get(conversation.contactSessionId);

              if (!contactSession) {
                return null;
              }
              const messages = await supportAgent.listMessages(ctx, {
              threadId: conversation.threadId,
              paginationOpts: { numItems: 1, cursor: null },
            });

            if (messages.page.length > 0) {
              lastMessage = messages.page[0] ?? null;
            }

            return {
              ...conversation,
              lastMessage,
              contactSession,
            };
          })
        );

        const validConversations = conversationsWithAdditionalData.filter(
          (conv): conv is NonNullable<typeof conv> => conv !== null,
        );

        return {
          ...conversations,
          page: validConversations,
        };








 },
});

export const exportToJson = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }
    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found"
      });
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID"
      });
    }

    const contactSession = await ctx.db.get(conversation.contactSessionId);

    if (!contactSession) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact Session not found"
      });
    }

    // Get messages in smaller batches to avoid timeout
    const messagesPage = await supportAgent.listMessages(ctx, {
      threadId: conversation.threadId,
      paginationOpts: { numItems: 50, cursor: null },
    });

    // Build clean JSON object focused on conversation content
    const conversationJson = {
      conversationDetails: {
        caseId: conversation.caseId,
        status: conversation.status,
        customerName: contactSession.name,
        customerEmail: contactSession.email,
        createdAt: new Date(conversation._creationTime).toISOString(),
      },
      messages: messagesPage.page.reverse().map((msg) => {
        const role = msg.message?.role || "unknown";
        return {
          from: role === "user" ? "Customer" : "Assistant",
          message: msg.text || "",
        };
      }),
      exportInfo: {
        totalMessages: messagesPage.page.length,
        hasMoreMessages: messagesPage.continueCursor !== null,
        exportedAt: new Date().toISOString(),
        exportedBy: identity.email || identity.subject,
      },
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(conversationJson, null, 2);

    // Store in database
    await ctx.db.patch(args.conversationId, {
      json: jsonString,
    });

    return jsonString;
  },
});

export const exportJsonAndNotify = action({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const internalApi = await loadInternalApi();
    const jsonString = await ctx.runMutation(
      internalApi.private.conversations.exportToJson,
      args,
    );

    let webhookPosted = false;
    try {
      const parsed = JSON.parse(jsonString);
      const payload = {
        conversationId: args.conversationId,
        caseId: parsed.conversationDetails?.caseId ?? null,
        exportedAt: parsed.exportInfo?.exportedAt ?? new Date().toISOString(),
        data: parsed,
      };

      const response = await fetch(WORKFLOW_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      webhookPosted = response.ok;
      if (!response.ok) {
        console.error(
          `Failed to forward export to workflow webhook: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("Error forwarding export to workflow webhook", error);
    }

    return { jsonString, webhookPosted };
  },
});

