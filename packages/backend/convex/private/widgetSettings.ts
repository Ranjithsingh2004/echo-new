import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";



export const upsert = mutation({
  args: {
    chatbotName: v.optional(v.string()),
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

    const existingWidgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (existingWidgetSettings) {
      await ctx.db.patch(existingWidgetSettings._id, {
        chatbotName: args.chatbotName,
        greetMessage: args.greetMessage,
        customSystemPrompt: args.customSystemPrompt,
        appearance: args.appearance,
        defaultSuggestions: args.defaultSuggestions,
        vapiSettings: args.vapiSettings,
      });
    }else {
      await ctx.db.insert("widgetSettings", {
        organizationId: orgId,
        chatbotName: args.chatbotName,
        greetMessage: args.greetMessage,
        customSystemPrompt: args.customSystemPrompt,
        appearance: args.appearance,
        defaultSuggestions: args.defaultSuggestions,
        vapiSettings: args.vapiSettings,
      });
    }

  },
});


export const getOne = query({
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

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    return widgetSettings;
  },
});











