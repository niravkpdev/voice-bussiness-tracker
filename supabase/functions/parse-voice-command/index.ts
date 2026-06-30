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
    let formData;
    try {
      formData = await req.formData()
    } catch (formError) {
      console.error('Failed to parse form data:', formError)
      return new Response(JSON.stringify({ error: 'Failed to read multipart/form-data payload', details: formError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const audioFile = formData.get('audio')
    const businessId = formData.get('businessId')

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided in form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing OPENAI_API_KEY secret.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let transcript = '';
    
    // Step 1: Transcribe audio using Whisper
    try {
      const whisperFormData = new FormData()
      whisperFormData.append('file', audioFile, 'voice-command.wav')
      whisperFormData.append('model', 'whisper-1')
      whisperFormData.append('language', 'en')

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: whisperFormData,
      })

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text()
        console.error('Whisper API Error:', errorText)
        throw new Error(`Whisper API failed with status ${whisperResponse.status}: ${errorText}`)
      }

      const whisperData = await whisperResponse.json()
      transcript = whisperData.text
      console.log('Transcript:', transcript)
    } catch (whisperError) {
      console.error('Whisper step failed:', whisperError)
      return new Response(JSON.stringify({ error: 'Failed to transcribe audio via OpenAI Whisper.', details: whisperError.message }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
