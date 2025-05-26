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

    if (!adresse) {
      messageContainer.innerText = "Veuillez saisir une adresse.";
      return;
    }

    try {
      // Géocode l'adresse avec Nominatim
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}`);
      const geoData = await geoRes.json();

      if (geoData.length === 0) {
        messageContainer.innerText = "Adresse introuvable.";
        return;
      }

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);

      // Envoi au backend
      const res = await fetch(`${API_BASE_URL}/api/parkings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nom, adresse, lat, lon }),
      });

      const data = await res.json();

      if (res.ok) {
        messageContainer.innerText = "Parking ajouté avec succès !";
        form.reset();
      } else {
        messageContainer.innerText = data.error || "Erreur lors de l'ajout";
      }
    } catch (err) {
      console.error("Erreur réseau", err);
      messageContainer.innerText = "Erreur réseau";
    }
  });
});
