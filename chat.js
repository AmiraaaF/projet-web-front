const API_BASE_URL = "http://projet-web-back.cluster-ig3.igpolytech.fr:3002";

document.addEventListener("DOMContentLoaded", async () => {
    const chatWindow = document.getElementById("chat-window");
    const messageInput = document.getElementById("chat-message-input");
    const sendMessageBtn = document.getElementById("send-chat-message-btn");
    const roomList = document.getElementById("room-list");
    const userList = document.getElementById("user-list");
    const messageContainerChat = document.getElementById("message-container-chat");
    const createRoomForm = document.getElementById("create-room-form");

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
        console.log("currentUser dans appendMessage:", currentUser);
        const div = document.createElement("div");
        div.className = "chat-message";
        div.innerHTML = `
        <strong>${data.username}:</strong> ${data.message}
        ${currentUser?.role === "admin" ? `<button class="delete-message-btn" data-id="${data.id}">🗑️</button>` : ""}
    `;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        if (currentUser?.role === "admin") {
            const deleteBtn = div.querySelector(".delete-message-btn");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", async () => {
                    const confirmed = confirm("Supprimer ce message ?");
                    if (!confirmed) return;

                    try {
                        const res = await fetch(`${API_BASE_URL}/admin/messages/${data.id}`, {
                            method: "DELETE",
                            credentials: "include",
                            mode: "cors"
                        });

                        if (res.ok) {
                            div.remove();
                            displayChatMessage("success", "Message supprimé");
                        } else {
                            const error = await res.json();
                            displayChatMessage("error", error.message || "Erreur suppression");
                        }
                    } catch (err) {
                        console.error("Erreur suppression message :", err);
                        displayChatMessage("error", "Erreur réseau");
                    }
                });
            }
        }
    }

    async function loadChatHistory() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/messages`, {
                credentials: "include"
            });

            const messages = await res.json();
            messages.forEach(msg => {
                appendMessage({
                    id: msg.id,
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
                console.log("currentUser après /profile :", currentUser);
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

        const wsProtocol = location.protocol === "http:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${API_BASE_URL.replace('http://', '' )}/ws`; // pas besoin des params username/userId

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

    if (createRoomForm) {
        createRoomForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const roomNameInput = document.getElementById("new-room-name");
            const roomName = roomNameInput.value.trim();
            if (!roomName) return alert("Le nom du salon ne peut pas être vide !");
            try {
                const res = await fetch(`${API_BASE_URL}/rooms`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: roomName })
                });
                const data = await res.json();
                if (res.ok) {
                    alert("Salon créé !");
                    roomNameInput.value = "";
                    // Recharge la liste des salons ici si besoin
                } else {
                    alert(data.error || "Erreur lors de la création du salon");
                }
            } catch (err) {
                alert("Erreur réseau");
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

function appendRoom(room) {
    const div = document.createElement("div");
    div.className = "chat-room";
    div.innerHTML = `
        <span>${room.name}</span>
        ${currentUser?.role === "admin" ? `<button class="delete-room-btn" data-id="${room.id}">🗑️</button>` : ""}
    `;
    roomsContainer.appendChild(div);

    if (currentUser?.role === "admin") {
        const deleteBtn = div.querySelector(".delete-room-btn");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", async () => {
                const confirmed = confirm("Supprimer ce salon ?");
                if (!confirmed) return;

                try {
                    const res = await fetch(`${API_BASE_URL}/rooms`, {
                        method: "DELETE",
                        credentials: "include",
                        mode: "cors"
                    });

                    if (res.ok) {
                        div.remove();
                        displayChatMessage("success", "Salon supprimé");
                    } else {
                        const error = await res.json();
                        displayChatMessage("error", error.message || "Erreur suppression salon");
                    }
                } catch (err) {
                    console.error("Erreur suppression salon :", err);
                    displayChatMessage("error", "Erreur réseau");
                }
            });
        }
    }
}
