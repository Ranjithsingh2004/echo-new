"use client";

import { WidgetView } from "@/modules/widget/ui/views/widget-view";
import { use } from "react";
interface Props {
  searchParams: Promise<{
    organizationId: string;
    chatbotId?: string;
  }>
};

const Page = ({ searchParams }: Props) => {
  const { organizationId, chatbotId } = use(searchParams);

  return (
    <WidgetView organizationId={organizationId} chatbotId={chatbotId} />
  );
};

export default Page;


  