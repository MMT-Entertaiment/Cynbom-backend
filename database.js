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
    url_id TEXT UNIQUE,
    image TEXT,
    vedette INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serie_id INTEGER NOT NULL,
    saison TEXT NOT NULL,
    numero INTEGER NOT NULL,
    titre TEXT,
    video TEXT,
    FOREIGN KEY (serie_id) REFERENCES series(id)
  );
`);

// Migration : ajouter les colonnes si elles n'existent pas encore
try { db.exec('ALTER TABLE series ADD COLUMN image TEXT'); } catch {}
try { db.exec('ALTER TABLE series ADD COLUMN url_id TEXT'); } catch {}
try { db.exec('ALTER TABLE episodes ADD COLUMN video TEXT'); } catch {}
try { db.exec('ALTER TABLE episodes ADD COLUMN saison_new TEXT'); db.exec('UPDATE episodes SET saison_new = CAST(saison AS TEXT)'); } catch {}

function getSerieByUrlId(url_id) {
  return db.prepare('SELECT * FROM series WHERE url_id = ?').get(url_id);
}

module.exports = {
  getSerieByUrlId,
  // SÉRIES
  ajouterSerie(titre, studio, annee, age, genre, image, url_id) {
    if (!url_id) {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      url_id = '';
      for (let i = 0; i < 35; i++) url_id += chars[Math.floor(Math.random() * chars.length)];
    }
    const stmt = db.prepare('INSERT INTO series (titre, studio, annee, age, genre, image, url_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    return stmt.run(titre, studio, annee, age, genre, image || null, url_id);
  },

  supprimerSerie(titre) {
    const serie = db.prepare('SELECT id FROM series WHERE titre = ?').get(titre);
    if (!serie) return false;
    db.prepare('DELETE FROM episodes WHERE serie_id = ?').run(serie.id);
    db.prepare('DELETE FROM series WHERE id = ?').run(serie.id);
    return true;
  },

  modifierSerie(titre, champ, valeur) {
    const champsAutorisés = ['titre', 'studio', 'annee', 'age', 'genre', 'image'];
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
  ajouterEpisode(titreSerie, saison, numero, titreEp, video) {
    const serie = db.prepare('SELECT id FROM series WHERE titre = ?').get(titreSerie);
    if (!serie) return false;
    const stmt = db.prepare('INSERT INTO episodes (serie_id, saison, numero, titre, video) VALUES (?, ?, ?, ?, ?)');
    stmt.run(serie.id, saison, numero, titreEp, video || null);
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
