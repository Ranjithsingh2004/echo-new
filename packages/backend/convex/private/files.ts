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

const metadata = entry.metadata as EntryMetadata | undefined;
const storageId = metadata?.storageId;
const displayName = metadata?.displayName;
const knowledgeBaseId = metadata?.knowledgeBaseId;

// Determine the correct namespace to search in
let namespaceString = orgId; // Default fallback

if (knowledgeBaseId) {
  const knowledgeBase = await ctx.db
    .query("knowledgeBases")
    .withIndex("by_knowledge_base_id", (q) => q.eq("knowledgeBaseId", knowledgeBaseId))
    .unique();

  if (knowledgeBase) {
    namespaceString = knowledgeBase.ragNamespace;
    console.log(`[deleteFile] Using KB namespace: ${namespaceString}`);
  } else {
    console.log(`[deleteFile] KB not found, using orgId namespace: ${namespaceString}`);
  }
}

const namespace = await rag.getNamespace(ctx, {
  namespace: namespaceString,
});

if (!namespace) {
  throw new ConvexError({
    code: "NOT_FOUND",
    message: "Namespace not found",
  });
}

// Find and delete ALL chunks of this file
if (displayName && namespace) {
  const allEntries = await rag.list(ctx, {
    namespaceId: namespace.namespaceId,
    paginationOpts: { numItems: 1000, cursor: null }
  });

  let deletedCount = 0;
  for (const fileEntry of allEntries.page) {
    const fileMetadata = fileEntry.metadata as EntryMetadata | undefined;
    // Match by displayName (primary) and optionally storageId
    // If storageId is null/undefined (stuck file), still delete by displayName
    const nameMatches = fileMetadata?.displayName === displayName;
    const storageMatches = !storageId || fileMetadata?.storageId === storageId;

    if (nameMatches && storageMatches) {
      await rag.deleteAsync(ctx, {
        entryId: fileEntry.entryId
      });
      deletedCount++;
      console.log(`[deleteFile] Deleted chunk ${deletedCount}: ${fileEntry.entryId}`);
    }
  }

  console.log(`[deleteFile] Deleted ${deletedCount} total chunks for "${displayName}"`);

  if (deletedCount === 0) {
    console.warn(`[deleteFile] No chunks found for "${displayName}" - file might be corrupted`);
  }
} else {
  // Fallback: just delete the single entry
  console.log(`[deleteFile] Fallback: deleting single entry ${args.entryId}`);
  await rag.deleteAsync(ctx, {
    entryId: args.entryId
  });
}

// Delete the storage file AFTER all chunks are deleted (only once, with error handling)
if (storageId) {
  try {
    await ctx.storage.delete(storageId as Id<"_storage">);
    console.log(`[deleteFile] Successfully deleted storage file ${storageId}`);
  } catch (error) {
    // Storage might already be deleted, doesn't exist, or is corrupted - this is OK
    console.log(`[deleteFile] Could not delete storage ${storageId} (may already be deleted):`, error);
  }
} else {
  console.log(`[deleteFile] No storageId found - RAG entries deleted but storage was already gone`);
}




  },
});







export const addFile = action({
  args: {
    filename: v.string(),
    displayName: v.optional(v.string()),
    mimeType: v.string(),
    bytes: v.bytes(),
    category: v.optional(v.string()),
    knowledgeBaseId: v.optional(v.string()),
    sourceType: v.optional(v.union(v.literal("uploaded"), v.literal("scraped"))),
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

        const trimmedDisplayName = args.displayName?.trim();
        const displayName = trimmedDisplayName && trimmedDisplayName.length > 0 ? trimmedDisplayName : filename;

        const mimeType = args.mimeType || guessMimeType(filename, bytes);

        const blob = new Blob([bytes], { type: mimeType });

        const storageId = await ctx.storage.store(blob);

        const text = await extractTextContent(ctx, {
            storageId,
            filename,
            bytes,
            mimeType,
            });

            // Chunk large files for better RAG performance
            // Using 2000 chars (~500 tokens) with 20% overlap for better context preservation
            const chunks = chunkText(text, 2000, 400); // chunk size, overlap size
            console.log(`[addFile] Split "${displayName}" (${text.length} chars) into ${chunks.length} chunks with overlap`);

            // Add all chunks to RAG
            let entryId: string | undefined;
            let created = false;

            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              if (!chunk) {
                continue;
              }
              const chunkKey = chunks.length > 1 ? `${displayName} (part ${i + 1}/${chunks.length})` : displayName;

              // Create unique hash for each chunk to avoid deduplication
              const chunkBytes = new TextEncoder().encode(chunk);
              const chunkHash = await contentHashFromArrayBuffer(chunkBytes.buffer);

              const result = await rag.add(ctx, {
                namespace: namespace,
                text: chunk,
                key: chunkKey,
                title: displayName,
                metadata: {
                  storageId,
                  uploadedBy:orgId,
                  displayName,
                  originalFilename: filename,
                  category:category ?? null,
                  knowledgeBaseId: args.knowledgeBaseId ?? null,
                  sourceType: args.sourceType ?? "uploaded",
                  chunkIndex: i,
                  totalChunks: chunks.length,
                } as EntryMetadata,
                contentHash: chunkHash // Use chunk-specific hash instead of file hash
              });

              if (i === 0) {
                entryId = result.entryId;
                created = result.created;
              }

              console.log(`[addFile] Added chunk ${i + 1}/${chunks.length} for "${displayName}", created: ${result.created}`);
            }

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

            // Deduplicate files by displayName (only show first chunk of each file)
            const uniqueFiles = deduplicateFiles(files);

            return {
              page: uniqueFiles,
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

        // Deduplicate files by displayName (only show first chunk of each file)
        allFiles = deduplicateFiles(allFiles);

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
  sourceType?: "uploaded" | "scraped",
};

type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  displayName: string;
  originalFilename: string;
  category: string | null;
  knowledgeBaseId: string | null;
  sourceType: "uploaded" | "scraped";
  chunkIndex?: number;
  totalChunks?: number;
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


    const displayName = metadata?.displayName || entry.key || metadata?.originalFilename || "Unknown";
    const extensionSource = metadata?.originalFilename || displayName;
  const extension = extensionSource.split(".").pop()?.toLowerCase() || "txt";

let status: "ready" | "processing" | "error" = "error";
if (entry.status === "ready") {
  status = "ready";
} else if (entry.status === "pending") {
  status = "processing";
}

const url = storageId ? await ctx.storage.getUrl(storageId) : null;

return {
  id: entry.entryId,
  name: displayName,
  originalFilename: metadata?.originalFilename || undefined,
  type: extension,
  size: fileSize,
  status,
  url,
  category: metadata?.category || undefined,
  knowledgeBaseId: metadata?.knowledgeBaseId || undefined,
  sourceType: metadata?.sourceType || "uploaded",
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

/**
 * Deduplicate files by displayName, keeping only the first chunk
 * @param files Array of files to deduplicate
 * @returns Deduplicated array of files
 */
function deduplicateFiles(files: PublicFile[]): PublicFile[] {
  const seen = new Map<string, PublicFile>();

  for (const file of files) {
    // Use displayName + storageId as unique key
    const key = file.name;

    if (!seen.has(key)) {
      seen.set(key, file);
    }
  }

  return Array.from(seen.values());
}

/**
 * Advanced text chunking with overlap for RAG
 * Best practices: 512-1024 tokens (~2000-4000 chars) with 10-20% overlap
 * @param text - The text to chunk
 * @param chunkSize - Target size for each chunk in characters (default: 2000)
 * @param overlapSize - Number of characters to overlap between chunks (default: 400, which is 20%)
 */
function chunkText(text: string, chunkSize: number = 2000, overlapSize: number = 400): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    // If this is not the last chunk, try to break at a natural boundary
    if (endIndex < text.length) {
      // Try to find the last sentence boundary within the chunk
      const chunkText = text.slice(startIndex, endIndex);
      const lastPeriod = chunkText.lastIndexOf('. ');
      const lastNewline = chunkText.lastIndexOf('\n');
      const lastBreak = Math.max(lastPeriod, lastNewline);

      // If we found a good break point and it's not too far back (at least 70% of chunk size)
      if (lastBreak > chunkSize * 0.7) {
        endIndex = startIndex + lastBreak + (lastPeriod > lastNewline ? 2 : 1); // Include the period and space or newline
      }
    } else {
      // Last chunk - take everything remaining
      endIndex = text.length;
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start index forward, but overlap with previous chunk
    // Ensure we don't go backwards
    if (endIndex >= text.length) {
      break; // Done processing
    }

    const nextStart = endIndex - overlapSize;
    startIndex = Math.max(nextStart, startIndex + 1); // Always make progress
  }

  return chunks.length > 0 ? chunks : [text];
}



            





