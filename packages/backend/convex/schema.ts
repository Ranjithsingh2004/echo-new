import {defineSchema,defineTable} from "convex/server"; 
import { v } from "convex/values";

export const logoSchema = v.object({
        type: v.union(v.literal("default"), v.literal("upload"), v.literal("url")),
        storageId: v.optional(v.id("_storage")),
        externalUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        mimeType: v.optional(v.string()),
        size: v.optional(v.number()),
        updatedAt: v.number(),
    });

export const logoInputSchema = v.object({
        type: v.union(v.literal("default"), v.literal("upload"), v.literal("url")),
        storageId: v.optional(v.id("_storage")),
        externalUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        mimeType: v.optional(v.string()),
        size: v.optional(v.number()),
        updatedAt: v.number(),
        url: v.optional(v.string()),
    });

export const appearanceSchema = v.object({
        primaryColor: v.optional(v.string()),
        size: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
        logo: v.optional(logoSchema),
    });

export const appearanceInputSchema = v.object({
        primaryColor: v.optional(v.string()),
        size: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
        logo: v.optional(logoInputSchema),
    });

export default defineSchema({

    subscriptions: defineTable({
    organizationId: v.string(),
    status: v.string(),
    })
    .index("by_organization_id", ["organizationId"]),







        widgetSettings: defineTable({
        organizationId: v.string(),
        chatbotName: v.optional(v.string()),
        greetMessage: v.string(),
        customSystemPrompt: v.optional(v.string()),
        appearance: v.optional(appearanceSchema),
        defaultSuggestions: v.object({
            suggestion1: v.optional(v.string()),
            suggestion2: v.optional(v.string()),
            suggestion3: v.optional(v.string()),
        }),
        vapiSettings: v.object({
            assistantId: v.optional(v.string()),
            phoneNumber: v.optional(v.string()),
        }),
        })
        .index("by_organization_id", ["organizationId"]),

    knowledgeBases: defineTable({
        organizationId: v.string(),
        name: v.string(),
        knowledgeBaseId: v.string(),
        description: v.optional(v.string()),
        ragNamespace: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
    .index("by_organization_id", ["organizationId"])
    .index("by_knowledge_base_id", ["knowledgeBaseId"]),

    chatbots: defineTable({
        organizationId: v.string(),
        name: v.string(),
        chatbotId: v.string(),
        knowledgeBaseId: v.id("knowledgeBases"),
        appearance: v.optional(appearanceSchema),
        greetMessage: v.string(),
        customSystemPrompt: v.optional(v.string()),
        defaultSuggestions: v.object({
            suggestion1: v.optional(v.string()),
            suggestion2: v.optional(v.string()),
            suggestion3: v.optional(v.string()),
        }),
        vapiSettings: v.object({
            assistantId: v.optional(v.string()),
            phoneNumber: v.optional(v.string()),
        }),
        isDefault: v.boolean(),
        isActive: v.optional(v.boolean()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
    .index("by_organization_id", ["organizationId"])
    .index("by_chatbot_id", ["chatbotId"])
    .index("by_knowledge_base_id", ["knowledgeBaseId"]),

    plugins: defineTable({
        organizationId: v.string(),
        service: v.union(v.literal("vapi")),
        secretName: v.string(),
        })
        .index("by_organization_id", ["organizationId"])
       .index("by_organization_id_and_service", ["organizationId", "service"]),





    conversations: defineTable({
        threadId: v.string(),
        organizationId: v.string(),
        chatbotId: v.optional(v.id("chatbots")),
        contactSessionId: v.id("contactSessions"),
        caseId: v.optional(v.string()),
        json: v.optional(v.string()),
        status: v.union(
            v.literal("unresolved"),
            v.literal("escalated"),
            v.literal("resolved")
        ),
        })
            .index("by_organization_id", ["organizationId"])
            .index("by_contact_session_id", ["contactSessionId"])
            .index("by_thread_id", ["threadId"])
            .index("by_status_and_organization_id", ["status", "organizationId"])
            .index("by_case_id", ["caseId"])
            .index("by_chatbot_id", ["chatbotId"]),




    contactSessions: defineTable({
        name: v.string(),
        email: v.string(),
        organizationId: v.string(),
        expiresAt: v.number(),
        metadata: v.optional(v.object({
            userAgent: v.optional(v.string()),
            language:v.optional( v.string()),
            languages: v.optional(v.optional(v.string())),
            platform:v.optional( v.string()),
            vendor: v.optional(v.string()),
            screenResolution:v.optional( v.string()),
            viewportSize:v.optional( v.string()),
            timezone:v.optional( v.string()),
            timezoneOffset:v.optional( v.number()),
            cookieEnabled:v.optional( v.boolean()),
            referrer:v.optional( v.string()),
            currentUrl: v.optional(v.string()),
        })),
    })
    .index("by_organization_id", ["organizationId"])
    .index("by_expires_at", ["expiresAt"]),
    users: defineTable({
        name: v.string(),
    }),
});