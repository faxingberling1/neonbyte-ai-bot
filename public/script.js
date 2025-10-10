const chatForm = document.getElementById("chat-form");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = userInput.value.trim();
  if (!prompt) return;

  appendMessage(prompt, "user");
  userInput.value = "";

  appendMessage("Thinking...", "bot");

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    const botMessage = data.reply || "⚠️ No response from AI.";
    updateLastBotMessage(botMessage);
  } catch (error) {
    updateLastBotMessage("❌ Error connecting to AI server.");
  }
});

function appendMessage(message, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender);
  msgDiv.textContent = message;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updateLastBotMessage(newText) {
  const botMessages = document.querySelectorAll(".message.bot");
  const lastBotMessage = botMessages[botMessages.length - 1];
  if (lastBotMessage) lastBotMessage.textContent = newText;
}
