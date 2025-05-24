const API_BASE_URL = "http://projet-web-back.cluster-ig3.igpolytech.fr:3002";

document.addEventListener("DOMContentLoaded", async () => {
    const profileUsername = document.getElementById("profile-username");
    // const profileEmail = document.getElementById("profile-email"); // Email non géré actuellement par le backend fourni
    const profileRole = document.getElementById("profile-role");
    const profileFullName = document.getElementById("profile-full-name");
    const profileBio = document.getElementById("profile-bio");
    const profileCreatedAt = document.getElementById("profile-created-at");
    // const profileLastLogin = document.getElementById("profile-last-login"); // Non géré
    const profileAvatarImg = document.getElementById("profile-avatar-img");

    const editProfileBtn = document.getElementById("edit-profile-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const profileViewDiv = document.querySelector(".profile-view");
    const profileEditDiv = document.querySelector(".profile-edit");
    const editProfileForm = document.getElementById("edit-profile-form");
    const saveProfileButton = document.getElementById("save-profile-button");

    // Form fields
    const editFullNameInput = document.getElementById("edit-full-name");
    const editAvatarUrlInput = document.getElementById("edit-avatar-url");
    const editBioInput = document.getElementById("edit-bio");

    let currentUserData = null;

    async function fetchProfileData() {
        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                credentials: "include",
                mode: "cors"
            });

            if (response.ok) {
                const data = await response.json();
                currentUserData = data;
                displayProfileData(data);
            } else if (response.status === 401) {
                window.displayMessage("error", "Session expirée ou non authentifié. Redirection vers la page de connexion...", "message-container-profile");
                setTimeout(() => { window.location.href = "/login.html"; }, 3000);
            } else {
                let errorText = "Impossible de charger le profil.";
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || errorData.message || errorText;
                } catch (e) {
                    // La réponse n'était pas du JSON
                    errorText = await response.text() || errorText;
                }
                window.displayMessage("error", errorText, "message-container-profile");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            window.displayMessage("error", "Une erreur réseau est survenue lors du chargement du profil.", "message-container-profile");
        }
    }

    function displayProfileData(data) {
        if (!data) return;
        if (profileUsername) profileUsername.textContent = data.username || "N/A";
        // if (profileEmail) profileEmail.textContent = data.email || "N/A";
        if (profileRole) profileRole.textContent = data.role || "N/A";
        if (profileFullName) profileFullName.textContent = data.full_name || "Non défini";
        if (profileBio) profileBio.textContent = data.bio || "Pas de biographie.";
        if (profileCreatedAt) profileCreatedAt.textContent = data.created_at ? new Date(data.created_at).toLocaleDateString() : "N/A";
        // if (profileLastLogin) profileLastLogin.textContent = data.last_login_at ? new Date(data.last_login_at).toLocaleString() : "Jamais";
        if (profileAvatarImg) profileAvatarImg.src = data.avatar_url || "/assets/images/default-avatar.png"; // Assurez-vous que ce chemin par défaut est correct
    
        // Populate edit form fields
        if (editFullNameInput) editFullNameInput.value = data.full_name || "";
        if (editAvatarUrlInput) editAvatarUrlInput.value = data.avatar_url || "";
        if (editBioInput) editBioInput.value = data.bio || "";
    }

    if (editProfileBtn && profileViewDiv && profileEditDiv) {
        editProfileBtn.addEventListener("click", () => {
            profileViewDiv.classList.add("hidden");
            profileEditDiv.classList.remove("hidden");
            if(currentUserData) displayProfileData(currentUserData); // Re-populate form with current data
        });
    }

    if (cancelEditBtn && profileViewDiv && profileEditDiv) {
        cancelEditBtn.addEventListener("click", () => {
            profileEditDiv.classList.add("hidden");
            profileViewDiv.classList.remove("hidden");
        });
    }

    if (editProfileForm && saveProfileButton) { // Vérifier aussi saveProfileButton
        editProfileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            saveProfileButton.disabled = true;
            saveProfileButton.textContent = "Sauvegarde...";

            const updatedData = {
                full_name: editFullNameInput ? editFullNameInput.value.trim() : undefined,
                avatar_url: editAvatarUrlInput ? editAvatarUrlInput.value.trim() : undefined,
                bio: editBioInput ? editBioInput.value.trim() : undefined,
            };
            // Filtrer les champs undefined pour ne pas les envoyer si non modifiés ou vides
            const finalUpdatedData = Object.fromEntries(Object.entries(updatedData).filter(([_, v]) => v !== undefined && v !== "));

            if (Object.keys(finalUpdatedData).length === 0) {
                window.displayMessage("info", "Aucune modification détectée.", "message-container-profile");
                saveProfileButton.disabled = false;
                saveProfileButton.textContent = "Enregistrer";
                profileEditDiv.classList.add("hidden");
                profileViewDiv.classList.remove("hidden");
                return;
            }

            try {
                // Correction de l'URL : utiliser /profile au lieu de /api/v1/users/me/profile
                const response = await fetch(`${API_BASE_URL}/profile`, {
                    method: "PUT",
                    credentials: "include", // Important pour l'authentification par cookie
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(finalUpdatedData),
                });

                let resultText = await response.text(); // Lire la réponse comme texte d'abord
                let result = null;
                try {
                    result = JSON.parse(resultText); // Essayer de parser comme JSON
                } catch (jsonError) {
                    // Si ce n'est pas du JSON, result reste null, et on utilisera resultText pour l'erreur
                    console.warn("La réponse du serveur PUT /profile n'est pas du JSON valide:", resultText);
                }

                if (response.ok && result) {
                    window.displayMessage("success", result.message || "Profil mis à jour avec succès !", "message-container-profile");
                    currentUserData = result.user || result; // Le backend devrait renvoyer l'utilisateur mis à jour
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

    // Initial load
    fetchProfileData();
});

// S'assurer que displayMessage est disponible globalement (peut-être depuis script.js)
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

