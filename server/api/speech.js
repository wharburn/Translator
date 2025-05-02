// Speech-to-text API route
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Initialize Google Speech Client
// For development/testing purposes only - in production, use a proper service account
const speechClient = new speech.SpeechClient({
  credentials: {
    client_email: 'test-account@test-project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n',
  },
  projectId: process.env.GOOGLE_PROJECT_ID || 'translator-458601',
});

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

    // For development/testing - use a mock response instead of actual API call
    // In production, uncomment the following lines and use a proper service account
    /*
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    */

    // Mock response for testing
    console.log('Using mock speech-to-text response for testing');
    const transcription = "This is a mock transcription for testing purposes. Your audio was received successfully.";

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
