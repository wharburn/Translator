// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Translator } = require('deepl-node');
const speech = require('@google-cloud/speech');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the static directory
app.use('/static', express.static(path.join(__dirname, 'static')));

// Initialize DeepL
const translator = new Translator(process.env.DEEPL_API_KEY);

// Initialize Google Speech Client
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Root route - serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Speech-to-text route
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    const filename = req.file.path;
    console.log('Received audio file:', filename);
    console.log('Language:', req.body.language);

    const audio = {
      content: fs.readFileSync(filename).toString('base64'),
    };

    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: req.body.language || 'en-US', // e.g. en-US or ru-RU
    };

    const request = {
      audio: audio,
      config: config,
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    fs.unlinkSync(filename); // clean up file

    res.json({ transcription });
  } catch (error) {
    console.error('Speech to text error:', error);
    res.status(500).json({ error: 'Failed to transcribe' });
  }
});

// Translation route
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Missing text or targetLang' });
    }

    const result = await translator.translateText(text, null, targetLang);
    res.json({ translatedText: result.text });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Screen Whisper backend running on port ${port}`);
});
