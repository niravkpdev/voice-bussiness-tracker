with open('supabase/functions/parse-voice-command/index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  try {
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
    }"""

replacement = """  try {
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
    console.log('Transcript:', transcript)"""

content = content.replace(target, replacement)

with open('supabase/functions/parse-voice-command/index.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Edge function logic")
