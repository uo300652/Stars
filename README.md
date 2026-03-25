# 🌌 **REAL-TIME PLANETARIUM SIMULATOR**
Overview

This project is a web-based planetarium simulator designed to calculate and display the exact real-time position of the user's "vision zone" in the night sky. By processing the user's local time and precise geographic coordinates, the application accurately renders the visible stars, planets, and constellations directly overhead, providing an immersive astronomical experience.

## ✨ Features

  - Real-Time Vision Zone: Dynamically calculates and displays the observable sky based on the user's current location and device time.

  - Interactive UI: Smooth, reactive interface for exploring the celestial map.

  - High Performance & Scalability: Optimized asset delivery and secure backend routing to handle multiple users simultaneously with minimal latency.

## 🛠️ Tech Stack

This application is built using a modern, scalable JavaScript-based architecture:

  - Frontend: Vue.js * Powers the reactive user interface and manages the state of the dynamic sky map rendering.

  - Backend API: Node.js & Express * Serves as the core engine for processing geolocation data, handling celestial math/astronomy calculations, and serving API endpoints.

  - Web Server / Reverse Proxy: Nginx * Efficiently serves the static, compiled Vue frontend and securely proxies dynamic API requests to the Node/Express backend.

  - Edge Network & Security: Cloudflare * Provides global CDN capabilities for lightning-fast asset loading, SSL/TLS encryption, DNS management, and protection against DDoS attacks.

## 🏗️ System Architecture

  - Client Request: A user accesses the application. The request hits Cloudflare first, which serves cached static assets (HTML/CSS/JS) to ensure rapid initial page loads regardless of the user's global location.

  - Web Server Routing: Requests that bypass the cache (like dynamic API calls) are forwarded to the host server, where Nginx intercepts them.

  - Application Logic: Nginx routes the specific API endpoints (e.g., /api/stars?lat=X&lon=Y) to the Node.js/Express backend to perform the heavy lifting.

  - Client Rendering: The Vue.js frontend receives the calculated celestial data and renders the user's specific, real-time vision zone on their screen.
