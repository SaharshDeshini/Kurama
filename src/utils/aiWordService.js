/**
 * AI Word Generation Service
 * Supports Google Gemini, Anthropic Claude (3.5 / 3.7), Groq (LLaMA 3.3 / 3.1), OpenAI (GPT-4o), and OpenRouter
 */

const SYSTEM_PROMPT = `You are a world-class lexicographer and vocabulary educator.
Your job is to select or generate a single high-value, articulate, and fascinating English word with rich educational context.
Always respond with ONLY a single valid JSON object, without markdown formatting or code blocks.
The JSON must adhere strictly to this schema:
{
  "word": "Serendipity",
  "phonetic": "/ˌser.ənˈdɪp.ə.ti/",
  "partOfSpeech": "noun",
  "definition": "The occurrence and development of events by chance in a happy or beneficial way.",
  "example": "Finding that rare book in an old bookstore was pure serendipity.",
  "synonyms": ["fluke", "providence", "happy accident"],
  "antonyms": ["misfortune", "adversity"],
  "memoryTip": "Think of serene dip — finding joy unexpectedly.",
  "etymology": "Coined by Horace Walpole in 1754 from the Persian fairy tale 'The Three Princes of Serendip'."
}`;

/**
 * Clean JSON output from LLM responses (strips ```json ... ``` code fences)
 */
function cleanJsonOutput(text) {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Discovers available Gemini models for this API key directly from Google
 */
export async function fetchAvailableGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch Gemini models (Status ${res.status})`);
  }
  const data = await res.json();
  const models = data?.models || [];
  return models
    .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''));
}

/**
 * Generate a new English word with AI
 */
export async function generateWordWithAi({ provider = 'gemini', apiKey, level = 'advanced', existingWords = [] }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key is missing. Please set your API key in Settings.');
  }

  const existingList = existingWords.slice(0, 40).join(', ');
  const userPrompt = `Teach me one articulate, memorable English word suitable for an ${level} vocabulary level.
Do NOT choose any of these recently taught words: [${existingList}].
Return ONLY the raw JSON object conforming to the required schema.`;

  // ================= GOOGLE GEMINI =================
  if (provider === 'gemini') {
    let availableModels = [];
    try {
      availableModels = await fetchAvailableGeminiModels(apiKey);
    } catch (listErr) {
      if (listErr.message && (listErr.message.includes('API_KEY_INVALID') || listErr.message.includes('API key not valid'))) {
        throw new Error('Google AI Studio API key is invalid. Please check your key at aistudio.google.com/app/apikey');
      }
    }

    // Sort models by preference (prefer latest flash models)
    const sortedAvailable = [...availableModels].sort((a, b) => {
      const getPriority = (name) => {
        if (name.includes('flash-exp') || name.includes('2.5') || name.includes('2.0-flash')) return 100;
        if (name.includes('1.5-flash-latest') || name.includes('1.5-flash-002')) return 90;
        if (name.includes('1.5-flash')) return 80;
        if (name.includes('flash')) return 70;
        if (name.includes('2.0') || name.includes('pro')) return 60;
        return 10;
      };
      return getPriority(b) - getPriority(a);
    });

    const fallbackCandidates = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro-latest',
      'gemini-pro'
    ];

    const candidateModels = [...new Set([...sortedAvailable, ...fallbackCandidates].filter(Boolean))];
    let lastError = null;

    for (const model of candidateModels) {
      for (const apiVersion of ['v1beta', 'v1']) {
        for (const useJsonMime of [true, false]) {
          try {
            const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey.trim()}`;
            const payload = {
              contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }]
            };
            if (useJsonMime) {
              payload.generationConfig = {
                temperature: 0.85,
                responseMimeType: 'application/json'
              };
            }

            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (response.ok) {
              const data = await response.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                const parsed = JSON.parse(cleanJsonOutput(rawText));
                return normalizeWord(parsed);
              }
            }

            const errorData = await response.json().catch(() => ({}));
            const errMsg = errorData?.error?.message || `Status ${response.status}`;
            lastError = new Error(errMsg);

            if (response.status === 400 && (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid'))) {
              throw new Error('Google AI Studio API key is invalid.');
            }
          } catch (fetchErr) {
            if (fetchErr.message && fetchErr.message.includes('API key is invalid')) {
              throw fetchErr;
            }
            lastError = fetchErr;
          }
        }
      }
    }

    throw lastError || new Error('Could not find an active model on your Google Gemini key. Check permissions.');
  }

  // ================= ANTHROPIC CLAUDE (3.5 / 3.7) =================
  if (provider === 'claude' || provider === 'anthropic') {
    const candidateClaudeModels = [
      'claude-3-5-haiku-latest',
      'claude-3-5-sonnet-latest',
      'claude-3-7-sonnet-latest',
      'claude-3-haiku-20240307'
    ];

    let lastError = null;
    for (const model of candidateClaudeModels) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey.trim(),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model,
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.content?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(cleanJsonOutput(rawText));
            return normalizeWord(parsed);
          }
        }

        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData?.error?.message || `Claude API error (Status ${response.status})`);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Failed to generate word using Claude API.');
  }

  // ================= GROQ, OPENAI, OPENROUTER =================
  if (provider === 'groq' || provider === 'openai' || provider === 'openrouter') {
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let models = ['gpt-4o-mini', 'gpt-4o'];

    if (provider === 'groq') {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      // Official active Groq models: llama-3.3-70b-versatile is the current flagship
      models = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];

      try {
        const groqModelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
        });
        if (groqModelsRes.ok) {
          const gData = await groqModelsRes.json();
          const activeList = gData?.data || [];
          // Filter out decommissioned or deprecated models explicitly
          const valid = activeList
            .map(m => m.id)
            .filter(id =>
              id &&
              !id.includes('deepseek') &&
              !id.includes('llama3-') &&
              !id.includes('llama-3.1-') &&
              !id.includes('preview') &&
              !id.includes('whisper') &&
              !id.includes('guard')
            );
          if (valid.includes('llama-3.3-70b-versatile')) {
            models = ['llama-3.3-70b-versatile', ...valid.filter(id => id !== 'llama-3.3-70b-versatile')];
          } else if (valid.length > 0) {
            models = valid;
          }
        }
      } catch (e) {
        // Fallback to static active list
      }
    } else if (provider === 'openrouter') {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      models = ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.3-70b-instruct:free', 'anthropic/claude-3.5-haiku'];
    }

    let lastError = null;
    for (const model of models) {
      // Try with json_object format first, and if that errors, without format restriction
      for (const formatOption of [{ type: 'json_object' }, undefined]) {
        try {
          const bodyPayload = {
            model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.85
          };
          if (formatOption) {
            bodyPayload.response_format = formatOption;
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify(bodyPayload)
          });

          if (response.ok) {
            const data = await response.json();
            const rawText = data?.choices?.[0]?.message?.content;
            if (rawText) {
              const parsed = JSON.parse(cleanJsonOutput(rawText));
              return normalizeWord(parsed);
            }
          }

          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData?.error?.message || `Status ${response.status}`;
          lastError = new Error(errMsg);

          // If the model itself is decommissioned, break the inner loop and try the next model
          if (errMsg.includes('decommissioned') || errMsg.includes('does not exist')) {
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }
    }

    throw lastError || new Error(`Failed to generate word using ${provider}.`);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Validates the API key by querying provider models catalog (Zero-token, model-independent ping)
 */
export async function testAiConnection({ provider = 'gemini', apiKey }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter an API key first.');
  }

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || 'Invalid Gemini API Key');
    }
    const data = await response.json();
    const available = (data?.models || []).filter(m =>
      Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
    );
    if (available.length === 0) {
      throw new Error('Key is valid, but no generateContent models are enabled on this Google Cloud project.');
    }
    return true;
  }

  if (provider === 'claude' || provider === 'anthropic') {
    const url = 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }]
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || 'Invalid Anthropic Claude API Key');
    }
    return true;
  }

  if (provider === 'groq' || provider === 'openai' || provider === 'openrouter') {
    let modelsEndpoint = 'https://api.openai.com/v1/models';
    if (provider === 'groq') {
      modelsEndpoint = 'https://api.groq.com/openai/v1/models';
    } else if (provider === 'openrouter') {
      modelsEndpoint = 'https://openrouter.ai/api/v1/models';
    }

    const response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Invalid ${provider} API Key`);
    }
    return true;
  }

  return false;
}

function normalizeWord(raw) {
  return {
    id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    word: raw.word ? raw.word.trim() : 'Resilience',
    phonetic: raw.phonetic ? raw.phonetic.trim() : '',
    partOfSpeech: raw.partOfSpeech ? raw.partOfSpeech.trim().toLowerCase() : 'noun',
    definition: raw.definition ? raw.definition.trim() : '',
    example: raw.example ? raw.example.trim() : '',
    synonyms: Array.isArray(raw.synonyms) ? raw.synonyms : [],
    antonyms: Array.isArray(raw.antonyms) ? raw.antonyms : [],
    memoryTip: raw.memoryTip ? raw.memoryTip.trim() : '',
    etymology: raw.etymology ? raw.etymology.trim() : '',
    isAiGenerated: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * Universal text completion prompt for Notes & Sentence analysis
 */
export async function executeAiTextPrompt({ provider = 'gemini', apiKey, systemPrompt, userPrompt }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key is missing. Configure your AI key in Settings.');
  }

  // GEMINI
  if (provider === 'gemini') {
    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest'
    ];
    let lastError = null;

    for (const model of candidateModels) {
      for (const apiVersion of ['v1beta', 'v1']) {
        try {
          const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey.trim()}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
            })
          });

          if (response.ok) {
            const data = await response.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          }
          const err = await response.json().catch(() => ({}));
          lastError = new Error(err?.error?.message || `Status ${response.status}`);
        } catch (e) {
          lastError = e;
        }
      }
    }
    throw lastError || new Error('Failed to run prompt with Gemini.');
  }

  // CLAUDE
  if (provider === 'claude' || provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Claude error: ${response.status}`);
    }
    const data = await response.json();
    return data?.content?.[0]?.text?.trim() || '';
  }

  // GROQ / OPENAI / OPENROUTER
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let model = 'gpt-4o-mini';
  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    model = 'llama-3.3-70b-versatile';
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    model = 'google/gemini-2.0-flash-exp:free';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `${provider} error: ${response.status}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Feature 2: Transform note with AI (Polish, Action Items, Summarize, Expand)
 */
export async function transformNoteWithAi({ action = 'polish', noteText, provider, apiKey }) {
  if (!noteText || !noteText.trim()) throw new Error('Note text is empty.');

  const prompts = {
    polish: {
      system: 'You are an expert editor. Enhance clarity, flow, and vocabulary while keeping the original intent. Return ONLY the refined text directly without conversational intro.',
      user: `Please polish and refine this note:\n\n"${noteText}"`
    },
    actions: {
      system: 'You are an executive productivity assistant. Extract actionable to-do checklist items from the note. Format each item on a new line with markdown checkbox "- [ ] Task". Return ONLY the list.',
      user: `Convert this note into actionable tasks:\n\n"${noteText}"`
    },
    summarize: {
      system: 'You are a concise summarizer. Distill this note into essential bullet points. Return ONLY the bullet points.',
      user: `Summarize this note:\n\n"${noteText}"`
    },
    expand: {
      system: 'You are a creative thought partner. Elaborate on this idea with insightful context, key considerations, and next steps. Return ONLY the expanded note.',
      user: `Expand on this idea:\n\n"${noteText}"`
    }
  };

  const selected = prompts[action] || prompts.polish;
  const result = await executeAiTextPrompt({
    provider,
    apiKey,
    systemPrompt: selected.system,
    userPrompt: selected.user
  });

  return result;
}

/**
 * Feature 3: Evaluate User Sentence with AI
 */
export async function evaluateUserSentenceWithAi({ word, userSentence, sentence, provider, apiKey }) {
  const sentenceToEval = (userSentence || sentence || '').trim();
  if (!sentenceToEval) throw new Error('Please write a sentence first.');

  const system = `You are an encouraging, expert English linguist and language coach.
Evaluate how the student used the target word in their sentence.
Always respond with ONLY a single valid JSON object adhering strictly to this schema:
{
  "isCorrect": true,
  "score": 9,
  "feedback": "Clear explanation of grammar, nuance, and collocations.",
  "improvedVersion": "A more eloquent or natural native alternative."
}`;

  const user = `Target Word: "${word}"
Student's Sentence: "${sentenceToEval}"

Check if the word was used with correct meaning, part of speech, and natural collocation. Score out of 10. Respond in JSON.`;

  const raw = await executeAiTextPrompt({
    provider,
    apiKey,
    systemPrompt: system,
    userPrompt: user
  });

  try {
    const parsed = JSON.parse(cleanJsonOutput(raw));
    return {
      isCorrect: Boolean(parsed.isCorrect),
      score: Number(parsed.score) || 7,
      feedback: parsed.feedback || 'Good attempt!',
      improvedVersion: parsed.improvedVersion || sentenceToEval
    };
  } catch (err) {
    return {
      isCorrect: true,
      score: 8,
      feedback: raw,
      improvedVersion: sentenceToEval
    };
  }
}
