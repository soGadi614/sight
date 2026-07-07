export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, imageType } = req.body;

  if (!imageBase64 || !imageType) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const prompt = `You are an expert piano teacher analyzing a photo of sheet music.

Analyze this bar of piano sheet music and return ONLY a valid JSON object with exactly these keys, no markdown, no extra text:

{
  "notes": "Plain English description of all notes in this bar — name them (e.g. C4, G5), identify key signature if visible, note any accidentals.",
  "left_hand": "What the left hand is doing — notes, rhythm, role (bass line, chords, arpeggios), and specific challenges.",
  "right_hand": "What the right hand is doing — notes, rhythm, melodic role, and specific challenges.",
  "practice_steps": [
    "Specific actionable step 1",
    "Specific actionable step 2",
    "Specific actionable step 3",
    "Specific actionable step 4"
  ]
}

Target intermediate to advanced pianists. Return only raw JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${imageType};base64,${imageBase64}` } }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('No response from OpenAI');

    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}
