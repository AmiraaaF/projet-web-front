var map = L.map('map')
map.setView([51.505, -0.09], 13);

L.tileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

navigator.geolocation.watchPosition(success,error);
let marker, circle
function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    if (marker) {
        map.removeLayer(marker);
        map.removeLayer(circle);
    }

   // Icône personnalisée (bleue)
   const userIcon = L.icon({
    iconUrl: 'http://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

    marker = L.marker([lat, lon], { icon: userIcon }).addTo(map)
    circle = L.circle([lat, lon], { radius: accuracy }).addTo(map);
    
    map.fitBounds(circle.getBounds());
    getNearbyParkings(lat, lon).then(parkings => {
        parkings.forEach(p => {
            // Icône personnalisée pour les parkings (verte)
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

function error(err) {
    if (err.code === 1) {
        alert("veuillez autoriser la géolocalisation.");
    }
    else {
        alert("impossible de vous géolocaliser.");
    }
}

async function getNearbyParkings(lat, lon) {
    const radius = 1000; // rayon en mètres
  
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
  
  document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const address = document.getElementById("address-input").value;
  
    fetch(`http://nominatim.openstreetmap.org/search?format=json&q=${address}`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const { lat, lon } = data[0];
          map.setView([lat, lon], 15);
          L.marker([lat, lon]).addTo(map).bindPopup(address).openPopup();
  
          
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
  
