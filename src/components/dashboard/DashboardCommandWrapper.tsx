"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import DashboardCommand from "@/components/dashboard/DashboardCommand";
import EditableTaskPreview from "@/components/dashboard/EditableTaskPreview";
import { parseTasksFromText } from "@/app/actions/nlp";
import type { ExtractedTask } from "@/lib/gamification/types";

interface DashboardCommandWrapperProps {
  onTaskCreated?: () => void;
}

export default function DashboardCommandWrapper({ onTaskCreated }: DashboardCommandWrapperProps) {
  const [pendingTasks, setPendingTasks] = useState<ExtractedTask[] | null>(null);
  const [isParsing, startParsing] = useTransition();

  const handleSubmit = (input: string) => {
    startParsing(async () => {
      const result = await parseTasksFromText(input);

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to parse tasks");
        return;
      }

      setPendingTasks(result.data);
    });
  };

  const handleConfirmed = () => {
    setPendingTasks(null);
    onTaskCreated?.();
  };

  const handleCancel = () => {
    setPendingTasks(null);
  };

  return (
    <div>
      <DashboardCommand onSubmit={handleSubmit} isProcessing={isParsing} />

      {pendingTasks && (
        <div className="mt-3">
          <EditableTaskPreview
            tasks={pendingTasks}
            onConfirmed={handleConfirmed}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
