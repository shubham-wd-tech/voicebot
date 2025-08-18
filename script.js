import Vapi from '@vapi-ai/web';

// Your Vapi public key
const VAPI_PUBLIC_KEY = 'da800bab-13a7-4530-b565-9ae068cd2e83';

// Initialize Vapi
const vapi = new Vapi(VAPI_PUBLIC_KEY);

// DOM elements
const startCallBtn = document.getElementById('startCallBtn');
const stopCallBtn = document.getElementById('stopCallBtn');
const muteBtn = document.getElementById('muteBtn');
const chatMessages = document.getElementById('chatMessages');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const callInfo = document.getElementById('callInfo');
const callDuration = document.getElementById('callDuration');
const volumeLevel = document.getElementById('volumeLevel');
const textInputContainer = document.querySelector('.text-input-container');
const textInput = document.getElementById('textInput');
const sendTextBtn = document.getElementById('sendTextBtn');

// State variables
let isCallActive = false;
let callStartTime = null;
let callDurationInterval = null;
let isMuted = false;

// Initialize the app
function init() {
    setupEventListeners();
    setupVapiEvents();
}

// Setup event listeners
function setupEventListeners() {
    startCallBtn.addEventListener('click', startCall);
    stopCallBtn.addEventListener('click', stopCall);
    muteBtn.addEventListener('click', toggleMute);
    sendTextBtn.addEventListener('click', sendTextMessage);
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendTextMessage();
        }
    });
}

// Setup Vapi event listeners
function setupVapiEvents() {
    vapi.on('call-start', () => {
        console.log('Call started');
        updateStatus('calling', 'In Call');
        showCallControls();
        startCallTimer();
        addMessage('bot', 'Call started! I can hear you now.');
    });

    vapi.on('call-end', () => {
        console.log('Call ended');
        updateStatus('ready', 'Ready');
        hideCallControls();
        stopCallTimer();
        addMessage('bot', 'Call ended. Click start call to begin a new conversation.');
    });

    vapi.on('speech-start', () => {
        console.log('Assistant started speaking');
        addMessage('bot', '🤖 Speaking...');
    });

    vapi.on('speech-end', () => {
        console.log('Assistant finished speaking');
        // Remove the "Speaking..." message
        const speakingMessage = chatMessages.querySelector('.message:last-child');
        if (speakingMessage && speakingMessage.textContent.includes('Speaking...')) {
            speakingMessage.remove();
        }
    });

    vapi.on('volume-level', (volume) => {
        console.log(`Volume level: ${volume}`);
        updateVolumeLevel(volume);
    });

    vapi.on('message', (message) => {
        console.log('Message received:', message);
        handleVapiMessage(message);
    });

    vapi.on('error', (error) => {
        console.error('Vapi error:', error);
        updateStatus('error', 'Error');
        addMessage('bot', `Error: ${error.message || 'Something went wrong'}`);
    });
}

// Start a call
async function startCall() {
    try {
        updateStatus('calling', 'Starting...');
        startCallBtn.disabled = true;
        
        // Start call with your existing Vapi assistant
        await vapi.start('c036cff9-6a41-4a7d-bcf0-599d186e1b03');
        
        isCallActive = true;
        addMessage('bot', 'Starting call...');
        
    } catch (error) {
        console.error('Failed to start call:', error);
        updateStatus('error', 'Failed to start');
        addMessage('bot', `Failed to start call: ${error.message}`);
        startCallBtn.disabled = false;
    }
}

// Stop the call
function stopCall() {
    try {
        vapi.stop();
        isCallActive = false;
        addMessage('bot', 'Ending call...');
    } catch (error) {
        console.error('Failed to stop call:', error);
        addMessage('bot', `Error stopping call: ${error.message}`);
    }
}

// Toggle mute
function toggleMute() {
    try {
        isMuted = !isMuted;
        vapi.setMuted(isMuted);
        
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i> Unmute';
            muteBtn.classList.remove('btn-secondary');
            muteBtn.classList.add('btn-primary');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mute';
            muteBtn.classList.remove('btn-primary');
            muteBtn.classList.add('btn-secondary');
        }
        
        addMessage('bot', isMuted ? 'Microphone muted' : 'Microphone unmuted');
    } catch (error) {
        console.error('Failed to toggle mute:', error);
        addMessage('bot', `Error toggling mute: ${error.message}`);
    }
}

// Send text message
function sendTextMessage() {
    const text = textInput.value.trim();
    if (!text || !isCallActive) return;
    
    try {
        vapi.send({
            type: 'add-message',
            message: {
                role: 'user',
                content: text,
            },
        });
        
        addMessage('user', text);
        textInput.value = '';
        
    } catch (error) {
        console.error('Failed to send text message:', error);
        addMessage('bot', `Error sending message: ${error.message}`);
    }
}

// Handle Vapi messages
function handleVapiMessage(message) {
    if (message.role === 'assistant' && message.content) {
        addMessage('bot', message.content);
    } else if (message.role === 'user' && message.content) {
        // User messages from voice input
        addMessage('user', message.content);
    }
}

// Add message to chat
function addMessage(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const icon = document.createElement('i');
    icon.className = sender === 'bot' ? 'fas fa-robot' : 'fas fa-user';
    
    const text = document.createElement('p');
    text.textContent = content;
    
    messageContent.appendChild(icon);
    messageContent.appendChild(text);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update status
function updateStatus(status, text) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
}

// Show call controls
function showCallControls() {
    startCallBtn.style.display = 'none';
    stopCallBtn.style.display = 'inline-flex';
    muteBtn.style.display = 'inline-flex';
    textInputContainer.style.display = 'block';
    callInfo.style.display = 'flex';
}

// Hide call controls
function hideCallControls() {
    startCallBtn.style.display = 'inline-flex';
    startCallBtn.disabled = false;
    stopCallBtn.style.display = 'none';
    muteBtn.style.display = 'none';
    textInputContainer.style.display = 'none';
    callInfo.style.display = 'none';
}

// Start call timer
function startCallTimer() {
    callStartTime = Date.now();
    callDurationInterval = setInterval(updateCallDuration, 1000);
}

// Stop call timer
function stopCallTimer() {
    if (callDurationInterval) {
        clearInterval(callDurationInterval);
        callDurationInterval = null;
    }
    callStartTime = null;
    callDuration.textContent = '00:00';
}

// Update call duration
function updateCallDuration() {
    if (callStartTime) {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        callDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Update volume level
function updateVolumeLevel(volume) {
    const volumePercent = Math.round(volume * 100);
    volumeLevel.textContent = `${volumePercent}%`;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle page visibility change to stop call when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isCallActive) {
        console.log('Page hidden, stopping call');
        stopCall();
    }
});

// Handle beforeunload to stop call when leaving page
window.addEventListener('beforeunload', () => {
    if (isCallActive) {
        vapi.stop();
    }
});
