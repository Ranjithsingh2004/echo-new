import { ConvexError, v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { nanoid } from "nanoid";
import { appearanceInputSchema, appearanceSchema } from "../schema";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";

const MAX_LOGO_BYTES = 64 * 1024; // 64KB
const SVG_MIME_TYPE = "image/svg+xml";

export const create = mutation({
  args: {
    name: v.string(),
    knowledgeBaseId: v.id("knowledgeBases"),
    greetMessage: v.string(),
    customSystemPrompt: v.optional(v.string()),
    appearance: v.optional(appearanceInputSchema),
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

    const appearance = mergeAppearance(undefined, args.appearance);

    const id = await ctx.db.insert("chatbots", {
      organizationId: orgId,
      name: args.name,
      chatbotId,
      knowledgeBaseId: args.knowledgeBaseId,
      greetMessage: args.greetMessage,
      customSystemPrompt: args.customSystemPrompt,
      appearance,
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
    appearance: v.optional(appearanceInputSchema),
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
      appearance: mergeAppearance(chatbot.appearance, args.appearance),
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

export const uploadLogo = action({
  args: {
    chatbotId: v.string(),
    filename: v.string(),
    mimeType: v.optional(v.string()),
    bytes: v.bytes(),
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

    if (args.bytes.byteLength > MAX_LOGO_BYTES) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Logo is too large (max 64KB)",
      });
    }

    const chatbot = await ctx.runQuery(internal.system.chatbots.getByChatbotId, {
      chatbotId: args.chatbotId,
    });

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

    const sanitizedSvg = sanitizeSvg(args.bytes);
    const blob = new Blob([sanitizedSvg], { type: SVG_MIME_TYPE });
    const storageId = await ctx.storage.store(blob);
    const now = Date.now();

    await ctx.runMutation(internal.private.chatbots.applyUploadedLogo, {
      chatbotId: chatbot._id,
      logo: {
        type: "upload",
        storageId,
        fileName: args.filename,
        mimeType: SVG_MIME_TYPE,
        size: blob.size,
        updatedAt: now,
      },
    });

    const url = await ctx.storage.getUrl(storageId);

    return {
      logo: {
        type: "upload" as const,
        storageId,
        fileName: args.filename,
        mimeType: SVG_MIME_TYPE,
        size: blob.size,
        updatedAt: now,
        url,
      },
    };
  },
});

export const setLogo = mutation({
  args: {
    chatbotId: v.string(),
    logo: v.union(
      v.object({ type: v.literal("default") }),
      v.object({ type: v.literal("url"), url: v.string() }),
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

    const updatedAppearance = { ...(chatbot.appearance ?? {}) } as Record<string, unknown>;

    if (args.logo.type === "default") {
      await deleteStoredLogo(ctx, chatbot.appearance?.logo);
      delete updatedAppearance.logo;
    } else {
      const parsedUrl = safeSvgUrl(args.logo.url);
      await deleteStoredLogo(ctx, chatbot.appearance?.logo);
      updatedAppearance.logo = {
        type: "url",
        externalUrl: parsedUrl,
        updatedAt: Date.now(),
      };
    }

    await ctx.db.patch(chatbot._id, {
      appearance: Object.keys(updatedAppearance).length ? (updatedAppearance as ChatbotDoc["appearance"]) : undefined,
      updatedAt: Date.now(),
    });
  },
});

export const applyUploadedLogo = internalMutation({
  args: {
    chatbotId: v.id("chatbots"),
    logo: v.object({
      type: v.literal("upload"),
      storageId: v.id("_storage"),
      fileName: v.optional(v.string()),
      mimeType: v.optional(v.string()),
      size: v.optional(v.number()),
      updatedAt: v.number(),
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

    const chatbot = await ctx.db.get(args.chatbotId);

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

    await deleteStoredLogo(ctx, chatbot.appearance?.logo);

    await ctx.db.patch(chatbot._id, {
      appearance: {
        ...(chatbot.appearance ?? {}),
        logo: args.logo,
      },
      updatedAt: Date.now(),
    });
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

    return Promise.all(
      chatbots.map(async (chatbot): Promise<ChatbotWithResolvedAppearance> => ({
        ...chatbot,
        appearance: await resolveAppearance(ctx, chatbot.appearance),
      })),
    );
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

    return {
      ...chatbot,
      appearance: await resolveAppearance(ctx, chatbot.appearance),
    } as ChatbotWithResolvedAppearance;
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

    if (!defaultChatbot) {
      return null;
    }

    return {
      ...defaultChatbot,
      appearance: await resolveAppearance(ctx, defaultChatbot.appearance),
    } as ChatbotWithResolvedAppearance;
  },
});

type ChatbotDoc = Doc<"chatbots">;
type ChatbotAppearance = ChatbotDoc["appearance"];
type ChatbotLogo = NonNullable<NonNullable<ChatbotAppearance>["logo"]>;
type ChatbotLogoInput = ChatbotLogo & { url?: string | null };
type ChatbotAppearanceInput =
  | undefined
  | (Omit<NonNullable<ChatbotAppearance>, "logo"> & { logo?: ChatbotLogoInput });
type ResolvedChatbotLogo = ChatbotLogo & { url?: string | null };
type ResolvedChatbotAppearance =
  | undefined
  | (Omit<NonNullable<ChatbotAppearance>, "logo"> & {
      logo?: ResolvedChatbotLogo;
    });
type ChatbotWithResolvedAppearance = Omit<ChatbotDoc, "appearance"> & {
  appearance?: ResolvedChatbotAppearance;
};

async function resolveAppearance(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  appearance?: ChatbotAppearance,
): Promise<ResolvedChatbotAppearance> {
  if (!appearance || !appearance.logo) {
    return appearance;
  }

  const logo = await resolveLogo(ctx, appearance.logo);

  if (!logo) {
    const clone = { ...appearance } as Record<string, unknown>;
    delete clone.logo;
    return clone as ResolvedChatbotAppearance;
  }

  return {
    ...appearance,
    logo,
  } as ResolvedChatbotAppearance;
}

async function resolveLogo(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  logo?: ChatbotLogo,
): Promise<ResolvedChatbotLogo | undefined> {
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

function mergeAppearance(
  current?: ChatbotAppearance,
  incoming?: ChatbotAppearanceInput,
): ChatbotAppearance | undefined {
  if (!incoming || Object.keys(incoming).length === 0) {
    return current;
  }

  const merged: Record<string, unknown> = { ...(current ?? {}) };

  if (Object.prototype.hasOwnProperty.call(incoming, "primaryColor")) {
    if (incoming.primaryColor) {
      merged.primaryColor = incoming.primaryColor;
    } else {
      delete merged.primaryColor;
    }
  }

  if (Object.prototype.hasOwnProperty.call(incoming, "size")) {
    if (incoming.size) {
      merged.size = incoming.size;
    } else {
      delete merged.size;
    }
  }

  return Object.keys(merged).length ? (merged as ChatbotAppearance) : undefined;
}

async function deleteStoredLogo(
  ctx: { storage: { delete: (id: Id<"_storage">) => Promise<void> } },
  logo?: ChatbotLogo,
) {
  if (logo?.type === "upload" && logo.storageId) {
    await ctx.storage.delete(logo.storageId);
  }
}

function sanitizeSvg(bytes: ArrayBuffer): string {
  const decoder = new TextDecoder();
  const raw = decoder.decode(bytes).replace(/^\uFEFF/, "").trim();

  if (!raw) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "SVG file is empty",
    });
  }

  const cleaned = raw
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  if (!/^<svg[\s\S]*<\/svg>$/i.test(cleaned)) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Only inline SVG content is supported",
    });
  }

  if (/\son[a-z]+\s*=/gi.test(cleaned) || /javascript:/gi.test(cleaned) || /<\s*script/gi.test(cleaned)) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "SVG contains disallowed scripts or event handlers",
    });
  }

  return cleaned;
}

function safeSvgUrl(rawUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Invalid logo URL",
    });
  }

  if (parsed.protocol !== "https:") {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Logo URL must use https",
    });
  }

  if (!parsed.pathname.toLowerCase().endsWith(".svg")) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Logo URL must point to an SVG file",
    });
  }

  return parsed.toString();
}

