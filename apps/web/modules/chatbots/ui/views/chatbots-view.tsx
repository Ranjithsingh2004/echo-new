"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { PlusIcon, TrashIcon, PencilIcon, CheckCircleIcon, LinkIcon } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { useState } from "react";
import { CreateChatbotDialog } from "../components/create-chatbot-dialog";
import { EditChatbotDialog } from "../components/edit-chatbot-dialog";
import { DeleteChatbotDialog } from "../components/delete-chatbot-dialog";
import { ConnectChatbotDialog } from "../components/connect-chatbot-dialog";

export const ChatbotsView = () => {
  const chatbots = useQuery(api.private.chatbots.list);
  const knowledgeBases = useQuery(api.private.knowledgeBases.list);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<any | null>(null);

  const handleEditClick = (chatbot: any) => {
    setSelectedChatbot(chatbot);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (chatbot: any) => {
    setSelectedChatbot(chatbot);
    setDeleteDialogOpen(true);
  };

  const handleConnectClick = (chatbot: any) => {
    setSelectedChatbot(chatbot);
    setConnectDialogOpen(true);
  };

  const getKnowledgeBaseName = (kbId: string) => {
    const kb = knowledgeBases?.find((kb) => kb._id === kbId);
    return kb?.name || "Unknown";
  };

  return (
    <>
      <CreateChatbotDialog
        onOpenChange={setCreateDialogOpen}
        open={createDialogOpen}
        knowledgeBases={knowledgeBases || []}
      />

      <EditChatbotDialog
        onOpenChange={setEditDialogOpen}
        open={editDialogOpen}
        chatbot={selectedChatbot}
        knowledgeBases={knowledgeBases || []}
      />

      <DeleteChatbotDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        chatbot={selectedChatbot}
      />

      <ConnectChatbotDialog
        onOpenChange={setConnectDialogOpen}
        open={connectDialogOpen}
        chatbot={selectedChatbot}
      />

      <div className="flex min-h-screen flex-col bg-muted p-8">
        <div className="mx-auto w-full max-w-screen-xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-4xl">Chatbots</h1>
                <p className="text-muted-foreground">
                  Create and manage multiple chatbots for your organization
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Chatbot
              </Button>
            </div>

            <div className="rounded-md border bg-background">
              {!chatbots || chatbots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    No chatbots yet. Create one to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Knowledge Base</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chatbots.map((chatbot) => (
                      <TableRow key={chatbot._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {chatbot.name}
                            {chatbot.isDefault && (
                              <Badge variant="secondary">
                                <CheckCircleIcon className="mr-1 h-3 w-3" />
                                Default
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getKnowledgeBaseName(chatbot.knowledgeBaseId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {new Date(chatbot.updatedAt).toLocaleDateString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(chatbot.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnectClick(chatbot)}
                            >
                              <LinkIcon className="mr-2 h-4 w-4" />
                              Connect
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(chatbot)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(chatbot)}
                              disabled={chatbot.isDefault && chatbots.length === 1}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
