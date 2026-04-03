/**
 * translateBio.ts
 *
 * A lightweight client-side utility to call the /api/translate endpoint.
 * This is called exactly once — when a Bricoler saves their profile bio.
 * The results are stored in Firestore as `bio_translations`, so clients
 * read them instantly with zero loading delay.
 */

export type BioTranslations = {
    en?: string;
    fr?: string;
    ar?: string;
};

/**
 * Translates a bio text into the specified target languages.
 * Returns a map of language code → translated text.
 *
 * If the API fails or is unconfigured, this resolves with an empty object
 * so the caller can still save the original bio without crashing.
 *
 * @param text The original bio text to translate
 * @param targetLangs Languages to translate into (default: ['en', 'fr', 'ar'])
 */
export async function translateBio(
    text: string,
    targetLangs: (keyof BioTranslations)[] = ['en', 'fr', 'ar']
): Promise<BioTranslations> {
    if (!text || !text.trim()) return {};

    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim(), targetLangs }),
        });

        if (!res.ok) {
            console.warn('[translateBio] Translation API returned error:', res.status);
            return {};
        }

        const data = await res.json();
        return (data.translations as BioTranslations) || {};
    } catch (err) {
        // Non-fatal — app continues working, just without translations
        console.warn('[translateBio] Failed to translate bio:', err);
        return {};
    }
}
