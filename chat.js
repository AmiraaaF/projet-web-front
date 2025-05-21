const API_BASE_URL = "http://localhost:3002";

document.addEventListener("DOMContentLoaded", async () => {
    const chatWindow = document.getElementById("chat-window");
    const messageInput = document.getElementById("chat-message-input");
    const sendMessageBtn = document.getElementById("send-chat-message-btn");
    const roomList = document.getElementById("room-list");
    const userList = document.getElementById("user-list");
    const messageContainerChat = document.getElementById("message-container-chat");

    let socket;
    let currentUser = null;
    let currentRoom = "general"; // Default room
    let activeUsers = {}; // roomId: { userId: username }

    function displayChatMessage(type, message, container = messageContainerChat) {
        if (container) {
            container.innerHTML = `<div class="${type === "error" ? "error-message" : "success-message"}">${message}</div>`;
            setTimeout(() => { container.innerHTML = ""; }, 5000);
        }
    }

    function displaySystemMessage(msg, isError = false) {
        const div = document.createElement("div");
        div.className = `system-message ${isError ? 'error' : ''}`;
        div.textContent = msg;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function appendMessage(data) {
        const div = document.createElement("div");
        div.className = "chat-message";
        div.innerHTML = `<strong>${data.username}:</strong> ${data.message}`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    
    async function loadChatHistory() {
        try {
            const res = await fetch("http://localhost:3002/api/messages", {
                credentials: "include"
            });

            const messages = await res.json();
            messages.forEach(msg => {
                appendMessage({
                    username: msg.username,
                    message: msg.content,
                    created_at: msg.created_at
                });
            });
        } catch (error) {
            console.error("Erreur lors du chargement de l'historique :", error);
        }
    }


    function addUserToList(roomId, userId, username) {
        if (!activeUsers[roomId]) activeUsers[roomId] = {};
        activeUsers[roomId][userId] = username;
        updateUserListForRoom(roomId, activeUsers[roomId]);
    }

    function removeUserFromList(roomId, userId) {
        if (activeUsers[roomId]) {
            delete activeUsers[roomId][userId];
            updateUserListForRoom(roomId, activeUsers[roomId]);
        }
    }

    function updateUserListForRoom(roomId, users) {
        userList.innerHTML = "";
        if (!users) return;
        for (const userId in users) {
            const li = document.createElement("li");
            li.textContent = users[userId];
            userList.appendChild(li);
        }
    }

    async function fetchChatUser() {
        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: "GET",
                credentials: "include"
            });
            if (response.ok) {
                currentUser = await response.json();
                await loadChatHistory();
                connectWebSocket();
            } else {
                displayChatMessage("error", "Vous devez être connecté pour utiliser le chat. Redirection...");
                setTimeout(() => { window.location.href = "/login.html"; }, 2000);
            }
        } catch (error) {
            console.error("Erreur récupération utilisateur :", error);
            displayChatMessage("error", "Erreur de connexion. Redirection...");
            setTimeout(() => { window.location.href = "/login.html"; }, 2000);
        }
    }

    function connectWebSocket() {
        if (!currentUser) return;

        const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `ws://localhost:3002/ws`; // pas besoin des params username/userId

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connected.");
            displaySystemMessage("Connecté au chat.");
            joinRoom(currentRoom);
        };

        socket.onmessage = (event) => {
            try {
                const messageData = JSON.parse(event.data);
                console.log("Reçu :", messageData);

                switch (messageData.type) {
                    case "chat_message":
                        if (messageData.room_id === currentRoom) appendMessage(messageData);
                        break;
                    case "user_joined":
                        displaySystemMessage(`${messageData.username} a rejoint le salon.`);
                        addUserToList(messageData.room_id, messageData.user_id, messageData.username);
                        break;
                    case "user_left":
                        displaySystemMessage(`${messageData.username} a quitté le salon.`);
                        removeUserFromList(messageData.room_id, messageData.user_id);
                        break;
                    case "room_user_list":
                        updateUserListForRoom(messageData.room_id, messageData.users);
                        break;
                    case "error":
                        displaySystemMessage(`Erreur : ${messageData.message}`, true);
                        break;
                    default:
                        console.warn("Type inconnu :", messageData.type);
                }
            } catch (err) {
                console.error("Erreur de parsing WS :", err);
            }
        };

        socket.onclose = () => {
            displaySystemMessage("Déconnecté du chat.", true);
        };

        socket.onerror = (e) => {
            console.error("Erreur WebSocket :", e);
            displaySystemMessage("Erreur WebSocket.", true);
        };
    }

    function joinRoom(roomId) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            currentRoom = roomId;
            socket.send(JSON.stringify({
                type: "join_room",
                room_id: roomId,
                user_id: currentUser.id,
                username: currentUser.username
            }));

            // chatWindow.innerHTML = "";
            displaySystemMessage(`Salon rejoint : #${roomId}`);

            document.querySelectorAll("#room-list li").forEach(li => li.classList.remove("active-room"));
            const activeRoom = document.querySelector(`#room-list li[data-room-id="${roomId}"]`);
            if (activeRoom) activeRoom.classList.add("active-room");

            userList.innerHTML = "";
        }
    }

    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || !socket || socket.readyState !== WebSocket.OPEN) return;

        socket.send(JSON.stringify({
            type: "chat_message",
            room_id: currentRoom,
            message,
            username: currentUser.username,
            user_id: currentUser.id
        }));

        messageInput.value = "";
    }

        if (sendMessageBtn) {
            sendMessageBtn.addEventListener("click", sendMessage);
        }

        if (messageInput) {
            messageInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        if (roomList) {
            roomList.addEventListener("click", (e) => {
                if (e.target.tagName === "LI" && e.target.dataset.roomId) {
                    const newRoom = e.target.dataset.roomId;
                    if (newRoom !== currentRoom) {
                        joinRoom(newRoom);
                    }
                }
            });
    }

    // Lancement
    fetchChatUser();

    // GSAP animation (optionnel si utilisé)
    if (typeof gsap !== "undefined") {
        gsap.from(".chat-sidebar", { duration: 0.7, x: -50, opacity: 0, ease: "power2.out", delay: 0.2 });
        gsap.from(".chat-main", { duration: 0.7, x: 50, opacity: 0, ease: "power2.out", delay: 0.3 });
        gsap.from("#chat-input-area", { duration: 0.5, y: 30, opacity: 0, ease: "power2.out", delay: 0.5 });
    }
    

});