const API_BASE_URL = "https://projet-web-back.cluster-ig3.igpolytech.fr:3002";

// Quand la page est chargée, on prépare la gestion du profil utilisateur
document.addEventListener("DOMContentLoaded", async () => {
    // Récupération des éléments du DOM pour afficher et éditer le profil
    const profileUsername = document.getElementById("profile-username");
    // const profileEmail = document.getElementById("profile-email"); // Email non géré actuellement
    const profileRole = document.getElementById("profile-role");
    const profileFullName = document.getElementById("profile-full-name");
    const profileBio = document.getElementById("profile-bio");
    const profileCreatedAt = document.getElementById("profile-created-at");
    // const profileLastLogin = document.getElementById("profile-last-login"); // Non géré
    const profileAvatarImg = document.getElementById("profile-avatar-img");

    // Boutons et formulaires pour l'édition du profil
    const editProfileBtn = document.getElementById("edit-profile-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const profileViewDiv = document.querySelector(".profile-view");
    const profileEditDiv = document.querySelector(".profile-edit");
    const editProfileForm = document.getElementById("edit-profile-form");
    const saveProfileButton = document.getElementById("save-profile-button");

    // Champs du formulaire d'édition
    const editFullNameInput = document.getElementById("edit-full-name");
    const editAvatarUrlInput = document.getElementById("edit-avatar-url");
    const editBioInput = document.getElementById("edit-bio");

    let currentUserData = null; // Stocke les données utilisateur courantes

    // Fonction pour charger les données du profil depuis l'API
    async function fetchProfileData() {
        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                credentials: "include",
                mode: "cors"
            });

            if (response.ok) {
                const data = await response.json();
                currentUserData = data;
                displayProfileData(data); // Affiche les données dans la vue
            } else if (response.status === 401) {
                // Si l'utilisateur n'est pas connecté, affiche un message et redirige
                window.displayMessage("error", "Session expirée ou non authentifié. Redirection vers la page de connexion...", "message-container-profile");
                setTimeout(() => { window.location.href = "/login.html"; }, 3000);
            } else {
                // Gestion des autres erreurs (ex: profil non trouvé)
                let errorText = "Impossible de charger le profil.";
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || errorData.message || errorText;
                } catch (e) {
                    errorText = await response.text() || errorText;
                }
                window.displayMessage("error", errorText, "message-container-profile");
            }
        } catch (error) {
            // Gestion des erreurs réseau
            console.error("Error fetching profile:", error);
            window.displayMessage("error", "Une erreur réseau est survenue lors du chargement du profil.", "message-container-profile");
        }
    }

    // Affiche les données du profil dans la vue et pré-remplit le formulaire d'édition
    function displayProfileData(data) {
        if (!data) return;
        if (profileUsername) profileUsername.textContent = data.username || "N/A";
        // if (profileEmail) profileEmail.textContent = data.email || "N/A";
        if (profileRole) profileRole.textContent = data.role || "N/A";
        if (profileFullName) profileFullName.textContent = data.full_name || "Non défini";
        if (profileBio) profileBio.textContent = data.bio || "Pas de biographie.";
        if (profileCreatedAt) profileCreatedAt.textContent = data.created_at ? new Date(data.created_at).toLocaleDateString() : "N/A";
        // if (profileLastLogin) profileLastLogin.textContent = data.last_login_at ? new Date(data.last_login_at).toLocaleString() : "Jamais";
        if (profileAvatarImg) profileAvatarImg.src = data.avatar_url || "/assets/images/default-avatar.png";
    
        // Pré-remplit les champs du formulaire d'édition
        if (editFullNameInput) editFullNameInput.value = data.full_name || "";
        if (editAvatarUrlInput) editAvatarUrlInput.value = data.avatar_url || "";
        if (editBioInput) editBioInput.value = data.bio || "";
    }

    // Affiche le formulaire d'édition quand on clique sur "Modifier"
    if (editProfileBtn && profileViewDiv && profileEditDiv) {
        editProfileBtn.addEventListener("click", () => {
            profileViewDiv.classList.add("hidden");
            profileEditDiv.classList.remove("hidden");
            if(currentUserData) displayProfileData(currentUserData); // Remplit le formulaire avec les données actuelles
        });
    }

    // Annule l'édition et revient à la vue profil
    if (cancelEditBtn && profileViewDiv && profileEditDiv) {
        cancelEditBtn.addEventListener("click", () => {
            profileEditDiv.classList.add("hidden");
            profileViewDiv.classList.remove("hidden");
        });
    }

    // Gère la soumission du formulaire d'édition du profil
    if (editProfileForm && saveProfileButton) {
        editProfileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            saveProfileButton.disabled = true;
            saveProfileButton.textContent = "Sauvegarde...";

            // Récupère les valeurs modifiées
            const updatedData = {
                full_name: editFullNameInput ? editFullNameInput.value.trim() : undefined,
                avatar_url: editAvatarUrlInput ? editAvatarUrlInput.value.trim() : undefined,
                bio: editBioInput ? editBioInput.value.trim() : undefined,
            };
            // Filtre les champs non modifiés ou vides
            const finalUpdatedData = Object.fromEntries(Object.entries(updatedData).filter(([_, v]) => v !== undefined && v !== ""));

            if (Object.keys(finalUpdatedData).length === 0) {
                window.displayMessage("info", "Aucune modification détectée.", "message-container-profile");
                saveProfileButton.disabled = false;
                saveProfileButton.textContent = "Enregistrer";
                profileEditDiv.classList.add("hidden");
                profileViewDiv.classList.remove("hidden");
                return;
            }

            try {
                // Envoie la requête PUT pour mettre à jour le profil
                const response = await fetch(`${API_BASE_URL}/profile`, {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(finalUpdatedData),
                });

                let resultText = await response.text();
                let result = null;
                try {
                    result = JSON.parse(resultText);
                } catch (jsonError) {
                    // Si ce n'est pas du JSON, on garde le texte brut
                    console.warn("La réponse du serveur PUT /profile n'est pas du JSON valide:", resultText);
                }

                if (response.ok && result) {
                    window.displayMessage("success", result.message || "Profil mis à jour avec succès !", "message-container-profile");
                    currentUserData = result.user || result; // Met à jour les données locales
                    displayProfileData(currentUserData);
                    profileEditDiv.classList.add("hidden");
                    profileViewDiv.classList.remove("hidden");
                } else {
                    let errorMessage = (result && (result.error || result.message)) || resultText || "Erreur lors de la mise à jour.";
                    window.displayMessage("error", errorMessage, "message-container-profile");
                }
            } catch (error) {
                console.error("Error updating profile:", error);
                window.displayMessage("error", "Une erreur réseau est survenue lors de la mise à jour du profil.", "message-container-profile");
            } finally {
                saveProfileButton.disabled = false;
                saveProfileButton.textContent = "Enregistrer";
            }
        });
    }

    // Charge le profil au chargement de la page
    fetchProfileData();
});

// Fonction utilitaire globale pour afficher des messages de succès/erreur/info
if (typeof window.displayMessage !== 'function') {
    window.displayMessage = function(type, message, containerId) {
        const container = document.getElementById(containerId);
        const fallbackContainerId = "message-container-main"; // Un ID de secours global
        const finalContainer = container || document.getElementById(fallbackContainerId);

        if (finalContainer) {
            finalContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
            setTimeout(() => { finalContainer.innerHTML = ""; }, 5000);
        } else {
            alert(`${type.toUpperCase()}: ${message}`); // Fallback si aucun conteneur n'existe
        }
    };
}

