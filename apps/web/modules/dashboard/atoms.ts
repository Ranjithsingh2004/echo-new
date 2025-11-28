import { atom } from "jotai";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";

export const statusFilterAtom = atom<Doc<"conversations">["status"] | "all">(
  "all",
);

export const chatbotFilterAtom = atom<Id<"chatbots"> | "all">("all");
 