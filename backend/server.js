const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir le frontend (fichiers statiques)
// En production: le build Angular est dans frontend/dist/frontend/browser
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist', 'frontend', 'browser');
app.use(express.static(frontendPath));

// Routes API
app.use('/api/races', require('./routes/races'));
app.use('/api/config-poids', require('./routes/configPoids'));
app.use('/api/config-prix', require('./routes/configPrix'));
app.use('/api/lots', require('./routes/lots'));
app.use('/api/oeufs', require('./routes/oeufs'));
app.use('/api/transformation', require('./routes/transformation'));
app.use('/api/mortalite', require('./routes/mortalite'));
app.use('/api/stock', require('./routes/stock'));

// Route par défaut → frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🐔 Serveur Poulet démarré sur http://localhost:${PORT}`);
    console.log(`📊 API disponible sur http://localhost:${PORT}/api/`);
});
