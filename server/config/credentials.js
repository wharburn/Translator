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
    console.warn('Warning: DEEPL_API_KEY environment variable is not set. Translation may not work properly.');
  }

  // Check for Google credentials
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    console.warn('Speech-to-text functionality may not work properly.');
    return false;
  }

  // If we're in development and the file is specified, check if it exists
  try {
    if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.warn(`Warning: Google credentials file not found at: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      console.warn('Speech-to-text functionality may not work properly.');
      return false;
    }
  } catch (error) {
    console.warn('Warning: Error checking Google credentials file:', error.message);
    console.warn('Speech-to-text functionality may not work properly.');
    return false;
  }

  return true;
}

/**
 * Initializes and validates all credentials
 * @returns {object} - Credential status
 */
function initCredentials() {
  const isValid = validateEnv();

  if (isValid) {
    console.log('Google Cloud Speech-to-Text credentials validated successfully');
  } else {
    console.warn('Google Cloud Speech-to-Text credentials validation failed');
    console.warn('The application will start, but speech-to-text functionality may not work properly');
  }

  return {
    isValid: isValid,
    googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    hasDeeplKey: !!process.env.DEEPL_API_KEY
  };
}

module.exports = {
  validateEnv,
  initCredentials
};
