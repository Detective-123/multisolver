const socket = new WebSocket("ws://localhost:8000/ws");

const status = document.getElementById("status");
const input = document.getElementById("messageInput");
const button = document.getElementById("sendButton");
const messages = document.getElementById("messages");


socket.onopen = () => {
    status.textContent = "Connected";
};


button.addEventListener("click", () => {

    const message = input.value;

    if (message.trim() === "") {
        return;
    }

    socket.send(message);

    input.value = "";
});


socket.onmessage = (event) => {

    const message = document.createElement("p");

    message.textContent = event.data;

    messages.appendChild(message);
};


socket.onclose = () => {
    status.textContent = "Disconnected";
};


socket.onerror = (error) => {
    console.error("WebSocket error:", error);
};