#  Parkly

**Parkly** est une application web de géolocalisation de parkings publics et de chat communautaire sur les parkings privés.

##  Fonctionnalités principales

- Recherche de parkings publics/privé sur carte (OpenStreetMap + Overpass API)
- Chat temps réel entre utilisateurs (WebSocket)
- Compte utilisateur avec inscription / connexion sécurisée
- Gestion des utilisateurs avec rôles (`admin`, `user`)
- (Ajout de parkings uniquement par les administrateurs)
- API RESTful (CRUD complet pour parkings)
- Sécurité : Hashage des mots de passe (bcrypt), JWT, cookies sécurisés
- Architecture front/back-end proprement séparée

---

##  Technologies utilisées

- **Deno** + **Oak** (back-end)
- **SQLite** (base de données légère)
- **OpenStreetMap** + **Leaflet.js** (carte)
- **WebSocket** (chat en temps réel)
- **Bcrypt** (hashage des mots de passe)
- **JWT** (authentification sécurisée)
- **GSAP** (animation sur le front)

---
## Lancement 


l'application est publié donc je deploie après modifications avec git push dokku: main pour le dossier projet_web_back et pour le dossier projet_web_front et le site est accessible sur l'addresse : https://projet-web-front.cluster-ig3.igpolytech.fr/ . 




