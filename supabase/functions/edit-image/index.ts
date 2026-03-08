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
    const { imageUrl, prompt } = await req.json();
    console.log('Edit image request:', { prompt, imageUrlPrefix: imageUrl?.substring(0, 50) });

    if (!imageUrl || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof prompt !== 'string' || prompt.length > 500 || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt must be a non-empty string with maximum 500 characters' }),
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
              { text: prompt },
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
    const editedImageUrl = `data:${mimeType};base64,${inline.data}`;

    return new Response(
      JSON.stringify({ imageUrl: editedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in edit-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
