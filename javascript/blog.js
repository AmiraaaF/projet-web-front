// Vérifie si API_URL est déjà définie (par exemple dans script.js), sinon la définit ici
if (typeof API_URL === "undefined") {
  const API_URL = "https://projet-web-back.cluster-ig3.igpolytech.fr:3002";
}

// Quand la page est chargée, lance la vérification utilisateur et le chargement des posts
document.addEventListener("DOMContentLoaded", () => {
    checkUserAndLoadPosts();
    
    // Ajoute un écouteur sur le formulaire de création de post
    const postForm = document.getElementById("new-post-form");
    if (postForm) {
        postForm.addEventListener("submit", (event) => {
            event.preventDefault();
            submitPost();
        });
    }
});

// Vérifie si l'utilisateur est connecté (appel à /profile) et affiche/masque le formulaire de post
async function checkUserAndLoadPosts() {
    try {
        if (typeof API_URL === "undefined") {
            console.error("API_URL n'est pas définie. Assurez-vous que script.js est chargé avant blog.js.");
            return;
        }
        const response = await fetch(`${API_URL}/profile`, { 
            method: "GET",
            credentials: "include",
            mode: "cors"
        });

        const newPostForm = document.getElementById("new-post-form");
        const loginMessage = document.getElementById("login-message");

        if (response.ok) {
            // Utilisateur connecté : affiche le formulaire, cache le message de connexion
            if (newPostForm) newPostForm.classList.remove("hidden");
            if (loginMessage) loginMessage.classList.add("hidden");
        } else {
            // Utilisateur non connecté : cache le formulaire, affiche le message de connexion
            if (newPostForm) newPostForm.classList.add("hidden");
            if (loginMessage) loginMessage.classList.remove("hidden");
        }
    } catch (error) {
        // En cas d'erreur réseau, cache le formulaire et affiche le message de connexion
        console.error("Erreur lors de la vérification de l'utilisateur pour le blog:", error);
        const newPostForm = document.getElementById("new-post-form");
        const loginMessage = document.getElementById("login-message");
        if (newPostForm) newPostForm.classList.add("hidden");
        if (loginMessage) loginMessage.classList.remove("hidden");
    }
    loadPosts(); // Charge les posts du blog dans tous les cas
}

// Charge et affiche tous les posts du blog
async function loadPosts() {
  const container = document.getElementById("posts-container");
  try {
    if (typeof API_URL === 'undefined') throw new Error("API_URL non définie.");
    const res = await fetch(`${API_URL}/api/posts`, {
      credentials: "include",
      mode: "cors"
    });
    const responseText = await res.text();

    if (!res.ok) {
        // Gestion des erreurs serveur ou API
        let errorMsg = `Erreur serveur ${res.status}.`;
        try {
            const errorData = JSON.parse(responseText);
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (e) {
            errorMsg += ` Réponse brute: ${responseText.substring(0, 200)}${responseText.length > 200 ? "..." : ""}`;
            console.error("Réponse non-JSON du serveur (GET /posts):", responseText);
        }
        throw new Error(errorMsg);
    }

    const posts = JSON.parse(responseText);

    if (!container) return;
    container.innerHTML = "";

    // Affiche chaque post dans le conteneur
    if (posts && posts.length > 0) {
        posts.forEach(post => {
          const div = document.createElement("div");
          div.className = "blog-post";
          div.innerHTML = `
            <div class="post-header">
              <div class="user-avatar">👤</div>
              <div class="user-info">
                <strong>${post.author_username || "Auteur Inconnu"}</strong>
                <span class="timestamp">${new Date(post.created_at).toLocaleString()}</span>
              </div>
            </div>
            <h3 class="post-title">${post.title || "Sans titre"}</h3>
            <div class="post-content">
              <p>${post.content}</p>
            </div>
            <div class="post-actions">
              ${post.current_user_role === "admin" ? `<button class="delete-post-btn" data-id="${post.id}">🗑️ Supprimer</button>` : ""}
            </div>
          `;
          container.appendChild(div);

          // Ajoute l'écouteur pour la suppression si l'utilisateur est admin
          if (post.current_user_role === "admin") {
            const deleteBtn = div.querySelector(".delete-post-btn");
            if (deleteBtn) {
              deleteBtn.addEventListener("click", () => deletePost(post.id));
            }
          }
        });
    } else {
        container.innerHTML = "<p>Aucun post à afficher pour le moment.</p>";
    }
  } catch (err) {
    // Affiche une erreur si le chargement échoue
    console.error("Erreur chargement posts:", err);
    if (container) container.innerHTML = `<p>Erreur lors du chargement des posts: ${err.message}</p>`;
  }
}

// Soumet un nouveau post au serveur (formulaire)
// Vérifie les champs, envoie la requête POST, affiche un message et recharge les posts
async function submitPost() {
  const titleInput = document.getElementById("post-title");
  const contentInput = document.getElementById("post-content");
  
  if (!titleInput || !contentInput) {
      alert("Erreur: Champs titre ou contenu introuvables.");
      return;
  }

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    alert("Le titre et le contenu ne peuvent pas être vides !");
    return;
  }

  try {
    if (typeof API_URL === 'undefined') throw new Error("API_URL non définie.");
    const response = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        credentials: "include", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }) 
    });
    
    const responseText = await response.text(); // Lire la réponse en texte d'abord
    let result = null;
    let errorFromServer = null;

    try {
        result = JSON.parse(responseText); // Essayer de parser comme JSON
    } catch (e) {
        console.error("Réponse non-JSON du serveur (POST /posts):", responseText);
        errorFromServer = `Erreur de format de réponse du serveur. Réponse brute: ${responseText.substring(0,200)}${responseText.length > 200 ? "..." : ""}`;
    }

    if (!response.ok) {
        const errorMsg = (result && (result.error || result.message)) || errorFromServer || "Erreur lors de la publication du post.";
        throw new Error(errorMsg);
    }
    
    // Réinitialise le formulaire et affiche un message de succès
    titleInput.value = "";
    contentInput.value = "";
    window.displayMessage("success", (result && result.message) || "Post publié avec succès !", "message-container-blog"); 
    loadPosts(); // Recharge la liste des posts

  } catch (err) {
    // Affiche une erreur si la publication échoue
    console.error("Erreur post message :", err);
    window.displayMessage("error", `Erreur : ${err.message}. Assurez-vous d'être connecté et que le serveur fonctionne correctement.`, "message-container-blog");
  }
}

// Fonction pour supprimer un post (réservé admin)
// Demande confirmation, envoie la requête DELETE, affiche un message et recharge les posts
async function deletePost(postId) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce post ?")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/admin/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
      mode: "cors"
    });

    if (response.ok) {
      window.displayMessage("success", "Post supprimé avec succès", "message-container-blog");
      loadPosts(); // Recharger la liste des posts
    } else {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression du post");
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du post:", error);
    window.displayMessage("error", error.message, "message-container-blog");
  }
}

// Fonction utilitaire pour afficher des messages de succès/erreur dans le blog
if (typeof window.displayMessage !== 'function') {
    window.displayMessage = function(type, message, containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="message ${type}">${message}</div>`;
            setTimeout(() => { container.innerHTML = ""; }, 7000); // Augmente le délai pour les erreurs
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    };
}

