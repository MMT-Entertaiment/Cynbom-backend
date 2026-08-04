require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/adminonly', express.static('adminonly'));

app.get('/adminonly', (req, res) => {
  res.sendFile(__dirname + '/adminonly/webapp/index.html');
});

// SÉRIES
app.get('/series', (req, res) => {
  const series = db.getSeries();
  res.json(series);
});

app.get('/series/:titre/episodes', (req, res) => {
  const episodes = db.getEpisodes(req.params.titre);
  res.json(episodes);
});

app.post('/series', (req, res) => {
  const { titre, studio, annee, age, genre, image } = req.body;
  if (!titre) return res.status(400).json({ error: 'Titre requis' });
  db.ajouterSerie(titre, studio, annee, age, genre, image || null);
  res.json({ success: true });
});

app.delete('/series/:titre', (req, res) => {
  const ok = db.supprimerSerie(req.params.titre);
  res.json({ success: ok });
});

app.patch('/series/:titre', (req, res) => {
  const { champ, valeur } = req.body;
  const ok = db.modifierSerie(req.params.titre, champ, valeur);
  res.json({ success: ok });
});

app.post('/series/:titre/vedette', (req, res) => {
  const ok = db.setVedette(req.params.titre);
  res.json({ success: ok });
});

app.delete('/series/:titre/vedette', (req, res) => {
  const ok = db.retirerVedette();
  res.json({ success: ok });
});

// ÉPISODES
app.post('/series/:titre/episodes', (req, res) => {
  const { saison, numero, titre: titreEp, video } = req.body;
  const ok = db.ajouterEpisode(req.params.titre, saison || '1', numero, titreEp, video);
  res.json({ success: ok });
});

app.delete('/series/:titre/episodes/:saison/:numero', (req, res) => {
  const ok = db.retirerEpisode(req.params.titre, req.params.saison, req.params.numero);
  res.json({ success: ok });
});

app.patch('/series/:titre/episodes/:saison/:numero', (req, res) => {
  const { video } = req.body;
  const serie = db.getSerie(req.params.titre);
  if (!serie) return res.json({ success: false });
  const Database = require('better-sqlite3');
  const bdb = new Database('cynbom.db');
  const result = bdb.prepare('UPDATE episodes SET video = ? WHERE serie_id = ? AND saison = ? AND numero = ?').run(video, serie.id, req.params.saison, req.params.numero);
  res.json({ success: result.changes > 0 });
});

// USERS
app.get('/users', (req, res) => {
  const users = db.getUsers();
  res.json(users);
});

app.post('/users', (req, res) => {
  const { pseudo, email, mdp } = req.body;
  if (!pseudo || !email || !mdp) return res.status(400).json({ error: 'Pseudo, email et mdp requis' });
  const result = db.ajouterUser(pseudo, email, mdp);
  res.json({ success: result ? true : false });
});

app.patch('/users/:pseudo/admin', (req, res) => {
  const { admin } = req.body;
  const ok = db.setAdmin(req.params.pseudo, admin);
  res.json({ success: ok });
});

app.post('/auth', (req, res) => {
  const { pseudo, mdp } = req.body;
  const user = db.getUserByPseudo(pseudo);
  if (!user || user.mdp !== mdp) {
    return res.json({ success: false });
  }
  res.json({ success: true, user: { pseudo: user.pseudo, email: user.email, admin: user.admin } });
});

// BACKUP
app.get('/backup', (req, res) => {
  const data = db.getAllData();
  res.json(data);
});

app.post('/backup/restore', (req, res) => {
  const { data, mode } = req.body;
  if (!data) return res.status(400).json({ error: 'Données requises' });
  try {
    db.restoreData(data, mode || 'ajouter');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Cynbom en ligne sur http://localhost:${PORT}`));
