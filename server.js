const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// Connexion PostgreSQL sécurisée
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test de connexion et création des tables en arrière-plan (sans bloquer le démarrage)
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255)
  );
  CREATE TABLE IF NOT EXISTS designs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    prompt TEXT,
    fabric VARCHAR(255),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  console.log("Base de données initialisée avec succès.");
}).catch(err => {
  console.error("Erreur init DB (non bloquante) :", err);
});

// Route de test pour vérifier que l'API est en ligne
app.get('/', (req, res) => {
  res.send('Mela Modeline API is running!');
});

// Route d'inscription
app.post('/api/signup', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const newUser = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, password, name]
    );
    res.json({ success: true, user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: 'Cet email est déjà utilisé.' });
  }
});

// Route de connexion
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (user.rows.length > 0) {
      res.json({ success: true, user: user.rows[0] });
    } else {
      res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
});

// Route de génération de design
app.post('/api/generate', async (req, res) => {
  const { prompt, fabric, userId } = req.body;
  try {
    const imageUrl = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600";
    const newDesign = await pool.query(
      'INSERT INTO designs (user_id, prompt, fabric, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId || 1, prompt, fabric, imageUrl]
    );
    res.json({ success: true, design: newDesign.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur lors de la génération du design.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
