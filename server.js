import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialisation de la base de données
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS designs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      prompt TEXT NOT NULL,
      fabric VARCHAR(100) NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
initDb().catch(console.error);

// Inscription
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: 'Email déjà utilisé ou données invalides.' });
  }
});

// Connexion
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Utilisateur non trouvé.' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Route de génération de design (IA)
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, fabric, userId } = req.body;
    
    // Simulation ou appel API IA (ex: Gemini / DALL-E)
    const simulatedImageUrl = `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80`;

    const result = await pool.query(
      'INSERT INTO designs (user_id, prompt, fabric, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId || null, prompt, fabric, simulatedImageUrl]
    );

    res.json({ success: true, design: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la génération.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend lancé sur le port ${PORT}`));