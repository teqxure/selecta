import "server-only";
import { requireAiFeatureUsage, recordAiUsage } from "@/services/monetization/entitlement.service";
import { completeChat } from "@/services/ai/openai-client";

export interface ProductWriterInput {
  title: string;
  categoryName: string;
  subcategoryName?: string;
  brand?: string;
  color?: string;
  material?: string;
  gender?: string;
  conditionLabel?: string;
}

const SYSTEM_PROMPT =
  "You write short, appealing product descriptions for Selecta, a Nigerian resale fashion marketplace. " +
  "Write 2-4 sentences, no headings, no bullet points, no emoji, no made-up details beyond what's given. " +
  "Sound like a real seller describing a real item honestly and enticingly.";

function buildUserPrompt(input: ProductWriterInput): string {
  const facts = [
    `Title: ${input.title}`,
    `Category: ${input.subcategoryName ? `${input.categoryName} > ${input.subcategoryName}` : input.categoryName}`,
    input.brand && `Brand: ${input.brand}`,
    input.color && `Color: ${input.color}`,
    input.material && `Material: ${input.material}`,
    input.gender && `For: ${input.gender}`,
    input.conditionLabel && `Condition: ${input.conditionLabel}`,
  ].filter(Boolean);

  return `Write a product description from these facts:\n${facts.join("\n")}`;
}

/**
 * Never auto-saved — the seller reviews/edits the result like any other
 * form field, same as the rest of the product wizard. Usage is only
 * recorded on success; a failed OpenAI call must never cost the seller a
 * slot from their monthly allowance.
 */
export async function generateProductDescription(sellerId: string, input: ProductWriterInput): Promise<string> {
  await requireAiFeatureUsage(sellerId, "AI_PRODUCT_WRITER");

  const description = await completeChat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(input) },
  ]);

  await recordAiUsage(sellerId, "AI_PRODUCT_WRITER");
  return description;
}
