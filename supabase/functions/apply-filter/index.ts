import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function normalizeImageInput(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  const dataUrlMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return { mimeType: dataUrlMatch[1], data: dataUrlMatch[2] };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error('Unable to fetch source image');
  }

  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    throw new Error('Source URL is not an image');
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_INPUT_SIZE) {
    throw new Error('Image URL too large');
  }

  return { mimeType, data: bytesToBase64(buffer) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, filterId } = await req.json();
    console.log('Apply filter request:', { filterId, imageUrlPrefix: imageUrl?.substring(0, 50) });

    if (!imageUrl || !filterId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or filterId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedFilters = ['original', 'watercolor', 'sketch', 'banksy', 'picasso'];
    if (typeof filterId !== 'string' || !allowedFilters.includes(filterId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid filter ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof imageUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid image URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isDataUrl = imageUrl.startsWith('data:image/');
    const isHttpUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');

    if (!isDataUrl && !isHttpUrl) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format. Please provide a valid image URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (imageUrl.length > MAX_IMAGE_INPUT_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Image URL too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stylePrompts: Record<string, string> = {
      watercolor: "Transform this pet photo into a natural watercolor painting with visible watercolor paper texture, layered transparent washes, soft wet-on-wet transitions, and selective crisp wet-on-dry edges around key features. Keep the pet clearly recognizable by preserving eye highlights, facial structure, ear shape, and fur direction cues. Maintain realistic midtones and contrast (do not over-whiten or blow highlights). Keep approximately 25-40% of the original environment as a softly simplified watercolor background so the scene context remains visible. Use harmonious, slightly muted natural colors with gentle pigment blooms and subtle granulation. Preserve original pose and framing. Do not add extra animals, humans, text, logos, or watermarks.",
      sketch: "Convert this pet photo into a realistic graphite pencil drawing with high detail and natural grayscale tonal range. Preserve fine fur strands, whiskers, eye reflections, nose texture, and facial anatomy so the pet stays clearly recognizable. Use controlled line weight, soft gradient shading, and localized cross-hatching only where needed for form; avoid uniform repeating hatch patterns across the whole image. Keep background simplified and lighter than the subject to maintain focus. Preserve original pose and framing. Do not add extra animals, humans, text, logos, or watermarks.",
      banksy: "Transform this pet photo into a high-quality stencil street-art mural aesthetic on a textured concrete wall. Use layered stencil tones (3-5 tonal steps), strong but controlled contrast, crisp edges, subtle spray-paint overspray, and light paint drips. Preserve facial structure, eyes, muzzle details, and fur landmarks so the pet remains clearly recognizable. Keep composition close to the original framing and pose. Avoid full black-fill silhouettes and avoid crushing midtones. Do not add extra animals, humans, text, logos, or watermarks.",
      picasso: "Reimagine this pet photo as a refined cubist portrait painting with interlocking geometric planes and faceted forms, inspired by early-to-mid 20th century Cubism. Keep the pet clearly recognizable and preserve the original pose, silhouette, eye placement, muzzle shape, and key facial landmarks. Use 4-7 coherent color families with bold but balanced blocks (avoid neon overload), strong contour lines, and moderate abstraction. Keep readable depth and anatomy; do not fragment the face into unrecognizable shards. Include subtle painterly canvas texture and clean composition close to the source framing. Do not add extra animals, humans, text, logos, or watermarks.",
    };

    if (filterId === 'original') {
      return new Response(
        JSON.stringify({ imageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stylePrompt = stylePrompts[filterId];
    if (!stylePrompt) {
      return new Response(
        JSON.stringify({ error: 'Invalid filter ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const AI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'gemini-2.0-flash-exp-image-generation';

    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedImage = await normalizeImageInput(imageUrl);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: stylePrompt },
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
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      return new Response(
        JSON.stringify({ error: 'Failed to process image' }),
        { status: response.status >= 400 && response.status < 500 ? response.status : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part: any) => part?.inlineData?.data || part?.inline_data?.data);
    const inline = imagePart?.inlineData ?? imagePart?.inline_data;

    if (!inline?.data) {
      console.error('No image part in Gemini response');
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mimeType = inline.mimeType ?? inline.mime_type ?? 'image/png';
    const generatedImageUrl = `data:${mimeType};base64,${inline.data}`;

    return new Response(
      JSON.stringify({ imageUrl: generatedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in apply-filter function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
