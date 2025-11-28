import { v } from "convex/values";
import { query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";

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

type WidgetAppearance = Doc<"widgetSettings">["appearance"];

type ResolvedWidgetAppearance =
  | undefined
  | (Omit<NonNullable<WidgetAppearance>, "logo"> & {
      logo?: ResolvedWidgetLogo;
    });
type ResolvedWidgetLogo = WidgetLogo & { url?: string | null };
type WidgetLogo = NonNullable<NonNullable<WidgetAppearance>["logo"]>;
type WidgetSettingsDoc = Doc<"widgetSettings">;
type WidgetSettingsWithResolvedAppearance = Omit<WidgetSettingsDoc, "appearance"> & {
  appearance?: ResolvedWidgetAppearance;
};

type ChatbotSettings = {
  chatbotId?: string;
  chatbotName: string;
  greetMessage: string;
  customSystemPrompt?: string;
  appearance?: ResolvedWidgetAppearance;
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
  handler: async (ctx, args): Promise<ChatbotSettings | WidgetSettingsWithResolvedAppearance | null> => {
    // If chatbotId is provided, get that chatbot's settings
    if (args.chatbotId) {
      const chatbot: Doc<"chatbots"> | null = await ctx.runQuery(
        internal.system.chatbots.getByChatbotId,
        { chatbotId: args.chatbotId }
      );

      if (chatbot && chatbot.organizationId === args.organizationId) {
        const appearance = await resolveAppearance(ctx, chatbot.appearance as WidgetAppearance);
        return {
          chatbotId: chatbot.chatbotId,
          chatbotName: chatbot.name,
          greetMessage: chatbot.greetMessage,
          customSystemPrompt: chatbot.customSystemPrompt,
          appearance,
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
      const appearance = await resolveAppearance(ctx, defaultChatbot.appearance as WidgetAppearance);
      return {
        chatbotId: defaultChatbot.chatbotId,
        chatbotName: defaultChatbot.name,
        greetMessage: defaultChatbot.greetMessage,
        customSystemPrompt: defaultChatbot.customSystemPrompt,
        appearance,
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

    if (!widgetSettings) {
      return null;
    }

    const appearance = await resolveAppearance(ctx, widgetSettings.appearance);

    return {
      ...widgetSettings,
      appearance,
    } as WidgetSettingsWithResolvedAppearance;
  },
});

async function resolveAppearance(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  appearance?: WidgetAppearance,
): Promise<ResolvedWidgetAppearance> {
  if (!appearance || !appearance.logo) {
    return appearance;
  }

  const logo = await resolveLogo(ctx, appearance.logo);

  if (!logo) {
    const clone = { ...appearance } as Record<string, unknown>;
    delete clone.logo;
    return clone as ResolvedWidgetAppearance;
  }

  return {
    ...appearance,
    logo,
  } as ResolvedWidgetAppearance;
}

async function resolveLogo(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  logo?: WidgetLogo,
): Promise<ResolvedWidgetLogo | undefined> {
  if (!logo) {
    return undefined;
  }

  if (logo.type === "upload" && logo.storageId) {
    const url = await ctx.storage.getUrl(logo.storageId);
    if (!url) {
      return undefined;
    }

    return {
      ...logo,
      url,
    };
  }

  if (logo.type === "url") {
    return {
      ...logo,
      url: logo.externalUrl,
    };
  }

  return logo;
}
