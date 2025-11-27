"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { PlusIcon, TrashIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { CreateKnowledgeBaseDialog } from "../components/create-knowledge-base-dialog";
import { EditKnowledgeBaseDialog } from "../components/edit-knowledge-base-dialog";
import { DeleteKnowledgeBaseDialog } from "../components/delete-knowledge-base-dialog";

export const KnowledgeBasesView = () => {
  const knowledgeBases = useQuery(api.private.knowledgeBases.list);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<any | null>(null);

  const handleEditClick = (kb: any) => {
    setSelectedKnowledgeBase(kb);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (kb: any) => {
    setSelectedKnowledgeBase(kb);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <CreateKnowledgeBaseDialog
        onOpenChange={setCreateDialogOpen}
        open={createDialogOpen}
      />

      <EditKnowledgeBaseDialog
        onOpenChange={setEditDialogOpen}
        open={editDialogOpen}
        knowledgeBase={selectedKnowledgeBase}
      />

      <DeleteKnowledgeBaseDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        knowledgeBase={selectedKnowledgeBase}
      />

      <div className="flex min-h-screen flex-col bg-muted p-8">
        <div className="mx-auto w-full max-w-screen-xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-4xl">Knowledge Bases</h1>
                <p className="text-muted-foreground">
                  Create and manage knowledge bases for your chatbots
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Knowledge Base
              </Button>
            </div>

            <div className="rounded-md border bg-background">
              {!knowledgeBases || knowledgeBases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    No knowledge bases yet. Create one to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knowledgeBases.map((kb) => (
                      <TableRow key={kb._id}>
                        <TableCell className="font-medium">{kb.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {kb.description || "No description"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(kb.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(kb)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(kb)}
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
