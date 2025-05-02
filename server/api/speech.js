// Speech-to-text API route
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Initialize Google Speech Client
let speechClient;
try {
  // Read client_secret.json file
  const fs = require('fs');
  const path = require('path');
  const clientSecretPath = path.join(__dirname, '..', '..', 'client_secret.json');

  if (fs.existsSync(clientSecretPath)) {
    const clientSecret = JSON.parse(fs.readFileSync(clientSecretPath, 'utf8'));

    // Initialize with project ID from client_secret.json
    speechClient = new speech.SpeechClient({
      projectId: clientSecret.web.project_id,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL || 'speech-to-text@translator-458601.iam.gserviceaccount.com',
        private_key: process.env.GOOGLE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n',
      }
    });
    console.log('Google Speech-to-Text client initialized with project ID:', clientSecret.web.project_id);
  } else {
    // Fallback to environment variables
    speechClient = new speech.SpeechClient();
    console.log('Google Speech-to-Text client initialized with default credentials');
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

    try {
      // Use the Google Speech-to-Text API
      console.log('Sending audio to Google Speech-to-Text API...');
      const [response] = await speechClient.recognize(request);

      if (response && response.results && response.results.length > 0) {
        transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        console.log('Transcription received:', transcription);
      } else {
        console.log('No transcription results returned');
        transcription = "No speech detected. Please try again.";
      }
    } catch (error) {
      console.error('Error using Google Speech-to-Text API:', error);

      // Provide a more helpful error message
      if (error.message.includes('permission')) {
        transcription = "Error: API permission denied. Please check your Google Cloud credentials.";
      } else if (error.message.includes('auth')) {
        transcription = "Error: Authentication failed. Please check your Google Cloud credentials.";
      } else if (error.message.includes('quota')) {
        transcription = "Error: API quota exceeded. Please try again later.";
      } else {
        transcription = "Error processing speech. Please try again.";
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
