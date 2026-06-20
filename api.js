require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// GET toutes les séries
app.get('/series', (req, res) => {
  const series = db.getSeries();
  res.json(series);
});

// GET épisodes d'une série
app.get('/series/:titre/episodes', (req, res) => {
  const episodes = db.getEpisodes(req.params.titre);
  res.json(episodes);
});

// POST ajouter série
app.post('/series', (req, res) => {
  const { titre, studio, annee, age, genre, image } = req.body;
  if (!titre) return res.status(400).json({ error: 'Titre requis' });
  db.ajouterSerie(titre, studio, annee, age, genre, image || null);
  res.json({ success: true });
});

// DELETE supprimer série
app.delete('/series/:titre', (req, res) => {
  const ok = db.supprimerSerie(req.params.titre);
  res.json({ success: ok });
});

// PATCH modifier série
app.patch('/series/:titre', (req, res) => {
  const { champ, valeur } = req.body;
  const ok = db.modifierSerie(req.params.titre, champ, valeur);
  res.json({ success: ok });
});

// POST vedette
app.post('/series/:titre/vedette', (req, res) => {
  const ok = db.setVedette(req.params.titre);
  res.json({ success: ok });
});

// POST ajouter épisode
app.post('/series/:titre/episodes', (req, res) => {
  const { saison, numero, titre: titreEp, video } = req.body;
  const ok = db.ajouterEpisode(req.params.titre, saison || '1', numero, titreEp, video);
  res.json({ success: ok });
});

// DELETE retirer épisode
app.delete('/series/:titre/episodes/:saison/:numero', (req, res) => {
  const ok = db.retirerEpisode(req.params.titre, req.params.saison, req.params.numero);
  res.json({ success: ok });
});

// PATCH modifier vidéo épisode
app.patch('/series/:titre/episodes/:saison/:numero', (req, res) => {
  const { video } = req.body;
  const serie = db.getSerie(req.params.titre);
  if (!serie) return res.json({ success: false });
  const Database = require('better-sqlite3');
  const bdb = new Database('cynbom.db');
  const result = bdb.prepare('UPDATE episodes SET video = ? WHERE serie_id = ? AND saison = ? AND numero = ?').run(video, serie.id, req.params.saison, req.params.numero);
  res.json({ success: result.changes > 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Cynbom en ligne sur http://localhost:${PORT}`));
