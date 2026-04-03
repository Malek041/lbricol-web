import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/translate
 *
 * Translates a piece of text into multiple target languages using DeepL's free API.
 * Called server-side only — the API key is never exposed to the client.
 *
 * Body: { text: string, targetLangs: string[] }
 * Response: { translations: { [lang: string]: string } }
 *
 * Supported target language codes: EN, FR, AR, etc.
 * DeepL Free API: https://api-free.deepl.com
 * Sign up for a free key at: https://www.deepl.com/pro#developer
 */

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';

// Map our internal language codes to DeepL language codes
const LANG_MAP: Record<string, string> = {
    en: 'EN',
    fr: 'FR',
    ar: 'AR',
};

export async function POST(req: NextRequest) {
    try {
        const { text, targetLangs } = await req.json();

        if (!text || !targetLangs || !Array.isArray(targetLangs)) {
            return NextResponse.json({ error: 'Missing text or targetLangs' }, { status: 400 });
        }

        if (!DEEPL_API_KEY) {
            console.warn('[translate] DEEPL_API_KEY is not set. Returning empty translations.');
            // Return empty translations gracefully — the app still works, just shows original bio
            return NextResponse.json({ translations: {} });
        }

        const translations: Record<string, string> = {};

        // Translate into each requested language in parallel
        await Promise.all(
            targetLangs.map(async (lang: string) => {
                const deeplLang = LANG_MAP[lang];
                if (!deeplLang) return;

                try {
                    const res = await fetch(DEEPL_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            text: [text],
                            target_lang: deeplLang,
                        }),
                    });

                    if (!res.ok) {
                        console.error(`[translate] DeepL error for ${lang}:`, res.status, await res.text());
                        return;
                    }

                    const data = await res.json();
                    const translated = data.translations?.[0]?.text;
                    if (translated) {
                        translations[lang] = translated;
                    }
                } catch (err) {
                    console.error(`[translate] Error translating to ${lang}:`, err);
                }
            })
        );

        return NextResponse.json({ translations });

    } catch (err) {
        console.error('[translate] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
