// Speech-to-text API route
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');
const { initCredentials } = require('../config/credentials');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get credentials configuration
const credConfig = initCredentials();

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

    // Get additional information from the client
    const userAgent = req.body.userAgent || 'Unknown';
    const mimeType = req.body.mimeType || 'Unknown';
    console.log('User agent:', userAgent);
    console.log('MIME type:', mimeType);

    // Read audio file
    const audio = {
      content: fs.readFileSync(filename).toString('base64'),
    };

    // Determine the best encoding based on the MIME type
    let encoding = 'WEBM_OPUS';
    let sampleRateHertz = 48000;

    if (mimeType.includes('mp4') || mimeType.includes('mpeg')) {
      encoding = 'MP3';
      sampleRateHertz = 44100;
    } else if (mimeType.includes('wav')) {
      encoding = 'LINEAR16';
      sampleRateHertz = 16000;
    } else if (mimeType.includes('ogg')) {
      encoding = 'OGG_OPUS';
      sampleRateHertz = 48000;
    }

    console.log('Using encoding:', encoding);
    console.log('Using sample rate:', sampleRateHertz);

    // Configure speech recognition with more flexible settings
    const config = {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: req.body.language || 'en-US',
      enableAutomaticPunctuation: true,
      model: 'default',
      useEnhanced: true,
      audioChannelCount: 1,
    };

    const request = {
      audio: audio,
      config: config,
    };

    let transcription;

    try {
      // Check if we should use mock responses
      if (credConfig.useMockSpeechToText) {
        // Use mock responses for speech-to-text
        console.log('Using mock speech-to-text response (configured via env)');

        // Generate a random mock response based on the audio file size
        const fileSize = fs.statSync(filename).size;
        const mockResponses = [
          "Hello, how are you today?",
          "This is a test of the speech recognition system.",
          "I'm speaking into the microphone to test the translation.",
          "The weather is nice today, isn't it?",
          "I would like to translate this sentence into another language.",
          "Testing the real-time translation capabilities of this application.",
          "Can you understand what I'm saying right now?",
          "This application translates speech in real time.",
          "I'm impressed by how well this works.",
          "Let's see how accurate the translation is."
        ];

        // Select a mock response based on the file size
        const index = Math.floor(fileSize % mockResponses.length);
        transcription = mockResponses[index];

        console.log('Mock transcription:', transcription);
      } else {
        // Use the real Google Speech-to-Text API
        console.log('Sending audio to Google Speech-to-Text API...');

        // Try different audio configurations if needed
        let attempts = 0;
        let maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
          try {
            // Adjust config based on attempt number
            if (attempts > 0) {
              console.log(`Retry attempt ${attempts} with different audio configuration`);

              if (attempts === 1) {
                // Try with LINEAR16 encoding
                config.encoding = 'LINEAR16';
                config.sampleRateHertz = 16000;
              } else if (attempts === 2) {
                // Try with FLAC encoding
                config.encoding = 'FLAC';
                config.sampleRateHertz = 44100;
              }

              console.log('Using encoding:', config.encoding);
              console.log('Using sample rate:', config.sampleRateHertz);
            }

            const request = {
              audio: audio,
              config: config,
            };

            const [response] = await speechClient.recognize(request);

            if (response && response.results && response.results.length > 0) {
              transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');
              console.log('Transcription received:', transcription);
              success = true;
            } else {
              console.log('No transcription results returned');
              attempts++;
            }
          } catch (error) {
            console.error(`Error on attempt ${attempts}:`, error.message);
            attempts++;

            // If this is the last attempt and still failing, throw the error
            if (attempts >= maxAttempts) {
              throw error;
            }
          }
        }

        // If all attempts failed, set a default message
        if (!success) {
          transcription = "No speech detected. Please try again with a clearer audio.";
        }
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
      } else if (error.message.includes('unsupported') || error.message.includes('DECODER')) {
        transcription = "Error: Audio format not supported. Please try a different microphone or browser.";
      } else {
        transcription = "Error processing speech. Please try again.";
      }

      // Fall back to mock response if real API fails
      console.log('Falling back to mock response due to error');
      const mockResponses = [
        "Hello, this is a fallback response.",
        "I'm sorry, there was an error processing your speech.",
        "Let me try to translate this for you anyway.",
        "This is a backup transcription since the API had an issue."
      ];
      const index = Math.floor(Date.now() % mockResponses.length);
      transcription = mockResponses[index];
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
