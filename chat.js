
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
    let currentRoomId = 1; // ID numérique du salon par défaut (à adapter selon votre base)
    let currentRoomName = "general"; // Nom du salon pour l'affichage
    let activeUsers = {}; // roomId: { userId: username }
    let roomsMap = {}; // Stocke la correspondance entre les noms de salons et leurs IDs

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
        console.log("Ajout message:", data);
        const div = document.createElement("div");
        div.className = "chat-message";
        div.innerHTML = `
        <strong>${data.username}:</strong> ${data.message || data.content}
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

    async function loadChatHistory(roomId) {
        try {
            console.log(`Chargement de l'historique pour le salon ID: ${roomId}`);
            const res = await fetch(`${API_BASE_URL}/api/messages?room_id=${roomId}`, {
                credentials: "include"
            });

            const messages = await res.json();
            console.log(`${messages.length} messages récupérés pour le salon ID ${roomId}:`, messages);
            
            chatWindow.innerHTML = ""; // Efface les messages actuels
            
            if (messages.length === 0) {
                displaySystemMessage(`Aucun message dans ce salon. Soyez le premier à écrire !`);
            } else {
                messages.forEach(msg => {
                    appendMessage({
                        id: msg.id,
                        username: msg.username,
                        content: msg.content,
                        created_at: msg.created_at
                    });
                });
            }
        } catch (error) {
            console.error(`Erreur lors du chargement de l'historique pour le salon ID ${roomId}:`, error);
            displaySystemMessage("Erreur lors du chargement des messages", true);
        }
    }

    function addUserToList(roomId, userId, username) {
        if (!activeUsers[roomId]) activeUsers[roomId] = {};
        activeUsers[roomId][userId] = username;
        updateUserListForRoom(roomId, activeUsers[roomId]);
    }

    async function loadRooms() {
        try {
            const res = await fetch(`${API_BASE_URL}/rooms`, { credentials: "include" });
            const data = await res.json();
            console.log("Données brutes des salons:", data);

            // Réinitialiser la carte des salons
            roomsMap = {};
            
            // Extraire les salons de la réponse
            let roomsArray = [];
            if (Array.isArray(data)) {
                roomsArray = data;
            } else if (data && typeof data === 'object' && data.rooms) {
                roomsArray = data.rooms;
            }

            console.log("Salons extraits:", roomsArray);

            // Vider la liste des salons
            const roomListEl = document.getElementById("room-list");
            if (!roomListEl) return;
            roomListEl.innerHTML = "";

            // Ajouter chaque salon à la liste et à la carte
            if (roomsArray && roomsArray.length > 0) {
                roomsArray.forEach(room => {
                    // Extraire l'ID et le nom du salon selon le format de la réponse
                    let roomId, roomName;
                    
                    if (Array.isArray(room)) {
                        // Format [id, name, ...]
                        roomId = room[0];
                        roomName = room[1];
                    } else {
                        // Format {id: ..., name: ...}
                        roomId = room.id;
                        roomName = room.name;
                    }
                    
                    // Stocker la correspondance nom -> id
                    roomsMap[roomName] = roomId;
                    
                    // Créer l'élément de liste pour ce salon
                    const li = document.createElement("li");
                    li.textContent = `# ${roomName}`;
                    li.dataset.roomId = roomId; // Stocker l'ID numérique
                    li.dataset.roomName = roomName; // Stocker le nom pour l'affichage
                    
                    if (roomId === currentRoomId) {
                        li.classList.add("active-room");
                    }
                    
                    li.addEventListener("click", () => {
                        if (roomId !== currentRoomId) {
                            joinRoom(roomId, roomName);
                        }
                    });
                    
                    roomListEl.appendChild(li);
                });
                
                // Si le salon actuel n'est pas dans la liste, sélectionner le premier salon
                if (!roomsMap[currentRoomName] && roomsArray.length > 0) {
                    const firstRoom = roomsArray[0];
                    const firstRoomId = Array.isArray(firstRoom) ? firstRoom[0] : firstRoom.id;
                    const firstRoomName = Array.isArray(firstRoom) ? firstRoom[1] : firstRoom.name;
                    
                    currentRoomId = firstRoomId;
                    currentRoomName = firstRoomName;
                }
            } else {
                console.log("Aucun salon trouvé, création d'un salon par défaut");
                displaySystemMessage("Aucun salon disponible. Créez-en un !", true);
            }
            
            console.log("Carte des salons:", roomsMap);
        } catch (err) {
            console.error("Erreur lors du chargement des salons:", err);
            displaySystemMessage("Erreur lors du chargement des salons", true);
        }
    }

    function removeUserFromList(roomId, userId) {
        if (activeUsers[roomId]) {
            delete activeUsers[roomId][userId];
            updateUserListForRoom(roomId, activeUsers[roomId]);
        }
    }

    function updateUserListForRoom(roomId, users) {
        userList.innerHTML = "";
        if (!users || Object.keys(users).length === 0) {
            const li = document.createElement("li");
            li.className = "no-users";
            li.textContent = "Aucun utilisateur connecté";
            userList.appendChild(li);
            return;
        }
        
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
                console.log("Utilisateur connecté:", currentUser);
                
                // Charger les salons d'abord
                await loadRooms();
                
                // Puis charger l'historique du salon actuel
                await loadChatHistory(currentRoomId);
                
                // Enfin, se connecter au WebSocket
                connectWebSocket();
            } else {
                displayChatMessage("error", "Vous devez être connecté pour utiliser le chat. Redirection...");
                setTimeout(() => { window.location.href = "/login.html"; }, 2000);
            }
        } catch (error) {
            console.error("Erreur récupération utilisateur:", error);
            displayChatMessage("error", "Erreur de connexion. Redirection...");
            setTimeout(() => { window.location.href = "/login.html"; }, 2000);
        }
    }

    function connectWebSocket() {
        if (!currentUser) return;

        const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${API_BASE_URL.replace('http://', '')}/ws`;

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connecté");
            displaySystemMessage("Connecté au chat");
            joinRoom(currentRoomId, currentRoomName);
        };

        socket.onmessage = (event) => {
            try {
                const messageData = JSON.parse(event.data);
                console.log("Message WebSocket reçu:", messageData);

                switch (messageData.type) {
                    case "chat_message":
                        // Vérifier si le message appartient au salon actuel
                        if (messageData.room_id == currentRoomId) {
                            appendMessage(messageData);
                        }
                        break;
                    case "user_joined":
                        if (messageData.room_id == currentRoomId) {
                            displaySystemMessage(`${messageData.username} a rejoint le salon`);
                            addUserToList(messageData.room_id, messageData.user_id, messageData.username);
                        }
                        break;
                    case "user_left":
                        if (messageData.room_id == currentRoomId) {
                            displaySystemMessage(`${messageData.username} a quitté le salon`);
                            removeUserFromList(messageData.room_id, messageData.user_id);
                        }
                        break;
                    case "room_user_list":
                        if (messageData.room_id == currentRoomId) {
                            updateUserListForRoom(messageData.room_id, messageData.users);
                        }
                        break;
                    case "error":
                        displaySystemMessage(`Erreur: ${messageData.message}`, true);
                        break;
                    default:
                        console.warn("Type de message inconnu:", messageData.type);
                }
            } catch (err) {
                console.error("Erreur de parsing WebSocket:", err);
            }
        };

        socket.onclose = () => {
            displaySystemMessage("Déconnecté du chat", true);
        };

        socket.onerror = (e) => {
            console.error("Erreur WebSocket:", e);
            displaySystemMessage("Erreur de connexion au chat", true);
        };
    }

    function joinRoom(roomId, roomName) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            // Mettre à jour les variables de salon actuel
            currentRoomId = roomId;
            currentRoomName = roomName;
            
            console.log(`Rejoindre le salon: ID=${roomId}, Nom=${roomName}`);
            
            // Envoyer la demande de rejoindre le salon au serveur
            socket.send(JSON.stringify({
                type: "join_room",
                room_id: roomId,
                user_id: currentUser.id,
                username: currentUser.username
            }));

            // Mettre à jour l'interface
            displaySystemMessage(`Salon rejoint: #${roomName}`);
            
            // Mettre à jour la classe active dans la liste des salons
            document.querySelectorAll("#room-list li").forEach(li => li.classList.remove("active-room"));
            const activeRoom = document.querySelector(`#room-list li[data-room-id="${roomId}"]`);
            if (activeRoom) activeRoom.classList.add("active-room");
            
            // Vider la liste des utilisateurs
            userList.innerHTML = "";
            
            // Charger l'historique des messages pour ce salon
            loadChatHistory(roomId);
        }
    }

    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || !socket || socket.readyState !== WebSocket.OPEN) return;

        console.log(`Envoi d'un message au salon ID=${currentRoomId}, Nom=${currentRoomName}`);
        
        // Envoyer le message au serveur WebSocket
        socket.send(JSON.stringify({
            type: "chat_message",
            room_id: currentRoomId,
            message,
            username: currentUser.username,
            user_id: currentUser.id
        }));

        // Vider le champ de saisie
        messageInput.value = "";
    }

    // Gestionnaires d'événements
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

    if (createRoomForm) {
        createRoomForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const roomNameInput = document.getElementById("new-room-name");
            const roomName = roomNameInput.value.trim();
            
            if (!roomName) {
                alert("Le nom du salon ne peut pas être vide !");
                return;
            }
            
            try {
                console.log("Création d'un nouveau salon:", roomName);
                
                const res = await fetch(`${API_BASE_URL}/rooms`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: roomName })
                });

                console.log("Réponse de création:", res.status);
                const data = await res.json();
                
                if (res.ok) {
                    alert("Salon créé avec succès !");
                    roomNameInput.value = "";
                    
                    // Recharger la liste des salons pour obtenir l'ID du nouveau salon
                    await loadRooms();
                    
                    // Si le nouveau salon est dans la carte, le rejoindre
                    if (roomsMap[roomName]) {
                        joinRoom(roomsMap[roomName], roomName);
                    }
                } else {
                    alert(data.error || "Erreur lors de la création du salon");
                }
            } catch (err) {
                console.error("Erreur lors de la création du salon:", err);
                alert("Erreur réseau lors de la création du salon");
            }
        });
    }

    // Initialisation
    fetchChatUser();

    // Animations GSAP (si disponible)
    if (typeof gsap !== "undefined") {
        gsap.from(".chat-sidebar", { duration: 0.7, x: -50, opacity: 0, ease: "power2.out", delay: 0.2 });
        gsap.from(".chat-main", { duration: 0.7, x: 50, opacity: 0, ease: "power2.out", delay: 0.3 });
        gsap.from("#chat-input-area", { duration: 0.5, y: 30, opacity: 0, ease: "power2.out", delay: 0.5 });
    }
});
