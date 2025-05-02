// Translation API route
const express = require('express');
const { Translator } = require('deepl-node');

const router = express.Router();

// Initialize DeepL translator
let translator;
try {
  translator = new Translator(process.env.DEEPL_API_KEY);
  console.log('DeepL translator initialized successfully');
} catch (error) {
  console.warn('Error initializing DeepL translator:', error.message);
  console.warn('Will use mock responses for translation');

  // Create a mock translator
  translator = {
    translateText: async (text, sourceLang, targetLang) => {
      return { text: `[${targetLang}] ${text}` };
    }
  };
}

/**
 * Translation endpoint
 * @route POST /api/translate
 * @param {string} text - The text to translate
 * @param {string} targetLang - The target language code (e.g., EN, FR, RU)
 * @returns {object} - JSON with translated text
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    // Validate request
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Missing or empty text' });
    }

    if (!targetLang) {
      return res.status(400).json({ error: 'Missing targetLang' });
    }

    // Fix deprecated language codes
    let fixedTargetLang = targetLang;
    if (targetLang === 'EN') {
      fixedTargetLang = 'EN-US';
    } else if (targetLang === 'ZH') {
      fixedTargetLang = 'ZH';
    }

    try {
      // Perform translation
      console.log(`Translating text to ${fixedTargetLang}...`);
      const result = await translator.translateText(text, null, fixedTargetLang);
      console.log('Translation received');
      return res.json({ translatedText: result.text });
    } catch (error) {
      console.error('Translation error:', error);

      // Provide a more helpful error message
      let errorMessage = 'Error translating text. Please try again.';
      let translatedText = text;

      if (error.message.includes('auth') || error.message.includes('key')) {
        errorMessage = 'Authentication failed. Please check your DeepL API key.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (error.message.includes('language')) {
        errorMessage = `Language '${fixedTargetLang}' not supported.`;
      }

      return res.status(500).json({
        error: errorMessage,
        translatedText: translatedText
      });
    }
  } catch (error) {
    console.error('Unexpected error in translation route:', error);
    return res.status(500).json({
      error: 'Failed to process translation request',
      details: error.message
    });
  }
});

module.exports = router;
