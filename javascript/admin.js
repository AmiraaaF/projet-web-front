const API_BASE_URL = "https://projet-web-back.cluster-ig3.igpolytech.fr:3002";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("parking-form");
  const messageContainer = document.getElementById("message-container");

  // Vérifie que l'utilisateur est admin
  try {
    const res = await fetch(`${API_BASE_URL}/profile`, { credentials: "include" });
    const user = await res.json();
    if (user.role !== "admin") {
      alert("Accès refusé");
      window.location.href = "/";
      return;
    }
  } catch (err) {
    alert("Erreur d’authentification");
    window.location.href = "/";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nom = document.getElementById("nom").value.trim();
    const adresse = document.getElementById("adresse").value.trim();
    const lat = parseFloat(document.getElementById("lat").value);
    const lon = parseFloat(document.getElementById("lon").value);

    try {
      const res = await fetch(`${API_BASE_URL}/api/parkings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nom, adresse, lat, lon }),
      });

      const data = await res.json();

      if (res.ok) {
        messageContainer.innerText = " Parking ajouté avec succès !";
        form.reset();
      } else {
        messageContainer.innerText = ` ${data.error}`;
      }
    } catch (err) {
      console.error("Erreur réseau", err);
      messageContainer.innerText = " Erreur réseau";
    }
  });
});
