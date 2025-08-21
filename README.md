# Voice Chat Bot

A modern, responsive voice chat bot website powered by Vapi AI. This application allows users to have voice conversations with an AI assistant using their microphone.

## ✨ **Features:**

- 🎯 **Dual Call Modes**: Learning & Feedback + Patient Care
- 🤖 **Vapi AI Integration**: Real-time voice conversations
- 📊 **Call Summary**: Automatic feedback summary with sentiment analysis
- 🎨 **Clean UI**: Minimal, focused interface
- 📱 **Responsive Design**: Works on all devices
- 🔄 **No Time Limits**: Calls continue until all questions are completed

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- A Vapi AI account with a public key
- Microphone access in your browser

## Installation

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your Vapi credentials**
   - Open `script.js`
   - Replace `'da800bab-13a7-4530-b565-9ae068cd2e83'` with your actual Vapi public key
   - The assistant ID `'c036cff9-6a41-4a7d-bcf0-599d186e1b03'` is already configured

## Usage

### Development Mode

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   - The application will automatically open at `http://localhost:3000`
   - Allow microphone access when prompted

3. **Start a conversation**
   - Click the "Start Call" button
   - Speak into your microphone
   - Use the mute button to control your microphone
   - Click "End Call" to finish the conversation

### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Preview the build**
   ```bash
   npm run preview
   ```

3. **Deploy**
   - Copy the `dist` folder to your web server
   - Ensure HTTPS is enabled for microphone access

## Configuration

### Voice Settings

You can customize the voice settings in `script.js`:

```javascript
voice: {
    provider: "11labs",  // Voice provider
    voiceId: "burt",     // Voice ID
}
```

### AI Model Settings

Customize the AI model configuration:

```javascript
model: {
    provider: "openai",
    model: "gpt-3.5-turbo",
    messages: [
        {
            role: "system",
            content: "Your custom system prompt here",
        },
    ],
}
```

## Browser Compatibility

- Chrome 66+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## Troubleshooting

### Microphone Not Working

1. **Check browser permissions**
   - Ensure microphone access is allowed
   - Check browser settings for microphone permissions

2. **HTTPS requirement**
   - Microphone access requires HTTPS in production
   - Use `localhost` for local development

3. **Browser compatibility**
   - Ensure you're using a supported browser
   - Update to the latest version

### Call Not Starting

1. **Check Vapi configuration**
   - Verify your public key is correct
   - Ensure your Vapi account is active

2. **Network issues**
   - Check your internet connection
   - Verify firewall settings

3. **Console errors**
   - Open browser developer tools
   - Check for error messages in the console

## API Reference

### Vapi Events

- `call-start`: Fired when a call begins
- `call-end`: Fired when a call ends
- `speech-start`: Fired when AI starts speaking
- `speech-end`: Fired when AI stops speaking
- `volume-level`: Fired with current volume level
- `message`: Fired when messages are received
- `error`: Fired when errors occur

### Methods

- `vapi.start()`: Start a new call
- `vapi.stop()`: End the current call
- `vapi.setMuted()`: Mute/unmute microphone
- `vapi.send()`: Send text messages

## Customization

### Styling

- Modify `style.css` to change colors, fonts, and layout
- Update the gradient backgrounds in the CSS variables
- Customize button styles and animations

### Functionality

- Add new features in `script.js`
- Implement additional Vapi event handlers
- Extend the message handling system

## Security Notes

- Keep your Vapi private key secure
- Only use the public key in client-side code
- Implement proper authentication for production use
- Consider rate limiting for public deployments

## Support

For issues related to:
- **Vapi AI**: Contact Vapi support
- **Application**: Check the troubleshooting section
- **Browser compatibility**: Verify browser requirements

## License

MIT License - see the LICENSE file for details.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the application.
# voicebot
