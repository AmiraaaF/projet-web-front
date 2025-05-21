// GSAP Animations for the homepage
if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector(".hero-text h1")) {
            gsap.from(".hero-text h1", { duration: 1, y: -50, opacity: 0, ease: "power3.out" });
            gsap.from(".hero-text p", { duration: 1, y: -30, opacity: 0, delay: 0.3, ease: "power3.out" });
        }
        if (document.querySelector(".cta-button")) {
            gsap.from(".cta-button", { duration: 1, scale: 0.5, opacity: 0, delay: 0.6, ease: "elastic.out(1, 0.5)" });
        }
        if (document.getElementById("hero-main-image")) {
            gsap.from("#hero-main-image", { duration: 1.5, x: 100, opacity: 0, delay: 0.5, ease: "power3.out"});
        }
        gsap.utils.toArray(".feature-card").forEach((card, i) => {
            gsap.from(card, {
                duration: 0.8,
                y: 50,
                opacity: 0,
                ease: "power2.out",
                scrollTrigger: { trigger: card, start: "top 80%", toggleActions: "play none none none" },
                delay: i * 0.2
            });
        });
        gsap.utils.toArray(".step").forEach((step, i) => {
            gsap.from(step, {
                duration: 0.7,
                scale: 0.8,
                opacity: 0,
                ease: "back.out(1.4)",
                scrollTrigger: { trigger: ".steps-container", start: "top 75%", toggleActions: "play none none none" },
                delay: i * 0.25
            });
        });
        if (document.querySelector(".step-arrow")) {
            gsap.from(".step-arrow", {
                duration: 0.7,
                scale: 0.5,
                opacity: 0,
                ease: "power2.out",
                scrollTrigger: { trigger: ".steps-container", start: "top 75%", toggleActions: "play none none none" },
                delay: 0.1
            });
        }
    });
}

const API_URL = "http://localhost:3002";

async function login() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (username === "" || password === "") {
        alert("Veuillez remplir tous les champs.");
        return;
    }
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            mode: "cors",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erreur de connexion inconnue");
        alert("Connexion réussie !");
        window.location.href = "index.html";
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

async function register() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (username === "" || password === "") {
        alert("Veuillez remplir tous les champs.");
        return;
    }
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            mode: "cors",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erreur d'inscription inconnue");
        alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
        window.location.href = "login.html";
    } catch (error) {
        alert("Erreur : " + error.message);
    }
}

async function logout() {
    try {
        const response = await fetch(`${API_URL}/logout`, { 
            method: "POST", 
            credentials: "include",
            mode: "cors"
        });
        if (response.ok) {
            alert("Déconnexion réussie.");
            updateAuthLinks(); 
            if (window.location.pathname.includes("profile.html")) {
                 window.location.href = "index.html";
            } else {
                 window.location.reload(); 
            }
        } else {
            const data = await response.json().catch(() => null);
            alert("Erreur lors de la déconnexion: " + (data?.error || response.statusText));
        }
    } catch (error) {
        console.error("Erreur lors de la déconnexion :", error);
        alert("Une erreur s'est produite lors de la déconnexion.");
    }
}

async function updateAuthLinks() {
  const authContainer = document.getElementById("auth-links");
  if (!authContainer) {
    console.error("L'élément #auth-links est introuvable dans le DOM.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/profile`, { // ou /verify_cookie
      method: "GET",
      credentials: "include",
      mode: "cors"
    });

    if (res.ok) {
      const data = await res.json();
      authContainer.innerHTML = `
        <div class="profile-dropdown-container">
          <span id="profile-dropdown-toggle" class="profile-icon" title="Mon Profil">👤</span>
          <span class="welcome-user">Bonjour, ${data.username}</span>
          <div id="profile-dropdown-content" class="dropdown-content">
            <a href="/profile.html">Mon Profil</a>
            <a href="#" onclick="logout(); return false;">Déconnexion</a>
          </div>
        </div>
      `;
      // Ajouter l'écouteur d'événement pour le menu déroulant
      const toggle = document.getElementById("profile-dropdown-toggle");
      const content = document.getElementById("profile-dropdown-content");
      if (toggle && content) {
        toggle.addEventListener("click", (event) => {
          event.stopPropagation(); // Empêche la propagation au document
          content.classList.toggle("show");
        });
      }
    } else {
      authContainer.innerHTML = `
        <a href="/login.html" class="auth-button login-button">Connexion</a>
      `;
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des liens d'authentification:", error);
    authContainer.innerHTML = `
      <a href="/login.html" class="auth-button login-button">Connexion</a>
    `;
  }
}

// Fermer le menu déroulant si l'utilisateur clique en dehors
document.addEventListener("click", function(event) {
  const dropdownContent = document.getElementById("profile-dropdown-content");
  const dropdownToggle = document.getElementById("profile-dropdown-toggle");
  if (dropdownContent && dropdownContent.classList.contains('show')) {
    // Vérifier si le clic n'est pas sur le toggle ni dans le contenu du dropdown
    if (dropdownToggle && !dropdownToggle.contains(event.target) && !dropdownContent.contains(event.target)) {
      dropdownContent.classList.remove('show');
    }
  }
});

function loadBlogPreview() {
    const container = document.getElementById("blog-preview-container");
    if (!container) return;
    fetch(`${API_URL}/api/posts`)
      .then(res => {
          if (!res.ok) return res.json().then(err => { throw new Error(err.error || "Impossible de charger les posts."); });
          return res.json();
      })
      .then(posts => {
        container.innerHTML = '';
        if (posts && posts.length > 0) {
            posts.slice(0, 3).forEach(post => {
              const div = document.createElement("div");
              div.className = "blog-preview";
              div.innerHTML = `
                <strong>${post.username || 'Auteur inconnu'}</strong> <em>${new Date(post.created_at).toLocaleString()}</em>
                <p>${post.content}</p>
              `;
              container.appendChild(div);
            });
        } else {
            container.innerHTML = '<p>Aucun post à afficher pour le moment.</p>';
        }
      })
      .catch(err => {
          console.error("Erreur chargement blog preview :", err);
          container.innerHTML = '<p>Erreur lors du chargement des posts du blog.</p>';
      });
}
  
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM entièrement chargé et analysé");
    updateAuthLinks(); 
    if (document.getElementById("blog-preview-container")) {
        loadBlogPreview();
    }
    const loginButtonOnPage = document.querySelector("form button[onclick='login()']");
    if (loginButtonOnPage) {
        loginButtonOnPage.addEventListener("click", function(event) {
            event.preventDefault(); // Empêcher la soumission par défaut du formulaire si le bouton est dans un form
            login();
        });
    }
    const registerButtonOnPage = document.querySelector("form button[onclick='register()']");
    if (registerButtonOnPage) {
        registerButtonOnPage.addEventListener("click", function(event) {
            event.preventDefault();
            register();
        });
    }
});

window.displayMessage = function (type, message, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(() => container.innerHTML = "", 5000);
};

const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links li');
if (burger && nav) {
    burger.addEventListener('click', () => {
        nav.classList.toggle('nav-active');
        navLinks.forEach((link, index) => {
            if (link.style.animation) {
                link.style.animation = '';
            } else {
                link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
            }
        });
        burger.classList.toggle('toggle');
    });
}

