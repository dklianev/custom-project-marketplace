import { fastCompletion } from "@/lib/ai/gateway";

export async function summarizeProject(project: {
  title: string;
  messages: { text: string; createdAt: string }[];
  milestones: { title: string; completed: boolean }[];
}) {
  const response = await fastCompletion({
    maxTokens: 250,
    messages: [
      {
        role: "user",
        content: `Summarize this project in 1-2 concise sentences for a dashboard card: ${JSON.stringify(project)}`,
      },
    ],
  });

  return response.text;
}
