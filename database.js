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
try { db.exec('ALTER TABLE episodes ADD COLUMN video TEXT'); } catch {}
try { db.exec('ALTER TABLE episodes ADD COLUMN saison_new TEXT'); db.exec('UPDATE episodes SET saison_new = CAST(saison AS TEXT)'); } catch {}

module.exports = {
  // SÉRIES
  ajouterSerie(titre, studio, annee, age, genre, image) {
    const stmt = db.prepare('INSERT INTO series (titre, studio, annee, age, genre, image) VALUES (?, ?, ?, ?, ?, ?)');
    return stmt.run(titre, studio, annee, age, genre, image || null);
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

  retirerVedette() {
    const result = db.prepare('UPDATE series SET vedette = 0').run();
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

  // USERS
  ajouterUser(pseudo, email, mdp) {
    try {
      const stmt = db.prepare('INSERT INTO users (pseudo, email, mdp) VALUES (?, ?, ?)');
      return stmt.run(pseudo, email, mdp);
    } catch (e) {
      return null;
    }
  },

  getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  getUserByPseudo(pseudo) {
    return db.prepare('SELECT * FROM users WHERE pseudo = ?').get(pseudo);
  },

  getUsers() {
    return db.prepare('SELECT id, pseudo, email, admin, created_at FROM users').all();
  },

  setAdmin(pseudo, admin) {
    const result = db.prepare('UPDATE users SET admin = ? WHERE pseudo = ?').run(admin ? 1 : 0, pseudo);
    return result.changes > 0;
  },

  // BACKUP & RESTORE
  getAllData() {
    const series = db.prepare('SELECT * FROM series ORDER BY vedette DESC, id ASC').all();
    const episodes = {};
    for (const s of series) {
      const eps = db.prepare('SELECT * FROM episodes WHERE serie_id = ? ORDER BY saison, numero').all(s.id);
      if (eps.length > 0) episodes[s.titre] = eps;
    }
    return { series, episodes };
  },

  restoreData(data, mode = 'ajouter') {
    if (mode === 'ecraser') {
      db.prepare('DELETE FROM episodes').run();
      db.prepare('DELETE FROM series').run();
    }
    
    for (const s of data.series) {
      this.ajouterSerie(s.titre, s.studio, s.annee, s.age, s.genre, s.image);
      if (s.vedette) {
        const serie = db.prepare('SELECT id FROM series WHERE titre = ?').get(s.titre);
        db.prepare('UPDATE series SET vedette = 1 WHERE id = ?').run(serie.id);
      }
    }
    
    for (const [titre, eps] of Object.entries(data.episodes || {})) {
      for (const ep of eps) {
        this.ajouterEpisode(titre, ep.saison, ep.numero, ep.titre, ep.video);
      }
    }
  }
};
