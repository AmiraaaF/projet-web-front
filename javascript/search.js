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
    getNearbyParkings(lat, lon).then(parkings => {
        parkings.forEach(p => {
            // Icône personnalisée (verte) pour les parkings
            const parkingIcon = L.icon({
                iconUrl: 'http://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            });
            L.marker([p.lat, p.lon], { icon: parkingIcon }) 
                .addTo(map)
                .bindPopup(p.name);
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

// Fonction asynchrone pour récupérer les parkings à proximité via l'API Overpass (OpenStreetMap)
async function getNearbyParkings(lat, lon) {
    const radius = 1000; // rayon en mètres

    // Requête Overpass pour trouver les parkings autour de la position
    const query = `
      [out:json];
      (
        node["amenity"="parking"](around:${radius},${lat},${lon});
        way["amenity"="parking"](around:${radius},${lat},${lon});
        relation["amenity"="parking"](around:${radius},${lat},${lon});
      );
      out center;
    `;

    try {
        const response = await fetch("http://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `data=${encodeURIComponent(query)}`
        });

        const data = await response.json();

        // Transforme les résultats en objets avec lat, lon et nom
        return data.elements.map(p => ({
            lat: p.lat || p.center?.lat,
            lon: p.lon || p.center?.lon,
            name: p.tags?.name || "Parking OSM"
        })).filter(p => p.lat && p.lon);
    } catch (err) {
        console.error("Erreur Overpass:", err);
        return [];
    }
}

// Gestion du formulaire de recherche d'adresse
document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const address = document.getElementById("address-input").value;

    // Utilise l'API Nominatim pour géocoder l'adresse saisie
    fetch(`http://nominatim.openstreetmap.org/search?format=json&q=${address}`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                const { lat, lon } = data[0];
                map.setView([lat, lon], 15);
                L.marker([lat, lon]).addTo(map).bindPopup(address).openPopup();

                // Affiche les parkings à proximité de l'adresse recherchée
                getNearbyParkings(lat, lon).then(parkings => {
                    parkings.forEach(p => {
                        L.marker([p.lat, p.lon])
                            .addTo(map)
                            .bindPopup(p.name);
                    });
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

