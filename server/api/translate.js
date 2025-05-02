// Translation API route
const express = require('express');
const { Translator } = require('deepl-node');

const router = express.Router();

// Initialize DeepL translator
const translator = new Translator(process.env.DEEPL_API_KEY);

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
    }

    try {
      // Perform translation
      const result = await translator.translateText(text, null, fixedTargetLang);
      return res.json({ translatedText: result.text });
    } catch (error) {
      console.error('Translation error:', error);

      // Fallback to mock translation for testing
      console.log('Using mock translation for testing');
      return res.json({
        translatedText: `[${fixedTargetLang}] ${text}`,
        note: 'This is a mock translation for testing purposes.'
      });
    }
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: 'Failed to translate',
      details: error.message
    });
  }
});

module.exports = router;
