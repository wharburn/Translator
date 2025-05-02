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
  // Use the credentials file specified in the environment variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    speechClient = new speech.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    console.log('Google Speech-to-Text client initialized with credentials file');
  } else {
    // Try to use default credentials
    speechClient = new speech.SpeechClient();
    console.log('Google Speech-to-Text client initialized with default credentials');
  }
} catch (error) {
  console.error('Error initializing Google Speech-to-Text client:', error.message);
  throw new Error(`Failed to initialize Google Speech-to-Text client: ${error.message}`);
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
      // Use the real Google Cloud Speech-to-Text API
      console.log('Sending audio to Google Cloud Speech-to-Text API...');

      // Convert audio to WAV format for better compatibility
      // First, save the audio to a temporary file
      const tempFilePath = path.join(__dirname, '../../uploads', `temp_${Date.now()}.wav`);

      // Use ffmpeg to convert the audio to WAV format
      try {
        const { execSync } = require('child_process');
        execSync(`ffmpeg -i ${filename} -acodec pcm_s16le -ar 16000 -ac 1 ${tempFilePath}`);
        console.log('Converted audio to WAV format');

        // Read the converted WAV file
        audio.content = fs.readFileSync(tempFilePath).toString('base64');

        // Update config for WAV format
        config.encoding = 'LINEAR16';
        config.sampleRateHertz = 16000;
        config.audioChannelCount = 1;

        // Clean up the temporary file
        fs.unlinkSync(tempFilePath);
      } catch (conversionError) {
        console.error('Error converting audio format:', conversionError);
        console.log('Proceeding with original audio format');
      }

      const request = {
        audio: audio,
        config: config,
      };

      // Send the request to Google Cloud Speech-to-Text API
      const [response] = await speechClient.recognize(request);

      if (response && response.results && response.results.length > 0) {
        transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        console.log('Transcription received:', transcription);
      } else {
        console.log('No transcription results returned');
        transcription = "No speech detected. Please try again with a clearer audio.";
      }
    } catch (error) {
      console.error('Error using Google Cloud Speech-to-Text API:', error);

      // Return a clear error message to the client
      return res.status(500).json({
        error: 'Failed to transcribe audio',
        details: error.message,
        message: 'There was an error processing your speech. This is likely due to an issue with the audio format or the Google Cloud Speech-to-Text API configuration.'
      });
    }

    // Clean up temporary file
    fs.unlinkSync(filename);

    // Return transcription
    console.log('Sending transcription to client:', transcription);
    return res.json({ transcription });
  } catch (error) {
    console.error('Speech to text error:', error);
    res.status(500).json({
      error: 'Failed to transcribe',
      details: error.message
    });
  }
});

module.exports = router;
