// Get DOM elements
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const chatMessages = document.getElementById("chat-messages");
const newChatBtn = document.getElementById("new-chat-btn");
const clearChatBtn = document.getElementById("clear-chat");
const exportChatBtn = document.getElementById("export-chat");
const suggestQuestionBtn = document.getElementById("suggest-question");
const chatHistory = document.getElementById("chat-history");

// Add message to chat area
function appendMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "AI" ? "bot" : "user");

    const avatarDiv = document.createElement("div");
    avatarDiv.classList.add("message-avatar");
    avatarDiv.textContent = sender === "AI" ? "AI" : "You";

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");
    contentDiv.innerHTML = `${text} <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send chat to backend (Gemini)
async function sendChat(prompt) {
    appendMessage("You", prompt);

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });

        const data = await res.json();
        appendMessage("AI", data.reply);

    } catch (err) {
        console.error("Fetch error:", err);
        appendMessage("AI", "❌ Failed to get response from Gemini.");
    }
}

// Event listeners
sendBtn.addEventListener("click", () => {
    const prompt = chatInput.value.trim();
    if (!prompt) return;
    chatInput.value = "";
    sendChat(prompt);
});

chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// New chat: clears messages and resets
newChatBtn.addEventListener("click", () => {
    chatMessages.innerHTML = "";
    appendMessage("AI", "Hello! I'm your Nexus AI assistant. How can I assist you today?");
});

// Clear chat
clearChatBtn.addEventListener("click", () => {
    chatMessages.innerHTML = "";
});

// Export chat as text file
exportChatBtn.addEventListener("click", () => {
    const messages = Array.from(chatMessages.querySelectorAll(".message")).map(m => {
        const sender = m.querySelector(".message-avatar").textContent;
        const text = m.querySelector(".message-content").childNodes[0].textContent;
        return `${sender}: ${text}`;
    }).join("\n");
    
    const blob = new Blob([messages], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat_history.txt";
    a.click();
    URL.revokeObjectURL(url);
});

// Suggest a question (sample feature)
suggestQuestionBtn.addEventListener("click", () => {
    const suggestions = [
        "What can you do?",
        "Explain AI in simple terms.",
        "How can you help my business?",
        "Tell me a joke.",
        "Translate 'Hello' to Spanish."
    ];
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    chatInput.value = randomSuggestion;
});
