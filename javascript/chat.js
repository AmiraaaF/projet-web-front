const API_BASE_URL = "https://projet-web-back.cluster-ig3.igpolytech.fr:3002";

// Quand la page est chargée, on initialise tout le chat
document.addEventListener("DOMContentLoaded", async () => {
    // Récupération des éléments du DOM
    const chatWindow = document.getElementById("chat-window");
    const messageInput = document.getElementById("chat-message-input");
    const sendMessageBtn = document.getElementById("send-chat-message-btn");
    const roomList = document.getElementById("room-list");
    const userList = document.getElementById("user-list");
    const messageContainerChat = document.getElementById("message-container-chat");
    const createRoomForm = document.getElementById("create-room-form");

    let socket;
    let currentUser = null;
    let currentRoom = "general"; // Salon par défaut
    let activeUsers = {}; // Liste des utilisateurs actifs par salon

    // Affiche un message d'erreur ou de succès dans le chat
    function displayChatMessage(type, message, container = messageContainerChat) {
        if (container) {
            container.innerHTML = `<div class="${type === "error" ? "error-message" : "success-message"}">${message}</div>`;
            setTimeout(() => { container.innerHTML = ""; }, 5000);
        }
    }

    // Affiche un message système dans la fenêtre de chat
    function displaySystemMessage(msg, isError = false) {
        const div = document.createElement("div");
        div.className = `system-message ${isError ? 'error' : ''}`;
        div.textContent = msg;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Ajoute un message dans la fenêtre de chat
    function appendMessage(data) {
        const div = document.createElement("div");
        div.className = "chat-message";
        div.innerHTML = `
        <strong>${data.username}:</strong> ${data.message}
        ${currentUser?.role === "admin" ? `<button class="delete-message-btn" data-id="${data.id}">🗑️</button>` : ""}
    `;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Si l'utilisateur est admin, ajoute le bouton de suppression
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

    // Charge l'historique des messages pour un salon donné
    async function loadChatHistory(roomId) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/messages?room_id=${roomId}`, {
                credentials: "include"
            });

            const messages = await res.json();
            chatWindow.innerHTML = ""; // Efface les messages actuels
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

    // Ajoute un utilisateur à la liste des utilisateurs actifs d'un salon
    function addUserToList(roomId, userId, username) {
        if (!activeUsers[roomId]) activeUsers[roomId] = {};
        activeUsers[roomId][userId] = username;
        updateUserListForRoom(roomId, activeUsers[roomId]);
    }

    // Charge la liste des salons depuis l'API et met à jour l'affichage
    async function loadRooms() {
        try {
            const res = await fetch(`${API_BASE_URL}/rooms`, { credentials: "include" });
            const data = await res.json();

            // Vérifie le format de la réponse et extrait le tableau de salons
            let roomsArray = [];
            if (Array.isArray(data)) {
                roomsArray = data;
            } else if (data && typeof data === 'object') {
                for (const key in data) {
                    if (Array.isArray(data[key])) {
                        roomsArray = data[key];
                        break;
                    }
                }
                if (roomsArray.length === 0 && data.name) {
                    roomsArray = [data];
                }
            }

            const roomListEl = document.getElementById("room-list");
            if (!roomListEl) return;

            roomListEl.innerHTML = ""; // Vide la liste actuelle

            // Ajoute le salon général par défaut
            const generalLi = document.createElement("li");
            generalLi.textContent = "# Général";
            generalLi.dataset.roomId = "general";
            if ("general" === currentRoom) {
                generalLi.classList.add("active-room");
            }
            generalLi.addEventListener("click", () => {
                if ("general" !== currentRoom) {
                    joinRoom("general");
                }
            });
            roomListEl.appendChild(generalLi);

            // Ajoute les autres salons récupérés de l'API
            if (roomsArray && roomsArray.length > 0) {
                roomsArray.forEach(room => {
                    const roomName = Array.isArray(room) ? room[1] : room.name;
                    if (roomName === "general") return;

                    const li = document.createElement("li");
                    li.textContent = `# ${roomName}`;
                    li.dataset.roomId = roomName;

                    if (roomName === currentRoom) {
                        li.classList.add("active-room");
                    }

                    li.addEventListener("click", () => {
                        if (roomName !== currentRoom) {
                            joinRoom(roomName);
                        }
                    });

                    roomListEl.appendChild(li);
                });
            }

            if (roomsArray.length === 0) {
                console.log("Aucun salon personnalisé n'a été trouvé. Le salon Général est affiché par défaut.");
            }
        } catch (err) {
            console.error("Erreur lors du chargement des salons :", err);

            // En cas d'erreur, affiche au moins le salon général
            const roomListEl = document.getElementById("room-list");
            if (roomListEl && roomListEl.children.length === 0) {
                const generalLi = document.createElement("li");
                generalLi.textContent = "# Général";
                generalLi.dataset.roomId = "general";
                if ("general" === currentRoom) {
                    generalLi.classList.add("active-room");
                }
                generalLi.addEventListener("click", () => {
                    if ("general" !== currentRoom) {
                        joinRoom("general");
                    }
                });
                roomListEl.appendChild(generalLi);
            }
        }
    }

    // Retire un utilisateur de la liste des utilisateurs actifs d'un salon
    function removeUserFromList(roomId, userId) {
        if (activeUsers[roomId]) {
            delete activeUsers[roomId][userId];
            updateUserListForRoom(roomId, activeUsers[roomId]);
        }
    }

    // Met à jour l'affichage de la liste des utilisateurs pour un salon donné
    function updateUserListForRoom(roomId, users) {
        userList.innerHTML = "";
        if (!users) return;
        for (const userId in users) {
            const li = document.createElement("li");
            li.textContent = users[userId];
            userList.appendChild(li);
        }
    }

    // Récupère les infos de l'utilisateur connecté et initialise le chat
    async function fetchChatUser() {
        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: "GET",
                credentials: "include"
            });
            if (response.ok) {
                currentUser = await response.json();
                await loadRooms();
                await loadChatHistory(currentRoom); // Charge l'historique du salon actuel
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

    // Ouvre une connexion WebSocket pour le chat en temps réel
    function connectWebSocket() {
        if (!currentUser) return;

        // Construction correcte de l'URL WebSocket
        // Remplacez le port si besoin (ici 3002)
        const wsUrl = "wss://projet-web-back.cluster-ig3.igpolytech.fr:3002/ws";

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            displaySystemMessage("Connecté au chat.");
            joinRoom(currentRoom);
        };

        // Gère la réception des messages WebSocket
        socket.onmessage = (event) => {
            try {
                const messageData = JSON.parse(event.data);
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

    // Permet de rejoindre un salon (room)
    function joinRoom(roomId) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            currentRoom = roomId;
            socket.send(JSON.stringify({
                type: "join_room",
                room_id: roomId,
                user_id: currentUser.id,
                username: currentUser.username
            }));

            displaySystemMessage(`Salon rejoint : #${roomId}`);

            document.querySelectorAll("#room-list li").forEach(li => li.classList.remove("active-room"));
            const activeRoom = document.querySelector(`#room-list li[data-room-id="${roomId}"]`);
            if (activeRoom) activeRoom.classList.add("active-room");

            userList.innerHTML = "";

            // Charge l'historique des messages pour le nouveau salon
            loadChatHistory(roomId);
        }
    }

    // Envoie un message dans le salon courant via WebSocket
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

    // Gestion des événements d'envoi de message
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

    // Gestion du clic sur la liste des salons
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

    // Gestion de la création d'un nouveau salon
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

                    // Ajoute le salon à la liste
                    const roomListEl = document.getElementById("room-list");
                    if (roomListEl) {
                        const newRoomLi = document.createElement("li");
                        newRoomLi.textContent = `# ${roomName}`;
                        newRoomLi.dataset.roomId = roomName;

                        newRoomLi.addEventListener("click", () => {
                            if (roomName !== currentRoom) {
                                joinRoom(roomName);
                            }
                        });

                        roomListEl.appendChild(newRoomLi);
                    }

                    // Recharge la liste des salons depuis l'API
                    try {
                        await loadRooms();
                    } catch (loadErr) {
                        console.error("Erreur lors du rechargement des salons:", loadErr);
                    }
                } else {
                    alert(data.error || "Erreur lors de la création du salon");
                }
            } catch (err) {
                console.error("Erreur lors de la création du salon:", err);
                alert("Erreur réseau");
            }
        });
    }

    // Lancement de la récupération de l'utilisateur et de l'initialisation du chat
    fetchChatUser();

    // Animation GSAP (optionnel)
    if (typeof gsap !== "undefined") {
        gsap.from(".chat-sidebar", { duration: 0.7, x: -50, opacity: 0, ease: "power2.out", delay: 0.2 });
        gsap.from(".chat-main", { duration: 0.7, x: 50, opacity: 0, ease: "power2.out", delay: 0.3 });
        gsap.from("#chat-input-area", { duration: 0.5, y: 30, opacity: 0, ease: "power2.out", delay: 0.5 });
    }
});

// Fonction utilitaire pour afficher un salon dans la liste (utilisée pour l'admin)
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
