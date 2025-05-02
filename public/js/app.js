// Main application JavaScript for continuous speech recognition and translation
// Optimized for mobile browser compatibility

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const listenButton = document.getElementById('listenButton');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const transcribedText = document.getElementById('transcribedText');
    const translatedText = document.getElementById('translatedText');
    const translationHistory = document.getElementById('translationHistory');
    const statusMessage = document.getElementById('statusMessage');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    // State variables
    let mediaRecorder;
    let audioStream;
    let isListening = false;
    let currentTranscription = '';
    let lastTranslatedText = '';
    let processingAudio = false;
    let audioChunks = [];
    let chunkInterval;
    let isMobile = false;
    let silenceTimer = null;
    let isSpeaking = false;
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let scriptProcessor = null;
    let speechStartTime = null;
    let volumeHistory = [];
    let lastProcessedTime = 0;

    // Constants
    const CHUNK_INTERVAL = 2000; // Process audio chunks every 2 seconds
    const SILENCE_THRESHOLD = 15; // Volume level below which is considered silence (0-100)
    const SPEECH_THRESHOLD = 25; // Volume level above which is considered speech (0-100)
    const MIN_SPEECH_DURATION = 500; // Minimum duration of speech to be considered valid (ms)
    const SILENCE_DURATION = 1500; // Duration of silence to be considered end of sentence (ms)
    const VOLUME_HISTORY_SIZE = 10; // Number of volume samples to keep for smoothing

    // Check if running on mobile device
    function checkMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Check browser compatibility
    function checkBrowserCompatibility() {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showStatus('Your browser does not support audio recording. Please try Chrome, Firefox, or Safari.', 'error');
            return false;
        }

        // Check if MediaRecorder is supported
        if (typeof MediaRecorder === 'undefined') {
            showStatus('Your browser supports microphone access but not audio recording. Please try Chrome or Firefox.', 'error');
            return false;
        }

        return true;
    }

    // Initialize
    function init() {
        isMobile = checkMobile();

        if (!checkBrowserCompatibility()) {
            listenButton.disabled = true;
            return;
        }

        // Add mobile-specific event listeners
        if (isMobile) {
            // Handle page visibility changes (when user switches apps)
            document.addEventListener('visibilitychange', handleVisibilityChange);

            // Handle page unload/navigation
            window.addEventListener('beforeunload', stopListening);

            // Adjust UI for mobile
            document.body.classList.add('mobile');
        }
    }

    // Handle visibility change (mobile)
    function handleVisibilityChange() {
        if (document.hidden && isListening) {
            // Pause processing when app is in background
            clearInterval(chunkInterval);
        } else if (!document.hidden && isListening) {
            // Resume processing when app is in foreground
            chunkInterval = setInterval(processAudioChunks, CHUNK_INTERVAL);
        }
    }

    // Show status message
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type === 'error' ? 'status-error' : 'status-info'}`;
        statusMessage.style.display = 'block';

        if (type === 'info') {
            setTimeout(() => {
                if (statusMessage.textContent === message) {
                    hideStatus();
                }
            }, 5000);
        }
    }

    // Hide status message
    function hideStatus() {
        statusMessage.style.display = 'none';
    }

    // Show progress indicator
    function showProgress(text = 'Processing...') {
        progressContainer.style.display = 'block';
        progressText.textContent = text;
        progressBar.style.width = '0%';
        progressBar.classList.add('progress-bar-animated');
    }

    // Update progress
    function updateProgress(percent, text) {
        progressBar.style.width = `${percent}%`;
        if (text) {
            progressText.textContent = text;
        }
    }

    // Hide progress indicator
    function hideProgress() {
        progressContainer.style.display = 'none';
        progressBar.classList.remove('progress-bar-animated');
    }

    // Add to translation history
    function addToHistory(original, translated) {
        if (original.trim() === '' || translated.trim() === '') return;

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-original">${original}</div>
            <div class="history-translated">${translated}</div>
        `;
        translationHistory.insertBefore(historyItem, translationHistory.firstChild);

        // Limit history items
        if (translationHistory.children.length > 10) {
            translationHistory.removeChild(translationHistory.lastChild);
        }
    }

    // Speech to text API call
    async function speechToText(audioBlob) {
        try {
            showProgress('Transcribing audio...');
            updateProgress(30, 'Transcribing audio...');

            // Log audio blob details for debugging
            console.log('Audio blob:', {
                type: audioBlob.type,
                size: audioBlob.size,
                lastModified: audioBlob.lastModified
            });

            // Create a form with the audio blob
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('language', sourceLanguage.value);

            // Add browser info to help with debugging
            formData.append('userAgent', navigator.userAgent);
            formData.append('mimeType', audioBlob.type);

            // Send to server
            const response = await fetch('/api/speech-to-text', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to transcribe audio');
            }

            updateProgress(60, 'Audio transcribed!');
            const data = await response.json();

            console.log('Received response from server:', data);

            // If we got a transcription, return it
            if (data && data.transcription) {
                return data.transcription;
            } else {
                console.error('No transcription in response:', data);
                throw new Error('No transcription returned from server');
            }
        } catch (error) {
            console.error('Speech to text error:', error);

            // Show a more user-friendly error message
            if (error.message.includes('format') || error.message.includes('unsupported')) {
                showStatus('Audio format not supported. Please try a different browser.', 'error');
            } else if (error.message.includes('No speech detected')) {
                showStatus('No speech detected. Please speak more clearly.', 'warning');
            } else {
                showStatus(`Error: ${error.message}`, 'error');
            }

            hideProgress();
            return '';
        }
    }

    // Translate API call
    async function translateText(text) {
        if (!text || text.trim() === '') return '';

        try {
            updateProgress(70, 'Translating text...');

            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    targetLang: targetLanguage.value
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to translate text');
            }

            updateProgress(100, 'Translation complete!');
            const data = await response.json();

            // Hide progress after a short delay
            setTimeout(() => {
                hideProgress();
            }, 1000);

            return data.translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            showStatus(`Error: ${error.message}`, 'error');
            hideProgress();
            return '';
        }
    }

    // Process audio chunks
    async function processAudioChunks() {
        if (processingAudio || audioChunks.length === 0) return;

        processingAudio = true;

        try {
            // Determine best audio format based on browser
            let mimeType = 'audio/webm';

            // Safari on iOS often works better with MP4
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent)) {
                mimeType = 'audio/mp4';
            }

            // Create audio blob from chunks
            const audioBlob = new Blob(audioChunks, { type: mimeType });

            // Clear chunks for next processing
            const chunksToProcess = [...audioChunks];
            audioChunks = [];

            // Show processing indicator
            if (!isMobile) {
                showProgress('Processing audio...');
                updateProgress(20, 'Processing audio...');
            }

            // Transcribe audio
            const transcription = await speechToText(audioBlob);

            if (transcription && transcription.trim() !== '') {
                // Update transcription display
                transcribedText.textContent = transcription;
                currentTranscription = transcription;

                // Translate text
                const translation = await translateText(transcription);

                if (translation && translation.trim() !== '') {
                    // Update translation display
                    translatedText.textContent = translation;

                    // Only add to history if it's different from the last translation
                    if (translation !== lastTranslatedText) {
                        addToHistory(transcription, translation);
                        lastTranslatedText = translation;

                        // Update last processed time for sentence boundary detection
                        lastProcessedTime = Date.now();
                    }
                }
            }

            // If we're still speaking, prepare for the next chunk
            if (isSpeaking) {
                showStatus('Listening for more...', 'info');
            }
        } catch (error) {
            console.error('Error processing audio chunk:', error);
            showStatus('Error processing audio. Please try again.', 'error');
        } finally {
            processingAudio = false;
            hideProgress();
        }
    }

    // Get current volume level from audio data
    function getVolumeLevel(analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }

        // Return volume level from 0-100
        return Math.min(100, Math.round((sum / bufferLength) * 100 / 256));
    }

    // Get smoothed volume level using history
    function getSmoothedVolumeLevel(currentVolume) {
        // Add current volume to history
        volumeHistory.push(currentVolume);

        // Keep history at fixed size
        if (volumeHistory.length > VOLUME_HISTORY_SIZE) {
            volumeHistory.shift();
        }

        // Calculate average
        const sum = volumeHistory.reduce((a, b) => a + b, 0);
        return sum / volumeHistory.length;
    }

    // Handle audio processing for voice activity detection
    function processAudio() {
        if (!analyser) return;

        // Get current volume level
        const rawVolume = getVolumeLevel(analyser);
        const volume = getSmoothedVolumeLevel(rawVolume);

        // Detect speech start
        if (!isSpeaking && volume > SPEECH_THRESHOLD) {
            isSpeaking = true;
            speechStartTime = Date.now();
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }

            // Visual feedback that we detected speech
            listenButton.classList.add('active-speech');
            showStatus('Speech detected', 'info');
        }

        // Detect speech end (silence)
        if (isSpeaking && volume < SILENCE_THRESHOLD) {
            // Only consider it silence if we've been speaking for the minimum duration
            const speechDuration = Date.now() - speechStartTime;

            if (speechDuration > MIN_SPEECH_DURATION) {
                if (!silenceTimer) {
                    silenceTimer = setTimeout(() => {
                        // End of sentence detected
                        isSpeaking = false;
                        listenButton.classList.remove('active-speech');

                        // Process the audio if we haven't processed recently
                        const now = Date.now();
                        if (now - lastProcessedTime > 1000 && audioChunks.length > 0) {
                            lastProcessedTime = now;
                            processAudioChunks();
                            showStatus('Processing speech...', 'info');
                        }

                        silenceTimer = null;
                    }, SILENCE_DURATION);
                }
            }
        } else if (silenceTimer && volume > SILENCE_THRESHOLD) {
            // Cancel silence timer if volume goes back up
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }
    }

    // Start listening
    async function startListening() {
        try {
            showStatus('Initializing microphone...', 'info');

            // Reset state
            volumeHistory = [];
            isSpeaking = false;
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }

            // Basic audio constraints that work on most devices
            let constraints = { audio: true };

            // Try to use more specific constraints on desktop browsers
            if (!isMobile) {
                try {
                    // Request microphone permission with specific constraints
                    audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            channelCount: 1,
                            sampleRate: 48000,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    });
                } catch (err) {
                    console.warn('Could not use specific audio constraints, falling back to defaults', err);
                    audioStream = await navigator.mediaDevices.getUserMedia(constraints);
                }
            } else {
                // Use simpler constraints for mobile
                audioStream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            // Set up audio context for voice activity detection
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;

                microphone = audioContext.createMediaStreamSource(audioStream);
                microphone.connect(analyser);

                // Create script processor for continuous monitoring
                scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
                scriptProcessor.onaudioprocess = () => processAudio();

                // Connect the script processor
                analyser.connect(scriptProcessor);
                scriptProcessor.connect(audioContext.destination);

                console.log('Voice activity detection initialized');
            } catch (err) {
                console.warn('Could not initialize voice activity detection:', err);
                // Continue without voice activity detection
            }

            showStatus('Listening...', 'info');

            // Find supported MIME type
            let options;
            const supportedMimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/mpeg',
                'audio/wav'
            ];

            // Safari on iOS often needs special handling
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent)) {
                // Try MP4 first for Safari
                supportedMimeTypes.unshift('audio/mp4');
            }

            // Find first supported MIME type
            for (const mimeType of supportedMimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    options = { mimeType };
                    console.log(`Using mime type: ${mimeType}`);
                    break;
                }
            }

            // Create media recorder with fallback
            try {
                mediaRecorder = new MediaRecorder(audioStream, options);
            } catch (e) {
                console.warn('Failed to create MediaRecorder with options, using defaults', e);
                mediaRecorder = new MediaRecorder(audioStream);
            }

            // Reset audio chunks
            audioChunks = [];

            // Handle data available event
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            });

            // Start recording - use longer intervals on mobile to save battery
            const timeslice = isMobile ? 500 : 100; // ms
            mediaRecorder.start(timeslice);

            // Process chunks at regular intervals - longer on mobile
            const intervalTime = isMobile ? CHUNK_INTERVAL * 1.5 : CHUNK_INTERVAL;
            chunkInterval = setInterval(processAudioChunks, intervalTime);

            // Update state
            isListening = true;
            listenButton.textContent = 'Stop Listening';
            listenButton.classList.add('recording');

        } catch (error) {
            console.error('Error starting listening:', error);
            let errorMessage = 'Error: ';

            if (error.name === 'NotAllowedError') {
                errorMessage += 'Microphone access denied. Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No microphone found. Please connect a microphone and try again.';
            } else {
                errorMessage += error.message;
            }

            showStatus(errorMessage, 'error');
        }
    }

    // Stop listening
    function stopListening() {
        if (!isListening) return;

        try {
            // Stop the media recorder
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }

            // Stop all audio tracks
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }

            // Clear the chunk processing interval
            if (chunkInterval) {
                clearInterval(chunkInterval);
                chunkInterval = null;
            }

            // Clean up voice activity detection resources
            if (scriptProcessor) {
                scriptProcessor.disconnect();
                scriptProcessor = null;
            }

            if (analyser) {
                analyser.disconnect();
                analyser = null;
            }

            if (microphone) {
                microphone.disconnect();
                microphone = null;
            }

            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close().catch(err => console.warn('Error closing audio context:', err));
                audioContext = null;
            }

            // Clear any pending silence timer
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }

            // Reset speech detection state
            isSpeaking = false;
            volumeHistory = [];

            // Process any remaining audio
            if (audioChunks.length > 0) {
                setTimeout(processAudioChunks, 500);
            }

            // Update state
            isListening = false;
            listenButton.textContent = 'Start Listening';
            listenButton.classList.remove('recording');
            listenButton.classList.remove('active-speech');

            showStatus('Stopped listening', 'info');
        } catch (error) {
            console.error('Error stopping recording:', error);
        }
    }

    // Handle language selection changes
    sourceLanguage.addEventListener('change', () => {
        if (isListening) {
            // Restart listening with new language
            stopListening();
            setTimeout(() => {
                startListening();
            }, 500);
        }
    });

    targetLanguage.addEventListener('change', async () => {
        // Retranslate current transcription with new target language
        if (currentTranscription && currentTranscription.trim() !== '') {
            const translation = await translateText(currentTranscription);
            if (translation) {
                translatedText.textContent = translation;
                lastTranslatedText = translation;
                addToHistory(currentTranscription, translation);
            }
        }
    });

    // Handle listen button click
    listenButton.addEventListener('click', () => {
        if (!isListening) {
            startListening();
        } else {
            stopListening();
        }
    });

    // Initialize the application
    init();
});
