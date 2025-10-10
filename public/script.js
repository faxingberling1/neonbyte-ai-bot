// Chatbot functionality with Gemini AI integration
class Chatbot {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.clearChatBtn = document.getElementById('clear-chat');
        this.suggestQuestionBtn = document.getElementById('suggest-question');
        this.headerStatus = document.getElementById('header-status');
        
        this.conversationHistory = [];
        this.isConnected = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.testConnection();
        this.updateInitialTime();
    }
    
    setupEventListeners() {
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key (without Shift)
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.sendBtn.disabled = this.chatInput.value.trim() === '';
        });
        
        // New chat button
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        
        // Clear chat button
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        
        // Suggest question button
        this.suggestQuestionBtn.addEventListener('click', () => this.suggestQuestion());
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        this.conversationHistory.push({ role: 'user', content: message });
        
        // Clear input and disable send button
        this.clearInput();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Call Gemini AI API via backend
            const response = await this.callGeminiAPI(message);
            this.removeTypingIndicator();
            this.addMessage(response, 'bot');
            this.conversationHistory.push({ role: 'assistant', content: response });
            this.updateStatus('connected');
        } catch (error) {
            this.removeTypingIndicator();
            console.error('API Error:', error);
            this.handleError(error);
        }
    }
    
    async callGeminiAPI(message) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: this.conversationHistory
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        
        const data = await response.json();
        return data.response;
    }
    
    async testConnection() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                this.updateStatus('connected');
                this.isConnected = true;
            } else {
                this.updateStatus('error');
                this.isConnected = false;
            }
        } catch (error) {
            this.updateStatus('error');
            this.isConnected = false;
        }
    }
    
    addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Format code blocks if present
        const formattedText = this.formatCodeBlocks(text);
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                ${sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-gem"></i>'}
            </div>
            <div class="message-content">
                ${formattedText.replace(/\n/g, '<br>')}
                <div class="message-time">${time}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    formatCodeBlocks(text) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        return text.replace(codeBlockRegex, '<div class="code-block"><div class="code-header">$1</div><pre><code>$2</code></pre></div>');
    }
    
    showTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.classList.add('message', 'bot');
        typingElement.id = 'typing-indicator';
        typingElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-gem"></i>
            </div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingElement);
        this.scrollToBottom();
    }
    
    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    clearInput() {
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
        this.sendBtn.disabled = true;
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    updateStatus(status) {
        if (status === 'connected') {
            this.headerStatus.style.background = '#4CAF50';
        } else if (status === 'error') {
            this.headerStatus.style.background = '#f44336';
        } else {
            this.headerStatus.style.background = '#ff9800';
        }
    }
    
    handleError(error) {
        let errorMessage = "I apologize, but I encountered an error while processing your request. Please try again in a moment.";
        
        if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            errorMessage = "I apologize, but I'm having trouble connecting to the Gemini AI service. Please check your internet connection and try again.";
            this.updateStatus('error');
        } else if (error.message.includes('API_KEY_INVALID')) {
            errorMessage = "The Gemini AI API key is invalid. Please check your server configuration.";
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            errorMessage = "The API quota has been exceeded. Please try again later.";
        } else if (error.message.includes('SAFETY')) {
            errorMessage = "The message was blocked for safety reasons. Please rephrase your question.";
        }
        
        this.addMessage(errorMessage, 'bot');
    }
    
    startNewChat() {
        if (this.chatMessages.children.length > 1) {
            if (confirm('Start a new chat? Your current conversation will be cleared.')) {
                this.chatMessages.innerHTML = `
                    <div class="message bot">
                        <div class="message-avatar">
                            <i class="fas fa-gem"></i>
                        </div>
                        <div class="message-content">
                            Hello! I'm your Gemini AI assistant, powered by Google's most advanced language model. I can help you with creative writing, technical questions, code assistance, research, and much more. What would you like to explore today?
                            <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                `;
                this.clearInput();
                this.conversationHistory = [];
                this.updateStatus('connected');
            }
        }
    }
    
    clearChat() {
        if (confirm('Clear the current chat? This action cannot be undone.')) {
            this.chatMessages.innerHTML = `
                <div class="message bot">
                    <div class="message-avatar">
                        <i class="fas fa-gem"></i>
                    </div>
                    <div class="message-content">
                        Hello! I'm your Gemini AI assistant. How can I help you today?
                        <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>
            `;
            this.conversationHistory = [];
        }
    }
    
    suggestQuestion() {
        const questions = [
            "Can you explain how machine learning algorithms work?",
            "Write a short poem about artificial intelligence",
            "How can I optimize my website for better performance?",
            "Explain quantum computing in simple terms",
            "Create a Python script to analyze a dataset",
            "What are the benefits of using AI in healthcare?",
            "How does natural language processing work?",
            "Can you help me plan a software development project?"
        ];
        
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        this.chatInput.value = randomQuestion;
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
        this.sendBtn.disabled = false;
        this.chatInput.focus();
    }
    
    updateInitialTime() {
        document.getElementById('initial-time').textContent = 
            new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Chatbot();
});
