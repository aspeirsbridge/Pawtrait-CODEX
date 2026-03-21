import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024;

interface ImageClassification {
  containsAnimal: boolean;
  containsHuman: boolean;
  primaryAnimalSpecies: string | null;
}

const NON_ANIMAL_IMAGE_MESSAGE =
  "Pawtrait only applies art styles to images that include animals. Please upload a different image.";

interface GeminiResponsePart {
  text?: string;
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
  inline_data?: {
    data?: string;
    mime_type?: string;
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function estimateBase64DecodedSize(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function normalizeImageInput(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  const dataUrlMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const data = dataUrlMatch[2];
    if (estimateBase64DecodedSize(data) > MAX_IMAGE_INPUT_SIZE) {
      throw new Error("Image file too large");
    }

    return { mimeType: dataUrlMatch[1], data };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Unable to fetch source image");
  }

  const mimeType = response.headers.get("content-type") || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    throw new Error("Source URL is not an image");
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_INPUT_SIZE) {
    throw new Error("Image URL too large");
  }

  return { mimeType, data: bytesToBase64(buffer) };
}

function safeParseJson(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeSpecies(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  if (!cleaned || cleaned === "none" || cleaned === "null") return null;
  return cleaned;
}

async function classifyImageContent(
  normalizedImage: { mimeType: string; data: string },
  apiKey: string,
  model: string,
): Promise<ImageClassification> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const classifierPrompt = [
    "Classify the provided image and return STRICT JSON only.",
    "Use exactly this shape:",
    '{"containsAnimal": boolean, "containsHuman": boolean, "primaryAnimalSpecies": string | null}.',
    "Rules:",
    "- containsAnimal=true if one or more animals are visible.",
    "- containsHuman=true if one or more humans are visible.",
    "- primaryAnimalSpecies must be the most prominent animal species in lowercase singular form (e.g., cat, dog, rabbit, lion), or null when no animal is visible.",
    "- No markdown, no code fences, no extra keys.",
  ].join(" ");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: classifierPrompt },
            {
              inline_data: {
                mime_type: normalizedImage.mimeType,
                data: normalizedImage.data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Classification API error:", response.status, errorText);
    throw new Error("Failed to classify image content");
  }

  const data = await response.json();
  const parts: GeminiResponsePart[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part?.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  const parsed = text ? safeParseJson(text) : null;

  return {
    containsAnimal: Boolean(parsed?.containsAnimal),
    containsHuman: Boolean(parsed?.containsHuman),
    primaryAnimalSpecies: normalizeSpecies(parsed?.primaryAnimalSpecies),
  };
}

function buildSpeciesGuard(species: string | null): string {
  if (!species) {
    return "If an animal is already present, keep the same animal identity and do not replace it with a different species.";
  }

  const parts = [
    `Primary subject species is '${species}'.`,
    `Keep '${species}' as the primary subject.`,
    `Do not substitute '${species}' with another species.`,
    "Preserve recognizable facial anatomy, body proportions, and pose.",
  ];

  if (species === "cat") {
    parts.push("Keep clear cat anatomy and feline facial structure. Do not add a mane.");
  }

  return parts.join(" ");
}

function buildAnimalPolicy(classification: ImageClassification): string {
  if (classification.containsAnimal) {
    return [
      "Apply the requested art style while preserving the same animal as the primary subject.",
      buildSpeciesGuard(classification.primaryAnimalSpecies),
      "Keep scene composition and camera framing close to the source.",
      "Maintain high image quality and avoid over-simplification of key animal features.",
      "Do not add text, logos, or watermarks.",
    ].join(" ");
  }

  if (classification.containsHuman) {
    return "";
  }

  return "";
}
function buildFilterPrompt(stylePrompt: string, classification: ImageClassification): string {
  return `${buildAnimalPolicy(classification)} ${stylePrompt}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, filterId } = await req.json();
    console.log("Apply filter request:", { filterId, imageUrlPrefix: imageUrl?.substring(0, 50) });

    if (!imageUrl || !filterId) {
      return new Response(JSON.stringify({ error: "Missing imageUrl or filterId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedFilters = ["original", "watercolor", "sketch", "banksy", "picasso"];
    if (typeof filterId !== "string" || !allowedFilters.includes(filterId)) {
      return new Response(JSON.stringify({ error: "Invalid filter ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "Invalid image URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDataUrl = imageUrl.startsWith("data:image/");
    const isHttpUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");

    if (!isDataUrl && !isHttpUrl) {
      return new Response(JSON.stringify({ error: "Invalid image format. Please provide a valid image URL." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isHttpUrl && imageUrl.length > MAX_IMAGE_INPUT_SIZE) {
      return new Response(JSON.stringify({ error: "Image URL too large" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (filterId === "original") {
      return new Response(JSON.stringify({ imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stylePrompts: Record<string, string> = {
      watercolor:
        "Transform the image into a natural watercolor painting with visible watercolor paper texture, layered transparent washes, soft wet-on-wet transitions, and selective crisp wet-on-dry edges around key features. Keep the primary animal clearly recognizable by preserving eye highlights, facial structure, ear shape, and fur direction cues. Maintain realistic midtones and contrast (do not over-whiten or blow highlights). Keep approximately 25-40% of the environment as a softly simplified watercolor background so scene context remains visible. Use harmonious, slightly muted natural colors with gentle pigment blooms and subtle granulation. Preserve original pose and framing. Do not add text, logos, or watermarks.",
      sketch:
        "Convert the image into a realistic graphite pencil drawing with high detail and natural grayscale tonal range. Preserve fine fur strands, whiskers, eye reflections, nose texture, and facial anatomy so the primary animal stays clearly recognizable. Use controlled line weight, soft gradient shading, and localized cross-hatching only where needed for form; avoid uniform repeating hatch patterns across the whole image. Keep background simplified and lighter than the primary subject to maintain focus. Preserve original pose and framing. Do not add text, logos, or watermarks.",
      banksy:
        "Transform the image into a high-quality stencil street-art mural aesthetic on a textured concrete wall. Use layered stencil tones (3-5 tonal steps), strong but controlled contrast, crisp edges, subtle spray-paint overspray, and light paint drips. Preserve facial structure, eyes, muzzle details, and fur landmarks so the primary animal remains clearly recognizable. Keep composition close to the original framing and pose. Avoid full black-fill silhouettes and avoid crushing midtones. Keep species-defining anatomy intact, including ear shape and muzzle proportions. Do not add text, logos, or watermarks.",
      picasso:
        "Reimagine the image as a refined cubist portrait painting with interlocking geometric planes and faceted forms, inspired by early-to-mid 20th century Cubism. Keep the primary animal clearly recognizable and preserve the original pose, silhouette, eye placement, muzzle shape, and key facial landmarks. Use 4-7 coherent color families with bold but balanced blocks (avoid neon overload), strong contour lines, and moderate abstraction. Keep readable depth and anatomy; do not fragment the subject into unrecognizable shards. Include subtle painterly canvas texture and clean composition close to the source framing. Do not add text, logos, or watermarks.",
    };

    const stylePrompt = stylePrompts[filterId];
    if (!stylePrompt) {
      return new Response(JSON.stringify({ error: "Invalid filter ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const AI_MODEL = Deno.env.get("AI_MODEL") ?? "gemini-2.5-flash-image";
    const CLASSIFIER_MODEL = Deno.env.get("AI_CLASSIFIER_MODEL") ?? "gemini-2.5-flash";

    if (!AI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedImage = await normalizeImageInput(imageUrl);

    let classification: ImageClassification | null = null;

    try {
      classification = await classifyImageContent(normalizedImage, AI_API_KEY, CLASSIFIER_MODEL);
      console.log("Image classification:", classification);
    } catch (classificationError) {
      console.error("Classification fallback:", classificationError);
    }

    if (!classification?.containsAnimal) {
      return new Response(
        JSON.stringify({
          error: NON_ANIMAL_IMAGE_MESSAGE,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const finalPrompt = buildFilterPrompt(stylePrompt, classification);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: finalPrompt },
              {
                inline_data: {
                  mime_type: normalizedImage.mimeType,
                  data: normalizedImage.data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      let message = "Failed to process image";
      try {
        const parsed = JSON.parse(errorText) as {
          error?: {
            message?: string;
          };
        };
        if (parsed.error?.message) {
          message = parsed.error.message;
        }
      } catch {
        if (errorText.trim()) {
          message = errorText.trim();
        }
      }

      return new Response(JSON.stringify({ error: message }), {
        status: response.status >= 400 && response.status < 500 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const parts: GeminiResponsePart[] = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => part?.inlineData?.data || part?.inline_data?.data);
    const inline = imagePart?.inlineData ?? imagePart?.inline_data;

    if (!inline?.data) {
      const textResponse = parts
        .map((part) => part?.text?.trim())
        .filter(Boolean)
        .join("\n")
        .trim();

      console.error("No image part in Gemini response", textResponse);
      return new Response(JSON.stringify({ error: textResponse || "No image generated" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mimeType = inline.mimeType ?? inline.mime_type ?? "image/png";
    const generatedImageUrl = `data:${mimeType};base64,${inline.data}`;

    return new Response(JSON.stringify({ imageUrl: generatedImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in apply-filter function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});




