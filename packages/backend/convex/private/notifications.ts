import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";

// Get notifications for current user
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .take(args.limit ?? 50);

    console.log(`[notifications.list] Found ${notifications.length} notifications for org ${orgId}`);

    return notifications;
  },
});

// Get unread count
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return 0;
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_organization_id_and_read", (q) =>
        q.eq("organizationId", orgId).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const orgId = identity.orgId as string;

    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Notification not found",
      });
    }

    if (notification.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

// Mark all as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_organization_id_and_read", (q) =>
        q.eq("organizationId", orgId).eq("read", false)
      )
      .collect();

    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const orgId = identity.orgId as string;

    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Notification not found",
      });
    }

    if (notification.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    await ctx.db.delete(args.notificationId);
  },
});

// Delete all notifications for current user
export const deleteAll = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const orgId = identity.orgId as string;

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .collect();

    await Promise.all(
      notifications.map((notification) => ctx.db.delete(notification._id))
    );

    return { deleted: notifications.length };
  },
});

// Internal: Create notification
export const create = internalMutation({
  args: {
    organizationId: v.string(),
    type: v.union(
      v.literal("file_ready"),
      v.literal("file_failed"),
      v.literal("file_processing")
    ),
    title: v.string(),
    message: v.string(),
    fileId: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`[notifications.create] Creating notification for org ${args.organizationId}, type: ${args.type}, title: ${args.title}`);
    
    await ctx.db.insert("notifications", {
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      message: args.message,
      fileId: args.fileId,
      fileName: args.fileName,
      read: false,
      createdAt: Date.now(),
    });
    
    console.log(`[notifications.create] Notification created successfully`);
  },
});

// Internal: Get notifications by fileId
export const listByFileId = internalQuery({
  args: {
    organizationId: v.string(),
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .collect();

    return notifications;
  },
});

// Internal: Get notifications by fileName (displayName)
export const listByFileName = internalQuery({
  args: {
    organizationId: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("fileName"), args.fileName))
      .collect();

    return notifications;
  },
});

// Internal: Delete notification by ID
export const deleteById = internalMutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
  },
});
