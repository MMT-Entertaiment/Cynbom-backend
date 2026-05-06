const Database = require('better-sqlite3');
const db = new Database('cynbom.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    studio TEXT,
    annee INTEGER,
    age TEXT,
    genre TEXT,
    vedette INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serie_id INTEGER NOT NULL,
    saison INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    titre TEXT,
    FOREIGN KEY (serie_id) REFERENCES series(id)
  );
`);

module.exports = {
  // SÉRIES
  ajouterSerie(titre, studio, annee, age, genre) {
    const stmt = db.prepare('INSERT INTO series (titre, studio, annee, age, genre) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(titre, studio, annee, age, genre);
  },

  supprimerSerie(titre) {
    const serie = db.prepare('SELECT id FROM series WHERE titre = ?').get(titre);
    if (!serie) return false;
    db.prepare('DELETE FROM episodes WHERE serie_id = ?').run(serie.id);
    db.prepare('DELETE FROM series WHERE id = ?').run(serie.id);
    return true;
  },

  modifierSerie(titre, champ, valeur) {
    const champsAutorisés = ['titre', 'studio', 'annee', 'age', 'genre'];
    if (!champsAutorisés.includes(champ)) return false;
    const stmt = db.prepare(`UPDATE series SET ${champ} = ? WHERE titre = ?`);
    const result = stmt.run(valeur, titre);
    return result.changes > 0;
  },

  setVedette(titre) {
    db.prepare('UPDATE series SET vedette = 0').run();
    const result = db.prepare('UPDATE series SET vedette = 1 WHERE titre = ?').run(titre);
    return result.changes > 0;
  },

  getSeries() {
    return db.prepare('SELECT * FROM series ORDER BY vedette DESC, id ASC').all();
  },

  getSerie(titre) {
    return db.prepare('SELECT * FROM series WHERE titre = ?').get(titre);
  },

  // ÉPISODES
  ajouterEpisode(titreSerie, saison, numero, titreEp) {
    const serie = db.prepare('SELECT id FROM series WHERE titre = ?').get(titreSerie);
    if (!serie) return false;
    const stmt = db.prepare('INSERT INTO episodes (serie_id, saison, numero, titre) VALUES (?, ?, ?, ?)');
    stmt.run(serie.id, saison, numero, titreEp);
    return true;
  },

  retirerEpisode(titreSerie, saison, numero) {
    const serie = db.prepare('SELECT id FROM series WHERE titre = ?').get(titreSerie);
    if (!serie) return false;
    const result = db.prepare('DELETE FROM episodes WHERE serie_id = ? AND saison = ? AND numero = ?').run(serie.id, saison, numero);
    return result.changes > 0;
  },

  getEpisodes(titreSerie) {
    const serie = db.prepare('SELECT id FROM series WHERE titre = ?').get(titreSerie);
    if (!serie) return [];
    return db.prepare('SELECT * FROM episodes WHERE serie_id = ? ORDER BY saison, numero').all(serie.id);
  },
};
