import { mutation,query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { MessageDoc,saveMessage } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";
import { generateCaseId } from "../lib/generateCaseId";

export const getMany = query({
  args: {
    contactSessionId: v.id("contactSessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", args.contactSessionId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

      const conversationsWithLastMessage = await Promise.all(
        conversations.page.map(async (conversation) => {
          let lastMessage: MessageDoc | null = null;

          const messages = await supportAgent.listMessages(ctx, {
            threadId: conversation.threadId,
            paginationOpts: { numItems: 1, cursor: null },
          });

          if (messages.page.length > 0) {
            lastMessage = messages.page[0] ?? null;
          }

          return {
            _id: conversation._id,
            _creationTime: conversation._creationTime,
            status: conversation.status,
            organizationId: conversation.organizationId,
            threadId: conversation.threadId,
            caseId: conversation.caseId,
            lastMessage,
          };

     




        })
      );



           return {
            ...conversations,
            page: conversationsWithLastMessage,
          };








  },
});



export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),

    },
    handler: async (ctx, args) => {
  const session = await ctx.db.get(args.contactSessionId);

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid session",
    });
  }

    const conversation = await ctx.db.get(args.conversationId);

    if(!conversation){
       throw new ConvexError({
            code: "NOT_FOUND",
            message: "Conversation not found",
        });
    }
    if (conversation.contactSessionId !== session._id) {
        throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Incorrect session",
        });
        }


    return {
        _id: conversation._id,
        status: conversation.status,
        threadId: conversation.threadId,
        caseId: conversation.caseId,
    };






  },

  })

export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    chatbotId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
            code: "UNAUTHORIZED",
            message: "Invalid session",
            });

    }

    await ctx.runMutation(internal.system.contactSessions.refresh, {
          contactSessionId: args.contactSessionId,
        });

    // Determine which chatbot to use
    let chatbotToUse = null;
    let greetMessage = "Hello, how can I help you?";

    console.log("[conversations.create] Received chatbotId:", args.chatbotId);
    console.log("[conversations.create] Organization ID:", args.organizationId);

    if (args.chatbotId) {
      // Use specified chatbot
      const cbId = args.chatbotId;
      console.log("[conversations.create] Querying for chatbot with ID:", cbId);
      chatbotToUse = await ctx.db
        .query("chatbots")
        .withIndex("by_chatbot_id", (q) => q.eq("chatbotId", cbId))
        .unique();

      console.log("[conversations.create] Found chatbot:", chatbotToUse ? chatbotToUse.name : "null");
      console.log("[conversations.create] Chatbot KB ID:", chatbotToUse?.knowledgeBaseId);

      if (chatbotToUse && chatbotToUse.organizationId === args.organizationId) {
        greetMessage = chatbotToUse.greetMessage;
      }
    } else {
      // Use default chatbot
      chatbotToUse = await ctx.db
        .query("chatbots")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .first();

      if (chatbotToUse) {
        greetMessage = chatbotToUse.greetMessage;
      } else {
        // Fallback: widgetSettings for backward compatibility
        const widgetSettings = await ctx.db
          .query("widgetSettings")
          .withIndex("by_organization_id", (q) =>
            q.eq("organizationId", args.organizationId),
          )
          .unique();

        if (widgetSettings) {
          greetMessage = widgetSettings.greetMessage;
        }
      }
    }


    const { threadId } = await supportAgent.createThread(ctx, {
      userId: args.organizationId,
    });

    await saveMessage(ctx, components.agent, {
      threadId,
      message: {
        role: "assistant",
        content: greetMessage,
      },
    });





    const caseId = generateCaseId();

    const conversationId = await ctx.db.insert("conversations", {
        contactSessionId: session._id,
        status: "unresolved",
        organizationId: args.organizationId,
        chatbotId: chatbotToUse?._id,
        threadId,
        caseId,
    });

    return conversationId;








  },
});
