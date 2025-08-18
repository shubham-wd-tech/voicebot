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
const statusText = document.getElementById('statusText');
const callDuration = document.getElementById('callDuration');
const volumeLevel = document.getElementById('volumeLevel');
const textInputContainer = document.querySelector('.text-input-container');
const textInput = document.getElementById('textInput');
const sendTextBtn = document.getElementById('sendTextBtn');
const connectionStatus = document.getElementById('connectionStatus');
const messageCount = document.getElementById('messageCount');
const wordCount = document.getElementById('wordCount');
const totalMessages = document.getElementById('totalMessages');
const userMessages = document.getElementById('userMessages');
const botMessages = document.getElementById('botMessages');
const avgResponseTime = document.getElementById('avgResponseTime');
const browserInfo = document.getElementById('browserInfo');
const micStatus = document.getElementById('micStatus');
const logsPanel = document.getElementById('logsPanel');
const logsContent = document.getElementById('logsContent');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// State variables
let isCallActive = false;
let callStartTime = null;
let callDurationInterval = null;
let isMuted = false;
let messageCountValue = 0;
let userMessageCount = 0;
let botMessageCount = 0;
let totalWordCount = 0;
let responseTimes = [];
let lastMessageTime = null;

// Initialize the app
function init() {
    setupEventListeners();
    setupVapiEvents();
    detectBrowserInfo();
    addLog('System initialized', 'info');
    updateAnalytics();
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
    clearLogsBtn.addEventListener('click', clearLogs);
}

// Setup Vapi event listeners
function setupVapiEvents() {
    vapi.on('call-start', () => {
        console.log('Call started');
        addLog('Call started', 'success');
        updateStatus('In Call');
        updateConnectionStatus('Connected');
        showCallControls();
        startCallTimer();
        addMessage('bot', 'Call started! I can hear you now.');
        lastMessageTime = Date.now();
    });

    vapi.on('call-end', () => {
        console.log('Call ended');
        addLog('Call ended', 'info');
        updateStatus('Ready');
        updateConnectionStatus('Disconnected');
        hideCallControls();
        stopCallTimer();
        addMessage('bot', 'Call ended. Click start call to begin a new conversation.');
    });

    vapi.on('speech-start', () => {
        console.log('Assistant started speaking');
        addLog('Assistant started speaking', 'info');
        addMessage('bot', '🤖 Speaking...');
    });

    vapi.on('speech-end', () => {
        console.log('Assistant finished speaking');
        addLog('Assistant finished speaking', 'info');
        // Remove the "Speaking..." message
        const speakingMessage = chatMessages.querySelector('.message:last-child');
        if (speakingMessage && speakingMessage.textContent.includes('Speaking...')) {
            speakingMessage.remove();
        }
        
        // Calculate response time
        if (lastMessageTime) {
            const responseTime = Date.now() - lastMessageTime;
            responseTimes.push(responseTime);
            updateAnalytics();
        }
    });

    vapi.on('volume-level', (volume) => {
        console.log(`Volume level: ${volume}`);
        updateVolumeLevel(volume);
    });

    vapi.on('message', (message) => {
        console.log('Message received:', message);
        addLog(`Message received: ${message.role}`, 'info');
        handleVapiMessage(message);
    });

    vapi.on('error', (error) => {
        console.error('Vapi error:', error);
        addLog(`Error: ${error.message || 'Something went wrong'}`, 'error');
        updateStatus('Error');
        updateConnectionStatus('Error');
        addMessage('bot', `Error: ${error.message || 'Something went wrong'}`);
    });
}

// Start a call
async function startCall() {
    try {
        addLog('Starting call...', 'info');
        updateStatus('Starting...');
        updateConnectionStatus('Connecting...');
        startCallBtn.disabled = true;
        
        // Start call with your existing Vapi assistant
        await vapi.start('c036cff9-6a41-4a7d-bcf0-599d186e1b03');
        
        isCallActive = true;
        addMessage('bot', 'Starting call...');
        
    } catch (error) {
        console.error('Failed to start call:', error);
        addLog(`Failed to start call: ${error.message}`, 'error');
        updateStatus('Failed to start');
        updateConnectionStatus('Failed');
        addMessage('bot', `Failed to start call: ${error.message}`);
        startCallBtn.disabled = false;
    }
}

// Stop the call
function stopCall() {
    try {
        addLog('Ending call...', 'info');
        vapi.stop();
        isCallActive = false;
        addMessage('bot', 'Ending call...');
    } catch (error) {
        console.error('Failed to stop call:', error);
        addLog(`Error stopping call: ${error.message}`, 'error');
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
            addLog('Microphone muted', 'warning');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mute';
            muteBtn.classList.remove('btn-primary');
            muteBtn.classList.add('btn-secondary');
            addLog('Microphone unmuted', 'info');
        }
        
        addMessage('bot', isMuted ? 'Microphone muted' : 'Microphone unmuted');
    } catch (error) {
        console.error('Failed to toggle mute:', error);
        addLog(`Error toggling mute: ${error.message}`, 'error');
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
        addLog(`Text message sent: ${text}`, 'info');
        
    } catch (error) {
        console.error('Failed to send text message:', error);
        addLog(`Error sending message: ${error.message}`, 'error');
        addMessage('bot', `Error sending message: ${error.message}`);
    }
}

// Handle Vapi messages
function handleVapiMessage(message) {
    if (message.role === 'assistant' && message.content) {
        addMessage('bot', message.content);
        lastMessageTime = Date.now();
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
    
    // Add timestamp
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = getCurrentTime();
    messageDiv.appendChild(timeDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Update message counts
    messageCountValue++;
    if (sender === 'user') {
        userMessageCount++;
    } else {
        botMessageCount++;
    }
    
    // Update word count
    totalWordCount += content.split(' ').length;
    
    updateAnalytics();
}

// Update status
function updateStatus(text) {
    statusText.textContent = text;
}

// Update connection status
function updateConnectionStatus(status) {
    connectionStatus.textContent = status;
}

// Show call controls
function showCallControls() {
    startCallBtn.style.display = 'none';
    stopCallBtn.style.display = 'inline-flex';
    muteBtn.style.display = 'inline-flex';
    textInputContainer.style.display = 'block';
    logsPanel.style.display = 'block';
}

// Hide call controls
function hideCallControls() {
    startCallBtn.style.display = 'inline-flex';
    startCallBtn.disabled = false;
    stopCallBtn.style.display = 'none';
    muteBtn.style.display = 'none';
    textInputContainer.style.display = 'none';
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

// Update analytics
function updateAnalytics() {
    totalMessages.textContent = messageCountValue;
    userMessages.textContent = userMessageCount;
    botMessages.textContent = botMessageCount;
    messageCount.textContent = `${messageCountValue} messages`;
    wordCount.textContent = `${totalWordCount} words`;
    
    // Calculate average response time
    if (responseTimes.length > 0) {
        const avgTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000);
        avgResponseTime.textContent = `${avgTime}s`;
    }
}

// Detect browser information
function detectBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';
    
    browserInfo.textContent = browserName;
    
    // Check microphone access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        micStatus.textContent = 'Available';
    } else {
        micStatus.textContent = 'Not supported';
    }
}

// Add log entry
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = getCurrentTime();
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'log-message';
    messageSpan.textContent = message;
    
    // Add color coding for different log types
    if (type === 'error') messageSpan.style.color = '#ff6b6b';
    else if (type === 'warning') messageSpan.style.color = '#ffd93d';
    else if (type === 'success') messageSpan.style.color = '#6bcf7f';
    
    logEntry.appendChild(timeSpan);
    logEntry.appendChild(messageSpan);
    
    logsContent.appendChild(logEntry);
    logsContent.scrollTop = logsContent.scrollHeight;
}

// Clear logs
function clearLogs() {
    logsContent.innerHTML = '';
    addLog('Logs cleared', 'info');
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle page visibility change to stop call when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isCallActive) {
        console.log('Page hidden, stopping call');
        addLog('Page hidden, stopping call', 'warning');
        stopCall();
    }
});

// Handle beforeunload to stop call when leaving page
window.addEventListener('beforeunload', () => {
    if (isCallActive) {
        vapi.stop();
    }
});
