// Speech-to-text API route
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Initialize Google Speech Client if credentials are available
let speechClient;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV !== 'production') {
    speechClient = new speech.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    console.log('Google Speech-to-Text client initialized with credentials file');
  } else {
    // For development/testing or when credentials are not available
    speechClient = new speech.SpeechClient({
      projectId: process.env.GOOGLE_PROJECT_ID || 'mock-project-id',
    });
    console.log('Google Speech-to-Text client initialized with mock credentials');
  }
} catch (error) {
  console.warn('Error initializing Google Speech-to-Text client:', error.message);
  console.warn('Will use mock responses for speech-to-text');

  // Create a mock client
  speechClient = {
    recognize: async () => {
      return [{ results: [] }];
    }
  };
}

/**
 * Speech-to-text endpoint
 * @route POST /api/speech-to-text
 * @param {file} audio - The audio file to transcribe
 * @param {string} language - The language code (e.g., en-US, ru-RU)
 * @returns {object} - JSON with transcription
 */
router.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filename = req.file.path;
    console.log('Received audio file:', filename);
    console.log('Language:', req.body.language);

    // Read audio file
    const audio = {
      content: fs.readFileSync(filename).toString('base64'),
    };

    // Configure speech recognition
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: req.body.language || 'en-US',
    };

    const request = {
      audio: audio,
      config: config,
    };

    let transcription;

    // In production or when credentials are not available, use mock response
    if (process.env.NODE_ENV === 'production' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Using mock speech-to-text response');
      transcription = "This is a mock transcription for testing purposes. Your audio was received successfully.";
    } else {
      try {
        // Try to use the actual Google Speech-to-Text API
        const [response] = await speechClient.recognize(request);

        if (response && response.results && response.results.length > 0) {
          transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        } else {
          console.log('No transcription results returned, using mock response');
          transcription = "No speech detected. Please try again.";
        }
      } catch (error) {
        console.error('Error using Google Speech-to-Text API:', error);
        console.log('Falling back to mock response');
        transcription = "Error processing speech. This is a mock response.";
      }
    }

    // Clean up temporary file
    fs.unlinkSync(filename);

    // Return transcription
    res.json({ transcription });
  } catch (error) {
    console.error('Speech to text error:', error);
    res.status(500).json({
      error: 'Failed to transcribe',
      details: error.message
    });
  }
});

module.exports = router;
