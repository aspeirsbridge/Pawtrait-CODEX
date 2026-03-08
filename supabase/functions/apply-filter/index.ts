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
      watercolor: "Transform this pet photo into a watercolor painting with soft edges, pastel colors, and visible brushstroke textures. Keep the pet as the clear subject.",
      sketch: "Convert this pet photo into a pencil sketch with grayscale tones, hand-drawn lines, and charcoal-like shading. Keep the pet recognizable.",
      banksy: "Transform this pet photo into a Banksy-inspired street art style with stencil-like contrast, bold outlines, and urban graffiti aesthetic.",
      picasso: "Reimagine this pet photo in Picasso cubist style with geometric forms, multiple perspectives, and abstract composition while keeping the pet identifiable."
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
