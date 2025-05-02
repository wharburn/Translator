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
- Google Cloud account with Speech-to-Text API enabled
- DeepL API key

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd Translator
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   DEEPL_API_KEY=your_deepl_api_key
   GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials_json
   PORT=5000
   ```

4. Place your Google Cloud credentials JSON file in the root directory.

5. Start the server:
   ```
   npm start
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Deployment

This application is configured for deployment on Render. Follow these steps:

1. Push your code to a GitHub repository
2. Create a new Web Service on Render
3. Connect to your GitHub repository
4. Configure the environment variables
5. Deploy!

## Mobile Compatibility

The application is designed to work on mobile browsers with the following considerations:
- Uses responsive design for all screen sizes
- Optimizes audio capture for mobile devices
- Handles mobile-specific browser limitations

## License

MIT
