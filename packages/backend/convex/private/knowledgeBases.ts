import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { nanoid } from "nanoid";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
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

    const knowledgeBaseId = `kb_${nanoid(16)}`;
    const ragNamespace = `${orgId}_${knowledgeBaseId}`;
    const now = Date.now();

    const id = await ctx.db.insert("knowledgeBases", {
      organizationId: orgId,
      name: args.name,
      knowledgeBaseId,
      description: args.description,
      ragNamespace,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const update = mutation({
  args: {
    knowledgeBaseId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
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

    const knowledgeBase = await ctx.db
      .query("knowledgeBases")
      .withIndex("by_knowledge_base_id", (q) => q.eq("knowledgeBaseId", args.knowledgeBaseId))
      .unique();

    if (!knowledgeBase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Knowledge base not found",
      });
    }

    if (knowledgeBase.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to update this knowledge base",
      });
    }

    await ctx.db.patch(knowledgeBase._id, {
      name: args.name,
      description: args.description,
      updatedAt: Date.now(),
    });
  },
});

export const deleteKnowledgeBase = mutation({
  args: {
    knowledgeBaseId: v.string(),
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

    const knowledgeBase = await ctx.db
      .query("knowledgeBases")
      .withIndex("by_knowledge_base_id", (q) => q.eq("knowledgeBaseId", args.knowledgeBaseId))
      .unique();

    if (!knowledgeBase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Knowledge base not found",
      });
    }

    if (knowledgeBase.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to delete this knowledge base",
      });
    }

    // Check if any chatbots are using this knowledge base
    const chatbotsUsingKB = await ctx.db
      .query("chatbots")
      .withIndex("by_knowledge_base_id", (q) => q.eq("knowledgeBaseId", knowledgeBase._id))
      .collect();

    if (chatbotsUsingKB.length > 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Cannot delete knowledge base that is in use by chatbots",
      });
    }

    await ctx.db.delete(knowledgeBase._id);
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

    const knowledgeBases = await ctx.db
      .query("knowledgeBases")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .collect();

    return knowledgeBases;
  },
});

export const getOne = query({
  args: {
    knowledgeBaseId: v.string(),
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

    const knowledgeBase = await ctx.db
      .query("knowledgeBases")
      .withIndex("by_knowledge_base_id", (q) => q.eq("knowledgeBaseId", args.knowledgeBaseId))
      .unique();

    if (!knowledgeBase) {
      return null;
    }

    if (knowledgeBase.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized to access this knowledge base",
      });
    }

    return knowledgeBase;
  },
});
