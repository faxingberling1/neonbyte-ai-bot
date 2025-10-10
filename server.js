const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gemini AI
let genAI;
let model;
let geminiAvailable = false;

try {
    // For @google/generative-ai version 0.24.1
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // 🔥 CHANGED FROM "gemini-pro" TO "gemini-2.5-flash"
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        geminiAvailable = true;
        console.log('✅ Gemini AI initialized successfully');
        console.log('🚀 Using Gemini 2.5 Flash!');
    } else {
        console.log('⚠️  GEMINI_API_KEY not found in environment variables');
        console.log('💡 Add your API key to .env file: GEMINI_API_KEY=your_key_here');
    }
} catch (error) {
    console.log('❌ Error initializing Gemini AI:', error.message);
}

// Store conversation history
const conversationHistory = new Map();

// Simulated AI responses for fallback
function generateSimulatedResponse(message, history = []) {
    const lowerMessage = message.toLowerCase();
    
    const responses = {
        greeting: [
            "Hello! I'm your AI assistant powered by Google's Gemini. How can I help you today?",
            "Hi there! I'm here to assist you with any questions or tasks you have.",
            "Greetings! I'm ready to help you explore ideas and find solutions."
        ],
        technical: [
            "I can help with technical questions! I'm particularly good with programming, system design, and troubleshooting.",
            "For technical assistance, I can provide code examples, explain concepts, or help debug issues.",
            "Technical challenges are my specialty! What specific technology or problem are you working with?"
        ],
        creative: [
            "I love creative projects! I can help with writing, brainstorming, design ideas, and more.",
            "Creative work is where AI really shines! What kind of creative project are you imagining?",
            "I'm excited to collaborate on creative endeavors! Tell me about your vision or idea."
        ],
        code: [
            "I can help with code in multiple languages. Here's a simple example:\n\n```python\n# Python function example\ndef greet(name):\n    return f\"Hello, {name}!\"\n```\n\nWhat specific coding help do you need?",
            "I'm proficient in many programming languages including Python, JavaScript, Java, and more. What would you like to build?",
            "I can generate, explain, and debug code. What programming language or framework are you using?"
        ],
        default: [
            "That's an interesting question! I'd be happy to explore this topic with you.",
            "I appreciate your curiosity! Let me help you understand this better.",
            "That's a great topic! I can provide information and insights to help you learn more."
        ]
    };

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    } else if (lowerMessage.includes('code') || lowerMessage.includes('programming') || lowerMessage.includes('developer')) {
        return responses.code[Math.floor(Math.random() * responses.code.length)];
    } else if (lowerMessage.includes('technical') || lowerMessage.includes('how to') || lowerMessage.includes('troubleshoot')) {
        return responses.technical[Math.floor(Math.random() * responses.technical.length)];
    } else if (lowerMessage.includes('creative') || lowerMessage.includes('write') || lowerMessage.includes('story') || lowerMessage.includes('design')) {
        return responses.creative[Math.floor(Math.random() * responses.creative.length)];
    } else {
        return responses.default[Math.floor(Math.random() * responses.default.length)];
    }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [], sessionId = 'default' } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required' });
        }

        let aiResponse;
        let usingRealAI = false;

        if (geminiAvailable && process.env.GEMINI_API_KEY) {
            try {
                // Use real Gemini AI
                const chat = model.startChat({
                    history: history.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    })),
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.7,
                    },
                });

                const result = await chat.sendMessage(message);
                const response = await result.response;
                aiResponse = response.text();
                usingRealAI = true;
                
            } catch (geminiError) {
                console.error('Gemini AI Error:', geminiError);
                aiResponse = generateSimulatedResponse(message, history) + "\n\n*(Note: Fell back to simulated response due to API error)*";
            }
        } else {
            // Use simulated responses
            aiResponse = generateSimulatedResponse(message, history);
            if (!geminiAvailable) {
                aiResponse += "\n\n*(Note: Install @google/generative-ai and add GEMINI_API_KEY to .env for real AI responses)*";
            } else if (!process.env.GEMINI_API_KEY) {
                aiResponse += "\n\n*(Note: Add GEMINI_API_KEY to your .env file for real AI responses)*";
            }
        }

        // Update conversation history
        if (!conversationHistory.has(sessionId)) {
            conversationHistory.set(sessionId, []);
        }
        const sessionHistory = conversationHistory.get(sessionId);
        sessionHistory.push({ role: 'user', content: message });
        sessionHistory.push({ role: 'assistant', content: aiResponse });

        // Keep only last 10 messages
        if (sessionHistory.length > 10) {
            conversationHistory.set(sessionId, sessionHistory.slice(-10));
        }

        res.json({ 
            response: aiResponse,
            sessionId: sessionId,
            usingRealAI: usingRealAI,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            response: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment."
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        service: 'NeonByte AI Bot',
        version: '1.0.0',
        geminiAvailable: geminiAvailable,
        hasApiKey: !!process.env.GEMINI_API_KEY,
        usingRealAI: geminiAvailable && !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    };

    res.json(healthStatus);
});

// Get server info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'NeonByte AI Bot',
        version: '1.0.0',
        status: 'running',
        aiProvider: geminiAvailable ? 'Google Gemini AI' : 'Simulated Responses',
        mode: (geminiAvailable && process.env.GEMINI_API_KEY) ? 'Full AI Mode' : 'Demo Mode',
        endpoints: {
            chat: '/api/chat',
            health: '/api/health',
            info: '/api/info'
        }
    });
});

// Clear conversation history
app.delete('/api/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const deleted = conversationHistory.delete(sessionId);
    res.json({ 
        message: 'Conversation history cleared',
        sessionId: sessionId,
        deleted: deleted
    });
});

// Get conversation history
app.get('/api/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const history = conversationHistory.get(sessionId) || [];
    res.json({
        sessionId: sessionId,
        history: history,
        messageCount: history.length
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve chatbot page
app.get('/chatbot', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatbot.html'));
});

// 404 handler for API routes - Fixed for Express 5
app.all('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global Error Handler:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong on our end. Please try again later.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 NeonByte AI Bot Server Started');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🤖 Chatbot: http://localhost:${PORT}/chatbot`);
    console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (geminiAvailable && process.env.GEMINI_API_KEY) {
        console.log('✅ Gemini AI: Connected and Ready');
    } else if (geminiAvailable) {
        console.log('⚠️  Gemini AI: Package installed but no API key found');
        console.log('💡 Add GEMINI_API_KEY=your_key_here to your .env file');
    } else {
        console.log('🔶 Gemini AI: Using simulated responses');
        console.log('💡 Make sure @google/generative-ai is installed correctly');
    }
    
    console.log('📝 Logs: Server is ready to receive requests');
});
