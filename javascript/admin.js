form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nom = document.getElementById("nom").value.trim();
  const adresse = document.getElementById("adresse").value.trim();
  let lat = parseFloat(document.getElementById("lat").value);
  let lon = parseFloat(document.getElementById("lon").value);

  try {
    // Si adresse donnée mais lat/lon vide, géocode l'adresse avec Nominatim
    if (adresse && (!lat || !lon)) {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}`);
      const geoData = await geoRes.json();
      if (geoData.length > 0) {
        lat = parseFloat(geoData[0].lat);
        lon = parseFloat(geoData[0].lon);
      } else {
        messageContainer.innerText = "Adresse introuvable.";
        return;
      }
    }

    // Vérifie que lat et lon sont valides avant d’envoyer
    if (!lat || !lon) {
      messageContainer.innerText = "Veuillez fournir une adresse valide ou une latitude et longitude.";
      return;
    }

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

