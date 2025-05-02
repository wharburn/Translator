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
  const requiredVars = [
    'DEEPL_API_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    return false;
  }

  // Validate Google credentials file exists
  const googleCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!fs.existsSync(googleCredentialsPath)) {
    console.error(`Google credentials file not found at: ${googleCredentialsPath}`);
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
  
  return {
    isValid,
    googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    hasDeeplKey: !!process.env.DEEPL_API_KEY
  };
}

module.exports = {
  validateEnv,
  initCredentials
};
