/**
 * Credentials configuration
 * Handles validation and loading of API credentials
 */

const fs = require('fs');
const path = require('path');

/**
 * Validates that required environment variables are set
 * @returns {boolean} - True if all required variables are set
 */
function validateEnv() {
  // Check for DeepL API key
  if (!process.env.DEEPL_API_KEY) {
    console.warn('Warning: DEEPL_API_KEY environment variable is not set. Translation will use mock responses.');
  }

  // For Google credentials, we'll be more flexible
  // If we're in development and the file is specified, check if it exists
  if (process.env.NODE_ENV !== 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        console.warn(`Warning: Google credentials file not found at: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        console.warn('Speech-to-text will use mock responses.');
      }
    } catch (error) {
      console.warn('Warning: Error checking Google credentials file:', error.message);
      console.warn('Speech-to-text will use mock responses.');
    }
  }

  // In production or when no file is specified, we'll use mock responses
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.NODE_ENV === 'production') {
    console.warn('Google credentials not configured. Speech-to-text will use mock responses.');
  }

  // Always return true to allow the app to start with mock functionality
  return true;
}

/**
 * Initializes and validates all credentials
 * @returns {object} - Credential status
 */
function initCredentials() {
  const isValid = validateEnv();

  // Determine if we should use mock speech-to-text
  const useMockSpeech = process.env.USE_MOCK_SPEECH === 'true' ||
                        !process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (useMockSpeech) {
    console.log('Speech-to-text will use mock responses (configured via env or missing credentials)');
  } else {
    console.log('Speech-to-text will use Google Cloud API');
  }

  return {
    isValid: true, // Always return true to allow the app to start
    googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    hasDeeplKey: !!process.env.DEEPL_API_KEY,
    useMockSpeechToText: useMockSpeech,
    useMockTranslation: !process.env.DEEPL_API_KEY
  };
}

module.exports = {
  validateEnv,
  initCredentials
};
