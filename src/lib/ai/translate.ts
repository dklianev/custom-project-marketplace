import { fastCompletion } from "@/lib/ai/gateway";

export async function translate(
  text: string,
  from: "bg" | "en",
  to: "bg" | "en",
) {
  const fromLang = from === "bg" ? "Bulgarian" : "English";
  const toLang = to === "bg" ? "Bulgarian" : "English";

  const response = await fastCompletion({
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content: `Translate from ${fromLang} to ${toLang}. Return only the translated text.`,
      },
      { role: "user", content: text },
    ],
  });

  return response.text;
}
