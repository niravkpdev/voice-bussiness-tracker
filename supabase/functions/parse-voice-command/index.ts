import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}));
    const input = body.transcript || body.command || body.text || body.message || "";
    const businessId = body.businessId || "default";

    if (!String(input).trim()) {
      return new Response(
        JSON.stringify({
          error: "Missing transcript/command/text",
          received: body
        }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing OPENAI_API_KEY secret.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transcript = String(input).trim();
    console.log('Transcript:', transcript)

    // Step 2: Parse intent using GPT
    try {
      const systemPrompt = `You are a highly intelligent accounting assistant. Parse the following transcript into a structured JSON ledger entry.
The user is dictating a business transaction (expense or income).
Output ONLY valid JSON.
Schema:
{
  "type": "expense" | "income",
  "amount": number,
  "category": string,
  "partyName": string,
  "customer": string,
  "date": "YYYY-MM-DD",
  "narration": string,
  "confidence": number,
  "unclear": boolean
}
Rules:
- Default type to "expense" unless income/sale is explicitly stated.
- "customer" and "partyName" should be the exact same vendor/customer name.
- "date" should be today's date (${new Date().toISOString().slice(0, 10)}) if not specified.
- "unclear" is true if you cannot confidently determine the amount or party.
`

      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        })
      })

      if (!gptResponse.ok) {
        const errorText = await gptResponse.text()
        console.error('GPT API Error:', errorText)
        throw new Error(`GPT API failed with status ${gptResponse.status}: ${errorText}`)
      }

      const gptData = await gptResponse.json()
      const parsedIntent = JSON.parse(gptData.choices[0].message.content)

      // Inject transcript into response for UI display
      parsedIntent.transcript = transcript
      if (parsedIntent.confidence === undefined) parsedIntent.confidence = 0.95

      return new Response(JSON.stringify(parsedIntent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (gptError) {
      console.error('GPT parsing failed:', gptError)
      return new Response(JSON.stringify({ error: 'Failed to extract JSON intent via GPT-4o-mini.', details: gptError.message, transcript }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('Edge Function Fatal Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
