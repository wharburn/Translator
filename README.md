# Live Translator

A real-time speech-to-text and translation application that works on both desktop and mobile browsers.

## Features

- Real-time audio capture and transcription
- Instant translation to multiple languages
- Mobile-friendly interface
- Continuous streaming with a single "Start Listening" button

## Technologies Used

- **Backend**: Node.js, Express
- **APIs**: Google Speech-to-Text, DeepL Translation
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- (Optional) Google Cloud account with Speech-to-Text API enabled
- (Optional) DeepL API key

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd Translator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory (see `.env.example` for reference):

   ```env
   DEEPL_API_KEY=your_deepl_api_key
   GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials_json
   GOOGLE_PROJECT_ID=your_google_project_id
   PORT=5000
   NODE_ENV=development
   ```

   > **Note**: If you don't have API keys, the application will use mock responses for both speech-to-text and translation.

4. Start the server:

   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:5000`

## Development

Run the application in development mode with hot reloading:

```bash
npm run dev
```

## Project Structure

```text
/
├── public/              # Frontend static assets
│   ├── css/             # CSS stylesheets
│   ├── js/              # JavaScript files
│   └── index.html       # Main HTML file
├── server/              # Backend code
│   ├── api/             # API routes
│   │   ├── speech.js    # Speech-to-text endpoint
│   │   └── translate.js # Translation endpoint
│   ├── config/          # Configuration files
│   └── server.js        # Main server file
├── static/              # Static assets (images, etc.)
├── uploads/             # Temporary audio uploads (gitignored)
├── .env                 # Environment variables (gitignored)
├── .env.example         # Example environment variables
└── package.json         # Node.js dependencies
```

## Setting Up Real Speech-to-Text

To use real speech-to-text with Google Cloud Speech-to-Text API:

1. Create a Google Cloud project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Speech-to-Text API for your project
3. Create a service account with the "Speech-to-Text User" role
4. Create and download a JSON key for this service account
5. Save the key file in your project directory (e.g., as `google-credentials.json`)
6. Update your `.env` file:

   ```env
   GOOGLE_APPLICATION_CREDENTIALS=google-credentials.json
   USE_MOCK_SPEECH=false
   ```

## Deployment

This application is configured for deployment on Render. Follow these steps:

1. Push your code to a GitHub repository
2. Create a new Web Service on Render
3. Connect to your GitHub repository
4. Configure the environment variables:
   - `DEEPL_API_KEY`: Your DeepL API key
   - `NODE_ENV`: Set to `production`
   - `USE_MOCK_SPEECH`: Set to `false` to use real speech-to-text (default is `true`)
5. Add Google credentials as a secret file:
   - Path: `/etc/secrets/google-credentials.json`
   - Contents: Your Google credentials JSON (from step 4 of "Setting Up Real Speech-to-Text")
   - Add environment variable: `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/google-credentials.json`
6. Deploy!

> **Note**: If you don't provide API keys, the application will use mock responses.

## Mobile Compatibility

The application is designed to work on mobile browsers with the following considerations:

- Uses responsive design for all screen sizes
- Optimizes audio capture for mobile devices
- Handles mobile-specific browser limitations

## License

MIT
