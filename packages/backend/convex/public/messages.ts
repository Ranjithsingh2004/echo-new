// import { agent } from '@convex-dev/agent/convex.config';
import { v,ConvexError } from "convex/values";
import { action,query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { resolveConversation } from "../system/ai/tools/resolveConversation";
import { escalateConversation } from "../system/ai/tools/escalateConversation";
import { saveMessage } from "@convex-dev/agent";
import { search } from "../system/ai/tools/search";
import { SUPPORT_AGENT_PROMPT, createCustomAgentPrompt } from "../system/ai/constants";


export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      { 
        contactSessionId: args.contactSessionId 
    }

    );

    if (!contactSession || contactSession.expiresAt < Date.now()) {
  throw new ConvexError({
    code: "UNAUTHORIZED",
    message: "Invalid session",
    });
    }

    const conversation = await ctx.runQuery(
    internal.system.conversations.getByThreadId,
    {
        threadId: args.threadId,
    }
    );

    if (!conversation) {
    throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
    });
    }


    if (conversation.status === "resolved") {
    throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
    });
    }


    await ctx.runMutation(internal.system.contactSessions.refresh, {
      contactSessionId: args.contactSessionId,
    });


    const subscription = await ctx.runQuery(
    internal.system.subscriptions.getByOrganizationId,
    {
      organizationId: conversation.organizationId,
    },
  );

    // Fetch chatbot settings or fallback to widget settings
    let customPrompt = null;

    if (conversation.chatbotId) {
      const chatbot = await ctx.runQuery(
        internal.system.chatbots.getById,
        {
          id: conversation.chatbotId,
        }
      );
      customPrompt = chatbot?.customSystemPrompt;
    } else {
      // Fallback to widget settings for backward compatibility
      const widgetSettings = await ctx.runQuery(
        internal.system.widgetSettings.getByOrganizationId,
        {
          organizationId: conversation.organizationId,
        }
      );
      customPrompt = widgetSettings?.customSystemPrompt;
    }



    const shouldTriggerAgent = conversation.status === "unresolved" && subscription?.status === "active";

    if(shouldTriggerAgent){
          // Use custom system prompt if available
          if (customPrompt) {
            // Create a temporary agent with custom instructions merged with core template
            const { Agent } = await import("@convex-dev/agent");
            const { openai } = await import("@ai-sdk/openai");

            const customAgent = new Agent(components.agent, {
              chat: openai.chat('gpt-4o-mini'),
              instructions: createCustomAgentPrompt(customPrompt), // Merge custom with core template
              tools: {
                search,
                resolveConversation,
                escalateConversation,
              }
            });

            await customAgent.generateText(
              ctx,
              { threadId: args.threadId },
              {
                prompt: args.prompt,
                tools: {
                  search,
                  resolveConversation,
                  escalateConversation,
                }
              }
            );
          } else {
            // Use default agent
            await supportAgent.generateText(
              ctx,
              { threadId: args.threadId },
              {
                prompt: args.prompt,
                tools: {
                  search,
                  resolveConversation,
                  escalateConversation,
                }
              }
            );
          }
        }else{
          await saveMessage(ctx,components.agent,{
            threadId: args.threadId,
            prompt:args.prompt,

          })


          
        }
    },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired session"
      });
    }

    const paginated = await supportAgent.listMessages(ctx, {
        threadId: args.threadId,
        paginationOpts: args.paginationOpts,
        });

        return paginated;

  }
});








