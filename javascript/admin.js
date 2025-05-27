const API_BASE_URL = "https://projet-web-back.cluster-ig3.igpolytech.fr:3002";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("parking-form");
  const messageContainer = document.getElementById("message-container");
  const adresseInput = document.getElementById("adresse");
  const suggestionsContainer = document.getElementById("suggestions");

  let selectedLat = null;
  let selectedLon = null;
  let debounceTimeout = null;
  let currentUser = null;

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
    alert("Erreur d'authentification");
    window.location.href = "/";
    return;
  }

  // Autocomplétion adresse avec Nominatim
  adresseInput.addEventListener("input", () => {
    const query = adresseInput.value.trim();

    suggestionsContainer.innerHTML = "";
    selectedLat = null;
    selectedLon = null;

    if (query.length < 3) return;

    if (debounceTimeout) clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();

        suggestionsContainer.innerHTML = "";

        data.forEach(place => {
          const div = document.createElement("div");
          div.textContent = place.display_name;
          div.dataset.lat = place.lat;
          div.dataset.lon = place.lon;

          div.addEventListener("click", () => {
            adresseInput.value = place.display_name;
            selectedLat = parseFloat(place.lat);
            selectedLon = parseFloat(place.lon);
            suggestionsContainer.innerHTML = "";
          });

          suggestionsContainer.appendChild(div);
        });
      } catch (e) {
        console.error("Erreur autocomplétion adresse", e);
      }
    }, 300);
  });

  // Fermer suggestions si clic en dehors
  document.addEventListener("click", (e) => {
    if (!suggestionsContainer.contains(e.target) && e.target !== adresseInput) {
      suggestionsContainer.innerHTML = "";
    }
  });

  // Gestion du submit du formulaire
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nom = document.getElementById("nom").value.trim();
    const adresse = adresseInput.value.trim();

    let lat = selectedLat;
    let lon = selectedLon;

    // Si lat/lon non sélectionnés (ex: utilisateur n'a pas choisi dans la liste)
    if (!lat || !lon) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1`);
        const geoData = await geoRes.json();

        if (geoData.length === 0) {
          messageContainer.innerText = "Adresse introuvable.";
          return;
        }

        lat = parseFloat(geoData[0].lat);
        lon = parseFloat(geoData[0].lon);
      } catch {
        messageContainer.innerText = "Erreur géocodage adresse.";
        return;
      }
    }

    try {
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
        selectedLat = null;
        selectedLon = null;
      } else {
        messageContainer.innerText = data.error || "Erreur lors de l'ajout du parking.";
      }
    } catch (err) {
      console.error("Erreur réseau", err);
      messageContainer.innerText = "Erreur réseau";
    }
  });
});
