// Initialise la carte Leaflet centrée sur Londres par défaut
var map = L.map('map')
map.setView([51.505, -0.09], 13);

// Ajoute la couche de tuiles OpenStreetMap à la carte
L.tileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Utilise la géolocalisation du navigateur pour suivre la position de l'utilisateur
navigator.geolocation.watchPosition(success, error);

let marker, circle;

// Fonction appelée en cas de succès de la géolocalisation
function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    // Supprime l'ancien marqueur et cercle si présents
    if (marker) {
        map.removeLayer(marker);
        map.removeLayer(circle);
    }

    // Icône personnalisée (bleue) pour l'utilisateur
    const userIcon = L.icon({
        iconUrl: 'http://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });

    // Ajoute le marqueur et le cercle de précision sur la carte
    marker = L.marker([lat, lon], { icon: userIcon }).addTo(map)
    circle = L.circle([lat, lon], { radius: accuracy }).addTo(map);
    
    // Centre la carte sur la position de l'utilisateur
    map.fitBounds(circle.getBounds());

    // Récupère et affiche les parkings à proximité
    Promise.all([
    getNearbyParkings(lat, lon),
    getPrivateParkings(lat, lon)
]).then(([osmParkings, privateParkings]) => {
    const allParkings = [...osmParkings, ...privateParkings];

    allParkings.forEach(p => {
        let iconUrl;
        if (p.covered) {
            iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png";
        } else if (p.type === "privé") {
            iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png";
        } else {
            iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png";
        }

        const icon = L.icon({
            iconUrl,
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        });

        L.marker([p.lat, p.lon], { icon })
            .addTo(map)
            .bindPopup(`<strong>${p.name}</strong><br>Type : ${p.type}<br>Couvert : ${p.covered ? "Oui" : "Non"}`);
    });

    // Mise à jour affichage textuel
    const listContainer = document.getElementById("results-list");
    listContainer.innerHTML = "";
    allParkings.forEach(p => {
        const div = document.createElement("div");
        div.className = "result-card";
        div.innerHTML = `
            <h4>${p.name}</h4>
            <p>Type : ${p.type}</p>
            <p>Couvert : ${p.covered ? "Oui" : "Non"}</p>
            <p>Position : ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</p>
        `;
        listContainer.appendChild(div);
    });
});

}

// Fonction appelée en cas d'échec de la géolocalisation
function error(err) {
    if (err.code === 1) {
        alert("veuillez autoriser la géolocalisation.");
    }
    else {
        alert("impossible de vous géolocaliser.");
    }
}
// Supprime les anciens marqueurs sauf le marqueur de l'utilisateur
map.eachLayer(layer => {
    if (layer instanceof L.Marker && layer !== marker) {
        map.removeLayer(layer);
    }
});

// Fonction asynchrone pour récupérer les parkings à proximité via l'API Overpass (OpenStreetMap)
// Nouveau getNearbyParkings avec filtres dynamiques, icônes personnalisées et affichage textuel
async function getNearbyParkings(lat, lon) {
    const radiusKm = parseFloat(document.getElementById("radius-input")?.value || "1");
    const radius = Math.min(Math.max(radiusKm, 0.1), 50) * 1000; // Converti km en mètres, limite entre 100m et 50km
    const type = document.getElementById("type-filter")?.value;

    // Construction du filtre Overpass
    let overpassFilter = '["amenity"="parking"]';
    if (type === "public") overpassFilter += '["access"="public"]';
    else if (type === "private") overpassFilter += '["access"="private"]';
    else if (type === "covered") overpassFilter += '["covered"="yes"]';
    else if (type === "outdoor") overpassFilter += '["covered"!="yes"]';

    const query = `
      [out:json];
      (
        node${overpassFilter}(around:${radius},${lat},${lon});
        way${overpassFilter}(around:${radius},${lat},${lon});
        relation${overpassFilter}(around:${radius},${lat},${lon});
      );
      out center;
    `;

    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `data=${encodeURIComponent(query)}`
        });

        const data = await response.json();

        const results = data.elements.map(p => {
            const lat = p.lat || p.center?.lat;
            const lon = p.lon || p.center?.lon;
            return {
                lat,
                lon,
                name: p.tags?.name || "Parking OSM",
                type: p.tags?.access || "inconnu",
                covered: p.tags?.covered === "yes"
            };
        }).filter(p => p.lat && p.lon);

        // Affichage sur la carte
        results.forEach(p => {
            let iconUrl;

        if (p.covered) {
            iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png";
        } else if (p.type === "private") {
            iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png";
        } else {
            iconUrl = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png";
        }

        const icon = L.icon({
            iconUrl: iconUrl,
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        });


            L.marker([p.lat, p.lon], { icon })
                .addTo(map)
                .bindPopup(`<strong>${p.name}</strong><br>Type : ${p.type}<br>Couvert : ${p.covered ? "Oui" : "Non"}`);
        });

        // Affichage dans les résultats texte
        const listContainer = document.getElementById("results-list");
        listContainer.innerHTML = "";
        results.forEach(p => {
            const div = document.createElement("div");
            div.className = "result-card";
            div.innerHTML = `
                <h4>${p.name}</h4>
                <p>Type : ${p.type}</p>
                <p>Couvert : ${p.covered ? "Oui" : "Non"}</p>
                <p>Position : ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</p>
            `;
            listContainer.appendChild(div);
        });

        return results;
    } catch (err) {
        console.error("Erreur Overpass:", err);
        return [];
    }
}

const API_BASE_URL = "https://projet-web-back.cluster-ig3.igpolytech.fr:3002";

// Récupère les parkings enregistrés dans ta base de données (privés)
async function getPrivateParkings(lat, lon) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/parkings?lat=${lat}&lon=${lon}`);
        if (!res.ok) {
            console.error("Erreur API privée :", res.status);
            return [];
        }

        const data = await res.json();
        return data.map(p => ({
            lat: p.lat,
            lon: p.lon,
            name: p.nom,
            type: "privé",
            covered: false
        }));
    } catch (err) {
        console.error("Erreur récupération parkings privés :", err);
        return [];
    }
}



// Gestion du formulaire de recherche d'adresse
document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const address = document.getElementById("address-input").value;

    // Utilise l'API Nominatim pour géocoder l'adresse saisie
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                const { lat, lon } = data[0];
                map.setView([lat, lon], 15);
                L.marker([lat, lon]).addTo(map).bindPopup(address).openPopup();

                // Affiche les parkings à proximité de l'adresse recherchée
                getNearbyParkings(lat, lon).then(parkings => {
                    getNearbyParkings(lat, lon);

                });
            } else {
                alert("Adresse non trouvée");
            }
        })
        .catch(err => {
            console.error(err);
            alert("Erreur de recherche d'adresse");
        });
});

document.getElementById("apply-filters-btn").addEventListener("click", () => {
    if (marker) {
        const { lat, lng } = marker.getLatLng();
        getNearbyParkings(lat, lng);
    } else {
        alert("Veuillez activer la géolocalisation d'abord.");
    }
});

// Affiche le bouton admin si l'utilisateur est admin
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("https://projet-web-back.cluster-ig3.igpolytech.fr:3002/profile", {
            credentials: "include"
        });
        if (res.ok) {
            const user = await res.json();
            if (user.role === "admin") {
                const container = document.getElementById("admin-btn-container");
                if (container) {
                    container.innerHTML = `<a href="/html/admin.html" class="cta-button" style="margin:10px 0;display:inline-block;">Admin</a>`;
                }
            }
        }
    } catch (e) {
        // utilisateur non connecté ou erreur, ne rien faire
    }
});
