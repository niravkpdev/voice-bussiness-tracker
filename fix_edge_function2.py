with open('supabase/functions/parse-voice-command/index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  try {
    const body = await req.json().catch(() => ({}));
    const input = body.transcript || body.command || body.text || body.message || "";
    const businessId = body.businessId || "default";

    if (!String(input).trim()) {"""

replacement = """  try {
    const body = await req.json().catch(() => ({}));
    const input = body.transcript || body.command || body.text || body.message || "";
    const businessId = body.businessId || "default";
    const userId = body.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "Missing userId",
          received: body
        }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!String(input).trim()) {"""

content = content.replace(target, replacement)

with open('supabase/functions/parse-voice-command/index.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Edge function userId validation")
