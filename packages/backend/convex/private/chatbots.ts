import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { nanoid } from "nanoid";

export const create = mutation({
  args: {
    name: v.string(),
    knowledgeBaseId: v.id("knowledgeBases"),
    greetMessage: v.string(),
    customSystemPrompt: v.optional(v.string()),
    appearance: v.optional(v.object({
      primaryColor: v.optional(v.string()),
      size: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
    })),
    defaultSuggestions: v.object({
      suggestion1: v.optional(v.string()),
      suggestion2: v.optional(v.string()),
      suggestion3: v.optional(v.string()),
    }),
    vapiSettings: v.object({
      assistantId: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
    }),
    isDefault: v.optional(v.boolean()),
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

    // Verify knowledge base exists and belongs to organization
    const knowledgeBase = await ctx.db.get(args.knowledgeBaseId);
    if (!knowledgeBase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Knowledge base not found",
      });
    }

    if (knowledgeBase.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Knowledge base does not belong to your organization",
      });
    }

    const chatbotId = `chatbot_${nanoid(16)}`;
    const now = Date.now();

    // If this is marked as default, unset any existing default chatbot
    if (args.isDefault) {
      const existingDefaultChatbots = await ctx.db
        .query("chatbots")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const chatbot of existingDefaultChatbots) {
        await ctx.db.patch(chatbot._id, { isDefault: false });
      }
    }

    const id = await ctx.db.insert("chatbots", {
      organizationId: orgId,
      name: args.name,
      chatbotId,
      knowledgeBaseId: args.knowledgeBaseId,
      greetMessage: args.greetMessage,
      customSystemPrompt: args.customSystemPrompt,
      appearance: args.appearance,
      defaultSuggestions: args.defaultSuggestions,
      vapiSettings: args.vapiSettings,
      isDefault: args.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return { id, chatbotId };
  },
});

export const update = mutation({
  args: {
    chatbotId: v.string(),
    name: v.string(),
    knowledgeBaseId: v.id("knowledgeBases"),
    greetMessage: v.string(),
    customSystemPrompt: v.optional(v.string()),
    appearance: v.optional(v.object({
      primaryColor: v.optional(v.string()),
      size: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
    })),
    defaultSuggestions: v.object({
      suggestion1: v.optional(v.string()),
      suggestion2: v.optional(v.string()),
      suggestion3: v.optional(v.string()),
    }),
    vapiSettings: v.object({
      assistantId: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
    }),
    isDefault: v.optional(v.boolean()),
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

    const chatbot = await ctx.db
      .query("chatbots")
      .withIndex("by_chatbot_id", (q) => q.eq("chatbotId", args.chatbotId))
      .unique();

    if (!chatbot) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Chatbot not found",
      });
    }

    if (chatbot.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to update this chatbot",
      });
    }

    // Verify knowledge base exists and belongs to organization
    const knowledgeBase = await ctx.db.get(args.knowledgeBaseId);
    if (!knowledgeBase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Knowledge base not found",
      });
    }

    if (knowledgeBase.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Knowledge base does not belong to your organization",
      });
    }

    // If this is being set as default, unset any existing default chatbot
    if (args.isDefault && !chatbot.isDefault) {
      const existingDefaultChatbots = await ctx.db
        .query("chatbots")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const defaultChatbot of existingDefaultChatbots) {
        await ctx.db.patch(defaultChatbot._id, { isDefault: false });
      }
    }

    await ctx.db.patch(chatbot._id, {
      name: args.name,
      knowledgeBaseId: args.knowledgeBaseId,
      greetMessage: args.greetMessage,
      customSystemPrompt: args.customSystemPrompt,
      appearance: args.appearance,
      defaultSuggestions: args.defaultSuggestions,
      vapiSettings: args.vapiSettings,
      isDefault: args.isDefault ?? chatbot.isDefault,
      updatedAt: Date.now(),
    });
  },
});

export const deleteChatbot = mutation({
  args: {
    chatbotId: v.string(),
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

    const chatbot = await ctx.db
      .query("chatbots")
      .withIndex("by_chatbot_id", (q) => q.eq("chatbotId", args.chatbotId))
      .unique();

    if (!chatbot) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Chatbot not found",
      });
    }

    if (chatbot.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to delete this chatbot",
      });
    }

    // Prevent deleting the default chatbot if it's the only one
    if (chatbot.isDefault) {
      const allChatbots = await ctx.db
        .query("chatbots")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
        .collect();

      if (allChatbots.length === 1) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Cannot delete the last chatbot",
        });
      }
    }

    await ctx.db.delete(chatbot._id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
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

    const chatbots = await ctx.db
      .query("chatbots")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .collect();

    return chatbots;
  },
});

export const getOne = query({
  args: {
    chatbotId: v.string(),
  },
  handler: async (ctx, args) => {
    const chatbot = await ctx.db
      .query("chatbots")
      .withIndex("by_chatbot_id", (q) => q.eq("chatbotId", args.chatbotId))
      .unique();

    if (!chatbot) {
      return null;
    }

    return chatbot;
  },
});

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
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

    const defaultChatbot = await ctx.db
      .query("chatbots")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    return defaultChatbot;
  },
});

