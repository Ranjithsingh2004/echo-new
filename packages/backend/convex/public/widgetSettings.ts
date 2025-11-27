import { v } from "convex/values";
import { query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";

export const getByOrganizationId = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation here...
    const widgetSettings = await ctx.db
            .query("widgetSettings")
            .withIndex("by_organization_id", (q) =>
              q.eq("organizationId", args.organizationId),
            )
            .unique();
        return widgetSettings;
  },
});

type ChatbotSettings = {
  chatbotId?: string;
  chatbotName: string;
  greetMessage: string;
  customSystemPrompt?: string;
  appearance?: {
    primaryColor?: string;
    size?: "small" | "medium" | "large";
  };
  defaultSuggestions: {
    suggestion1?: string;
    suggestion2?: string;
    suggestion3?: string;
  };
  vapiSettings: {
    assistantId?: string;
    phoneNumber?: string;
  };
};

// New query to get chatbot settings for widget
export const getChatbotSettings = query({
  args: {
    organizationId: v.string(),
    chatbotId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ChatbotSettings | Doc<"widgetSettings"> | null> => {
    // If chatbotId is provided, get that chatbot's settings
    if (args.chatbotId) {
      const chatbot: Doc<"chatbots"> | null = await ctx.runQuery(
        internal.system.chatbots.getByChatbotId,
        { chatbotId: args.chatbotId }
      );

      if (chatbot && chatbot.organizationId === args.organizationId) {
        return {
          chatbotId: chatbot.chatbotId,
          chatbotName: chatbot.name,
          greetMessage: chatbot.greetMessage,
          customSystemPrompt: chatbot.customSystemPrompt,
          appearance: chatbot.appearance,
          defaultSuggestions: chatbot.defaultSuggestions,
          vapiSettings: chatbot.vapiSettings,
        };
      }
    }

    // Get default chatbot for organization
    const defaultChatbot = await ctx.db
      .query("chatbots")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (defaultChatbot) {
      return {
        chatbotId: defaultChatbot.chatbotId,
        chatbotName: defaultChatbot.name,
        greetMessage: defaultChatbot.greetMessage,
        customSystemPrompt: defaultChatbot.customSystemPrompt,
        appearance: defaultChatbot.appearance,
        defaultSuggestions: defaultChatbot.defaultSuggestions,
        vapiSettings: defaultChatbot.vapiSettings,
      };
    }

    // Final fallback: legacy widgetSettings
    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    return widgetSettings;
  },
});
