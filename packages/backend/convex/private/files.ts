import { ConvexError, v } from "convex/values";
import {guessMimeTypeFromContents,guessMimeTypeFromExtension} from "@convex-dev/rag";
import { action, mutation, query, QueryCtx } from "../_generated/server";
import { extractTextContent } from "../lib/extractTextContent";
import rag from "../system/ai/rag";
import { contentHashFromArrayBuffer } from "@convex-dev/rag";
import { vEntryId } from "@convex-dev/rag";
import { Id } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import { Entry } from "@convex-dev/rag";
import { EntryId } from "@convex-dev/rag";
import { internal } from "../_generated/api";

function guessMimeType(filename: string, bytes: ArrayBuffer): string {
  return (
    guessMimeTypeFromExtension(filename) ||
    guessMimeTypeFromContents(bytes) ||
    "application/octet-stream"
  );
};

export const deleteFile = mutation({
  args: {
    entryId: vEntryId,
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

        const namespace = await rag.getNamespace(ctx, {
  namespace: orgId,
});

if (!namespace) {
  throw new ConvexError({
    code: "UNAUTHORIZED",
    message: "Invalid namespace",
  });
}
const entry = await rag.getEntry(ctx, {
  entryId: args.entryId,
});

if (!entry) {
  throw new ConvexError({
    code: "NOT_FOUND",
    message: "Entry not found",
  });
}

if (entry.metadata?.uploadedBy !== orgId) {
  throw new ConvexError({
    code: "UNAUTHORIZED",
    message: "Invalid Organization ID",
  });
}

if (entry.metadata?.storageId) {
  await ctx.storage.delete(entry.metadata.storageId as Id<"_storage">);
}

await rag.deleteAsync(ctx, {
  entryId: args.entryId
});




  },
});







export const addFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    category: v.optional(v.string()),
    knowledgeBaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Handler body to be implemented
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
        const subscription = await ctx.runQuery(
                internal.system.subscriptions.getByOrganizationId,
                {
                  organizationId: orgId,
                },
              );

              if (subscription?.status !== "active") {
              throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Missing subscription"
              });
            }

        // Determine which namespace to use
        let namespace = orgId; // Default fallback to orgId for backward compatibility

        if (args.knowledgeBaseId) {
          // Get the knowledge base to use its RAG namespace
          const knowledgeBase = await ctx.runQuery(
            internal.system.knowledgeBases.getByKnowledgeBaseId,
            { knowledgeBaseId: args.knowledgeBaseId }
          );

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

          namespace = knowledgeBase.ragNamespace;
        }

        const { bytes, filename, category} = args;

        const mimeType = args.mimeType || guessMimeType(filename, bytes);

        const blob = new Blob([bytes], { type: mimeType });

        const storageId = await ctx.storage.store(blob);

        const text = await extractTextContent(ctx, {
            storageId,
            filename,
            bytes,
            mimeType,
            });

            const {entryId,created} = await rag.add(ctx, {
  // SUPER IMPORTANT: What search space to add to
  // If not added, it will be considered global
  namespace: namespace,
  text,
  key: filename,
  title: filename,
  metadata: {
    storageId,
    uploadedBy:orgId,
    filename,
    category:category ?? null,
    knowledgeBaseId: args.knowledgeBaseId ?? null,


     } as EntryMetadata,
     contentHash: await contentHashFromArrayBuffer(bytes)

  });
  if (!created) {
  console.debug("entry already exists, skipping upload metadata");
  await ctx.storage.delete(storageId);
}

return {
  url: await ctx.storage.getUrl(storageId),
  entryId,
};



 },
});

export const list = query({
  args: {
    category: v.optional(v.string()),
    knowledgeBaseId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
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

        // If knowledgeBaseId is provided, query that specific namespace
        if (args.knowledgeBaseId) {
          const kbId = args.knowledgeBaseId;
          const knowledgeBase = await ctx.db
            .query("knowledgeBases")
            .withIndex("by_knowledge_base_id", (q) => q.eq("knowledgeBaseId", kbId))
            .unique();

          if (!knowledgeBase) {
            return { page: [], isDone: true, continueCursor: "" };
          }

          if (knowledgeBase.organizationId !== orgId) {
            throw new ConvexError({
              code: "UNAUTHORIZED",
              message: "Knowledge base does not belong to your organization",
            });
          }

          try {
            const namespace = await rag.getNamespace(ctx, {
              namespace: knowledgeBase.ragNamespace,
            });

            if (!namespace) {
              return { page: [], isDone: true, continueCursor: "" };
            }

            const results = await rag.list(ctx, {
              namespaceId: namespace.namespaceId,
              paginationOpts: args.paginationOpts,
            });

            const files = await Promise.all(
              results.page.map((entry) => convertEntryToPublicFile(ctx, entry))
            );

            return {
              page: files,
              isDone: results.isDone,
              continueCursor: results.continueCursor,
            };
          } catch (error) {
            console.error("Error getting namespace:", error);
            return { page: [], isDone: true, continueCursor: "" };
          }
        }

        // No knowledgeBaseId: query ALL knowledge bases for this organization
        const allKnowledgeBases = await ctx.db
          .query("knowledgeBases")
          .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
          .collect();

        let allFiles: Awaited<ReturnType<typeof convertEntryToPublicFile>>[] = [];

        // Query each knowledge base namespace
        for (const kb of allKnowledgeBases) {
          try {
            const namespace = await rag.getNamespace(ctx, {
              namespace: kb.ragNamespace,
            });

            if (!namespace) continue;

            const results = await rag.list(ctx, {
              namespaceId: namespace.namespaceId,
              paginationOpts: { numItems: 100, cursor: null }, // Get more items for aggregation
            });

            const files = await Promise.all(
              results.page.map((entry) => convertEntryToPublicFile(ctx, entry))
            );

            allFiles = allFiles.concat(files);
          } catch (error) {
            console.error(`Error querying KB ${kb.name}:`, error);
            continue;
          }
        }

        // Sort by most recent first
        allFiles.sort((a, b) => {
          // Assuming files don't have creation time, we'll keep original order
          return 0;
        });

        // Apply category filter if specified
        if (args.category) {
          allFiles = allFiles.filter((file) => file.category === args.category);
        }

        // Simple pagination - take first N items
        const pageSize = args.paginationOpts.numItems;
        const paginatedFiles = allFiles.slice(0, pageSize);

        return {
          page: paginatedFiles,
          isDone: paginatedFiles.length < pageSize,
          continueCursor: "",
        };
  },
});

export type PublicFile = {
  id: EntryId,
  name: string,
  originalFilename?: string,
  type: string,
  size: string,
  status: "ready" | "processing" | "error",
  url: string | null,
  category?: string,
  knowledgeBaseId?: string | null,
};

type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  filename: string;
  category: string | null;
  knowledgeBaseId: string | null;
};


async function convertEntryToPublicFile(
  ctx: QueryCtx,
  entry: Entry,
): Promise<PublicFile> {
  const metadata = entry.metadata as EntryMetadata | undefined;
  const storageId = metadata?.storageId;

  let fileSize = "unknown";

  if (storageId) {
    try {
      const storageMetadata = await ctx.db.system.get(storageId);
      if (storageMetadata) {
        fileSize = formatFileSize(storageMetadata.size);
      }
    }
    catch (error) {
  console.error("Failed to get storage metadata: ", error);
}}


    const filename = entry.key || "Unknown";
const extension = filename.split(".").pop()?.toLowerCase() || "txt";

let status: "ready" | "processing" | "error" = "error";
if (entry.status === "ready") {
  status = "ready";
} else if (entry.status === "pending") {
  status = "processing";
}

const url = storageId ? await ctx.storage.getUrl(storageId) : null;

return {
  id: entry.entryId,
  name: filename,
  originalFilename: metadata?.filename || undefined,
  type: extension,
  size: fileSize,
  status,
  url,
  category: metadata?.category || undefined,
  knowledgeBaseId: metadata?.knowledgeBaseId || undefined,
}




  };



    function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}



            





