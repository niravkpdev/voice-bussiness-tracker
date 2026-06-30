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
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    const businessId = formData.get('businessId')

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.')
    }

    // Step 1: Transcribe audio using Whisper
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
      throw new Error(`Whisper API failed: ${whisperResponse.status}`)
    }

    const whisperData = await whisperResponse.json()
    const transcript = whisperData.text

    console.log('Transcript:', transcript)

    // Step 2: Parse intent using GPT
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
  "confidence": number (0.0 to 1.0),
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
      throw new Error(`GPT API failed: ${gptResponse.status}`)
    }

    const gptData = await gptResponse.json()
    const parsedIntent = JSON.parse(gptData.choices[0].message.content)

    // Inject transcript into response for UI display
    parsedIntent.transcript = transcript
    if (parsedIntent.confidence === undefined) parsedIntent.confidence = 0.95

    return new Response(JSON.stringify(parsedIntent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
