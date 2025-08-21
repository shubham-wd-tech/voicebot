import Vapi from '@vapi-ai/web';

// Your Vapi public key
const VAPI_PUBLIC_KEY = 'da800bab-13a7-4530-b565-9ae068cd2e83';

// Initialize Vapi with error handling
let vapi;
try {
    vapi = new Vapi(VAPI_PUBLIC_KEY);
    console.log('Vapi initialized successfully');
} catch (error) {
    console.error('Failed to initialize Vapi:', error);
    // Create a mock vapi object for testing
    vapi = {
        start: () => Promise.resolve(),
        stop: () => Promise.resolve(),
        on: () => vapi,
        setMuted: () => vapi
    };
    console.log('Using mock Vapi object for testing');
}

// State variables
let isCallActive = false;
let currentCallMode = null;
let callStartTime = null;
let callDurationInterval = null;
let callEndTimer = null;
let isMuted = false;
let messageCountValue = 0;
let userMessageCount = 0;
let botMessageCount = 0;
let totalWordCount = 0;
let responseTimes = [];
let lastMessageTime = null;
let conversationSummary = null;
let conversationSentiment = null;

// Call mode configurations with structured feedback prompts and different Vapi assistant IDs
const CALL_MODES = {
    LEARNING: {
        id: 'learning',
        name: 'Learning & Feedback',
        icon: 'fas fa-graduation-cap',
        color: 'learning-mode',
        purpose: 'Educational and feedback sessions',
        description: 'Perfect for training, feedback sessions, and educational purposes',
        duration: '3',
        vapiAssistantId: 'c036cff9-6a41-4a7d-bcf0-599d186e1b03', // Learning Feedback Assistant ID
        systemPrompt: `You are Cameron, a feedback collection assistant for our Learning Platform. You conduct structured feedback calls with users about their Learning experiences.

IMPORTANT: You must ask ALL 4 questions before ending the call. Do not end the call until all questions are answered.

CONVERSATION FLOW:
1. Introduction: "Hello, this is Cameron from our Learning Platform. We're conducting a survey about your recent learning experience. This will help us improve our services. Would you like to participate?"

2. If yes, ask these questions in order (DO NOT END CALL UNTIL ALL ARE ANSWERED):
   - "On a scale of 1-5, how satisfied are you with the quality of the courses?" (If 1-2 or 5, ask "Could you share what led you to that rating?")
   - "What do you like most about the online learning experience?"
   - "What could we improve to make learning easier or more effective for you?"
   - "How easy is it to navigate and use the app?" (1-5 scale)

3. Only after ALL 4 questions are answered, say: "Thank you for taking the time to share your feedback. Have a wonderful day!"

4. IMPORTANT: After the conversation ends, output ONLY this JSON format:
{
  "summary": [
    "Key point 1",
    "Key point 2", 
    "Key point 3"
  ],
  "sentiment": "Positive|Neutral|Negative"
}`,
        firstMessage: "Hello, this is Cameron from our Learning Platform. We're conducting a survey about your recent learning experience. This will help us improve our services. Would you like to participate?",
        maxDuration: null // No time limit - call continues until all questions are done
    },
    PATIENT: {
        id: 'patient',
        name: 'Patient Care',
        icon: 'fas fa-user-injured',
        color: 'patient-mode',
        purpose: 'Patient interactions and medical consultations',
        description: 'Optimized for patient interactions, medical consultations, and care',
        duration: '2',
        vapiAssistantId: '081cc9ae-0db3-4a4f-9bc1-d0c3fd13bad1', // Patient Feedback Assistant ID
        systemPrompt: `You are Cameron, a feedback collection assistant for our Medical Platform. You conduct structured feedback calls with users about their Medical Consultation experiences.

IMPORTANT: You must ask ALL 4 questions before ending the call. Do not end the call until all questions are answered.

CONVERSATION FLOW:
1. Introduction: "Hello, this is Cameron from our Medical Platform. We're conducting a survey about your recent medical consultation experience. This will help us improve our services. Would you like to participate?"

2. If yes, ask these questions in order (DO NOT END CALL UNTIL ALL ARE ANSWERED):
   - "On a scale of 1-5, how satisfied are you with the medical consultation process in the app?" (If 1-2 or 5, ask "Could you share what led you to that rating?")
   - "Thinking about your last consultation, what went particularly well?"
   - "What aspects of the medical service could be improved?"
   - "How easy is it to navigate and use the app?" (1-5 scale)

3. Only after ALL 4 questions are answered, say: "Thank you for taking the time to share your feedback. Have a wonderful day!"

4. IMPORTANT: After the conversation ends, output ONLY this JSON format:
{
  "summary": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "sentiment": "Positive|Neutral|Negative"
}`,
        firstMessage: "Hello, this is Cameron from our Medical Platform. We're conducting a survey about your recent medical consultation experience. This will help us improve our services. Would you like to participate?",
        maxDuration: null // No time limit - call continues until all questions are done
    }
};

// Initialize the app
function init() {
    console.log('Initializing voice chat bot...');
    
    // Wait a bit to ensure DOM is fully loaded
    setTimeout(() => {
        setupEventListeners();
        setupVapiEvents();
        detectBrowserInfo();
        addLog('System initialized', 'info');
        updateAnalytics();
        console.log('Initialization complete');
    }, 100);
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Get fresh references to DOM elements
    const learningCallBtn = document.getElementById('learningCallBtn');
    const patientCallBtn = document.getElementById('patientCallBtn');
    const learningEndCallBtn = document.getElementById('learningEndCallBtn');
    const patientEndCallBtn = document.getElementById('patientEndCallBtn');
    
    // Setup Learning Call Button
    if (learningCallBtn) {
        console.log('Learning call button found, adding listener');
        learningCallBtn.addEventListener('click', () => {
            console.log('Learning call button clicked!');
            startCall('LEARNING');
        });
    } else {
        console.error('Learning call button not found!');
    }
    
    // Setup Patient Call Button
    if (patientCallBtn) {
        console.log('Patient call button found, adding listener');
        patientCallBtn.addEventListener('click', () => {
            console.log('Patient call button clicked!');
            startCall('PATIENT');
        });
    } else {
        console.error('Patient call button not found!');
    }
    
    // Setup End Call Buttons
    if (learningEndCallBtn) {
        learningEndCallBtn.addEventListener('click', stopCall);
    }
    
    if (patientEndCallBtn) {
        patientEndCallBtn.addEventListener('click', stopCall);
    }
    
    console.log('Event listeners setup complete');
}

// Setup Vapi event listeners
function setupVapiEvents() {
    vapi.on('call-start', () => {
        console.log('Call started');
        addLog(`Call started in ${currentCallMode?.name || 'Unknown'} mode`, 'success');
        updateStatus('In Call');
        updateConnectionStatus('Connected');
        showCallControls();
        startCallTimer();
        
        const firstMessage = currentCallMode?.firstMessage || "Call started! I can hear you now.";
        addMessage('bot', firstMessage);
        lastMessageTime = Date.now();
    });

    vapi.on('call-end', () => {
        console.log('Call ended');
        addLog(`Call ended in ${currentCallMode?.name || 'Unknown'} mode`, 'info');
        updateStatus('Ready');
        updateConnectionStatus('Disconnected');
        
        // Check if we have a summary, if not try to parse from recent messages
        if (!conversationSummary) {
            // Look through recent messages for summary
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                const recentMessages = chatMessages.querySelectorAll('.message.bot-message');
                for (let i = recentMessages.length - 1; i >= 0; i--) {
                    const messageContent = recentMessages[i].textContent;
                    if (messageContent.includes('{') && messageContent.includes('"summary"')) {
                        parseConversationSummary(messageContent);
                        break;
                    }
                }
            }
        }
        
        hideCallControls();
        stopCallTimer();
        addMessage('bot', 'Call ended. Click start call to begin a new conversation.');
        currentCallMode = null;
    });

    vapi.on('speech-start', () => {
        console.log('Assistant started speaking');
        addLog('Assistant started speaking', 'info');
        hideTypingIndicator();
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
        
        if (message.role === 'assistant') {
            showTypingIndicator();
            // Hide typing indicator after a short delay to simulate processing
            setTimeout(() => {
                hideTypingIndicator();
            }, 1000);
        }
        
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

// Start a call with specific mode
async function startCall(mode) {
    try {
        console.log(`Starting call in ${mode} mode...`);
        
        currentCallMode = CALL_MODES[mode];
        if (!currentCallMode) {
            throw new Error(`Invalid call mode: ${mode}`);
        }
        
        // Clear conversation summary for new call
        clearConversationSummary();
        
        addLog(`Starting ${currentCallMode.name} call...`, 'info');
        updateStatus('Starting...');
        updateConnectionStatus('Connecting...');
        
        // Disable both call buttons
        const learningCallBtn = document.getElementById('learningCallBtn');
        const patientCallBtn = document.getElementById('patientCallBtn');
        if (learningCallBtn) learningCallBtn.disabled = true;
        if (patientCallBtn) patientCallBtn.disabled = true;
        
        console.log('Calling vapi.start with assistant ID:', currentCallMode.vapiAssistantId);
        console.log('System prompt:', currentCallMode.systemPrompt);
        
        // Start the call with your specific Vapi assistant ID
        await vapi.start(currentCallMode.vapiAssistantId);
        
        console.log('Vapi.start completed successfully');
        
        isCallActive = true;
        addMessage('bot', `Starting ${currentCallMode.name} call...`);
        
        // Show call controls and start timers
        showCallControls();
        startCallTimer();
        // startCountdownTimer(); // Removed countdown timer
        
        // Add the first message for the selected mode
        setTimeout(() => {
            addMessage('bot', currentCallMode.firstMessage);
        }, 1000);
        
    } catch (error) {
        console.error('Error starting call:', error);
        addLog(`Error starting call: ${error.message}`, 'error');
        updateStatus('Error starting call');
        updateConnectionStatus('Error');
        
        // Re-enable call buttons on error
        const learningCallBtn = document.getElementById('learningCallBtn');
        const patientCallBtn = document.getElementById('patientCallBtn');
        if (learningCallBtn) learningCallBtn.disabled = false;
        if (patientCallBtn) patientCallBtn.disabled = false;
        
        // Show error message to user
        addMessage('bot', `Failed to start call: ${error.message}`);
    }
}

// Stop the call
function stopCall() {
    try {
        addLog(`Ending ${currentCallMode?.name || 'call'}...`, 'info');
        vapi.stop();
        isCallActive = false;
        addMessage('bot', 'Ending call...');
    } catch (error) {
        console.error('Failed to stop call:', error);
        addLog(`Error stopping call: ${error.message}`, 'error');
        addMessage('bot', `Error stopping call: ${error.message}`);
    }
}

// Handle Vapi messages
function handleVapiMessage(message) {
    if (message.role === 'assistant' && message.content) {
        addMessage('bot', message.content);
        lastMessageTime = Date.now();
        
        // Check if this message contains the conversation summary
        if (message.content.includes('{') && message.content.includes('"summary"')) {
            parseConversationSummary(message.content);
        }
    } else if (message.role === 'user' && message.content) {
        // User messages from voice input
        addMessage('user', message.content);
    }
}

// Add a message to the chat
function addMessage(sender, content) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message iphone-message`;
    
    const icon = sender === 'bot' ? 'fas fa-robot' : 'fas fa-user';
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content iphone-style';
    messageContent.innerHTML = `<i class="${icon}"></i><p>${content}</p>`;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time iphone-style';
    timeDiv.textContent = 'Just now';
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(timeDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Update message count
    messageCountValue++;
    if (sender === 'user') {
        userMessageCount++;
    } else {
        botMessageCount++;
    }
    
    // Count words
    const words = content.split(' ').length;
    totalWordCount += words;
    
    updateAnalytics();
}

// Show typing indicator
function showTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'flex';
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

// Update status (simplified)
function updateStatus(status) {
    console.log('Status:', status);
    addLog(`Status: ${status}`, 'info');
}

// Update connection status (simplified)
function updateConnectionStatus(status) {
    console.log('Connection Status:', status);
    addLog(`Connection: ${status}`, 'info');
}

// Show call controls
function showCallControls() {
    // Keep call modes section visible but show end call button
    // Don't hide: document.getElementById('callModes').style.display = 'none';
    
    // Show the appropriate end call button in the call modes section
    if (currentCallMode) {
        const learningEndCallBtn = document.getElementById('learningEndCallBtn');
        const patientEndCallBtn = document.getElementById('patientEndCallBtn');
        const learningCallBtn = document.getElementById('learningCallBtn');
        const patientCallBtn = document.getElementById('patientCallBtn');
        
        if (currentCallMode.id === 'learning') {
            if (learningEndCallBtn) learningEndCallBtn.style.display = 'block';
            if (learningCallBtn) learningCallBtn.style.display = 'none'; // Hide start button
        } else if (currentCallMode.id === 'patient') {
            if (patientEndCallBtn) patientEndCallBtn.style.display = 'block';
            if (patientCallBtn) patientCallBtn.style.display = 'none'; // Hide start button
        }
    }
}

// Hide call controls
function hideCallControls() {
    // Show call mode selection (already visible)
    // document.getElementById('callModes').style.display = 'flex';
    
    // Hide all end call buttons and show start buttons in the call modes section
    const learningEndCallBtn = document.getElementById('learningEndCallBtn');
    const patientEndCallBtn = document.getElementById('patientEndCallBtn');
    const learningCallBtn = document.getElementById('learningCallBtn');
    const patientCallBtn = document.getElementById('patientCallBtn');
    
    if (learningEndCallBtn) learningEndCallBtn.style.display = 'none';
    if (patientEndCallBtn) patientEndCallBtn.style.display = 'none';
    if (learningCallBtn) learningCallBtn.style.display = 'block'; // Show start button
    if (patientCallBtn) patientCallBtn.style.display = 'block'; // Show start button
    
    // Re-enable call buttons
    if (learningCallBtn) learningCallBtn.disabled = false;
    if (patientCallBtn) patientCallBtn.disabled = false;
    
    // Hide summary section
    const summarySection = document.getElementById('summarySection');
    if (summarySection) {
        summarySection.style.display = 'none';
    }
}

// Start call timer
function startCallTimer() {
    callStartTime = Date.now();
    callDurationInterval = setInterval(updateCallDuration, 1000);
    
    // No countdown timer needed - call continues until all questions are done
}

// Update call duration
function updateCallDuration() {
    if (callStartTime) {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        // Note: callDuration element is hidden, but we keep the timer for logging
        console.log(`Call duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
}

// Update volume level (simplified)
function updateVolumeLevel(volume) {
    const volumePercent = Math.round(volume * 100);
    console.log(`Volume: ${volumePercent}%`);
    addLog(`Volume: ${volumePercent}%`, 'info');
}

// Update analytics (simplified)
function updateAnalytics() {
    // Update message count
    const messageCount = document.getElementById('messageCount');
    if (messageCount) {
        messageCount.textContent = `${messageCountValue} messages`;
    }
    
    // Log analytics to console
    console.log('Analytics Updated:', {
        totalMessages: messageCountValue,
        userMessages: userMessageCount,
        botMessages: botMessageCount,
        totalWords: totalWordCount,
        avgResponseTime: responseTimes.length > 0 ? 
            (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) + 's' : '0s'
    });
}

// Detect browser information
function detectBrowserInfo() {
    // Browser detection removed since UI elements are hidden
    // Function kept for potential future use
}

// Add log entry
function addLog(message, type = 'info') {
    // Logging functionality kept but logs panel is hidden
    // Logs are still tracked internally for debugging
    console.log(`[${type.toUpperCase()}] ${message}`);
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

// Parse conversation summary and sentiment from Vapi output
function parseConversationSummary(message) {
    try {
        // Look for JSON pattern in the message
        const jsonMatch = message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const result = JSON.parse(jsonStr);
            
            if (result.summary && result.sentiment) {
                conversationSummary = result.summary;
                conversationSentiment = result.sentiment;
                
                console.log('Parsed conversation summary:', conversationSummary);
                console.log('Parsed sentiment:', conversationSentiment);
                
                // Display the summary in the UI
                displayConversationSummary();
                
                return true;
            }
        }
    } catch (error) {
        console.error('Failed to parse conversation summary:', error);
    }
    return false;
}

// Display conversation summary in the dedicated summary section
function displayConversationSummary() {
    if (!conversationSummary || !conversationSentiment) return;
    
    // Show the summary section
    const summarySection = document.getElementById('summarySection');
    const summaryContent = document.getElementById('summaryContent');
    
    if (summarySection && summaryContent) {
        summaryContent.innerHTML = `
            <div class="summary-header">
                <div class="sentiment-badge ${conversationSentiment.toLowerCase()}">
                    <i class="fas fa-${getSentimentIcon(conversationSentiment)}"></i>
                    ${conversationSentiment}
                </div>
            </div>
            <ul class="summary-points">
                ${conversationSummary.map(point => `<li>${point}</li>`).join('')}
            </ul>
        `;
        
        summarySection.style.display = 'block';
        
        // Scroll to summary
        summarySection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Clear conversation summary
function clearConversationSummary() {
    // Remove any existing summary from the chat
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        const existingSummary = chatMessages.querySelector('.conversation-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
    }
    
    // Reset summary data
    conversationSummary = null;
    conversationSentiment = null;
}

// Get sentiment icon
function getSentimentIcon(sentiment) {
    switch (sentiment.toLowerCase()) {
        case 'positive': return 'smile';
        case 'negative': return 'frown';
        default: return 'meh';
    }
}
