const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(MONGODB_URI);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('cynbom');
    console.log('MongoDB connecté');
  } catch (e) {
    console.error('Erreur MongoDB:', e);
  }
}

connectDB();

module.exports = {
  // SÉRIES
  async ajouterSerie(titre, studio, annee, age, genre, image) {
    try {
      const result = await db.collection('series').insertOne({
        titre, studio, annee, age, genre, image: image || null, vedette: 0
      });
      return result;
    } catch (e) {
      console.error('Erreur ajouterSerie:', e);
      return null;
    }
  },

  async supprimerSerie(titre) {
    try {
      const result = await db.collection('series').deleteOne({ titre });
      await db.collection('episodes').deleteMany({ serie_titre: titre });
      return result.deletedCount > 0;
    } catch (e) {
      console.error('Erreur supprimerSerie:', e);
      return false;
    }
  },

  async modifierSerie(titre, champ, valeur) {
    try {
      const champsAutorisés = ['titre', 'studio', 'annee', 'age', 'genre', 'image'];
      if (!champsAutorisés.includes(champ)) return false;
      
      const result = await db.collection('series').updateOne(
        { titre },
        { $set: { [champ]: valeur } }
      );
      return result.modifiedCount > 0;
    } catch (e) {
      console.error('Erreur modifierSerie:', e);
      return false;
    }
  },

  async setVedette(titre) {
    try {
      await db.collection('series').updateMany({}, { $set: { vedette: 0 } });
      const result = await db.collection('series').updateOne(
        { titre },
        { $set: { vedette: 1 } }
      );
      return result.modifiedCount > 0;
    } catch (e) {
      console.error('Erreur setVedette:', e);
      return false;
    }
  },

  async retirerVedette() {
    try {
      const result = await db.collection('series').updateMany({}, { $set: { vedette: 0 } });
      return result.modifiedCount > 0;
    } catch (e) {
      console.error('Erreur retirerVedette:', e);
      return false;
    }
  },

  async getSeries() {
    try {
      return await db.collection('series').find({}).sort({ vedette: -1, _id: 1 }).toArray();
    } catch (e) {
      console.error('Erreur getSeries:', e);
      return [];
    }
  },

  async getSerie(titre) {
    try {
      return await db.collection('series').findOne({ titre });
    } catch (e) {
      console.error('Erreur getSerie:', e);
      return null;
    }
  },

  // ÉPISODES
  async ajouterEpisode(titreSerie, saison, numero, titreEp, video) {
    try {
      const result = await db.collection('episodes').insertOne({
        serie_titre: titreSerie,
        saison: saison || '1',
        numero,
        titre: titreEp,
        video: video || null
      });
      return result.insertedId ? true : false;
    } catch (e) {
      console.error('Erreur ajouterEpisode:', e);
      return false;
    }
  },

  async retirerEpisode(titreSerie, saison, numero) {
    try {
      const result = await db.collection('episodes').deleteOne({
        serie_titre: titreSerie,
        saison,
        numero
      });
      return result.deletedCount > 0;
    } catch (e) {
      console.error('Erreur retirerEpisode:', e);
      return false;
    }
  },

  async getEpisodes(titreSerie) {
    try {
      return await db.collection('episodes').find({ serie_titre: titreSerie }).sort({ saison: 1, numero: 1 }).toArray();
    } catch (e) {
      console.error('Erreur getEpisodes:', e);
      return [];
    }
  },

  // USERS
  async ajouterUser(pseudo, email, mdp) {
    try {
      const result = await db.collection('users').insertOne({
        pseudo, email, mdp, admin: 0, created_at: new Date()
      });
      return result.insertedId ? true : false;
    } catch (e) {
      console.error('Erreur ajouterUser:', e);
      return null;
    }
  },

  async getUserByEmail(email) {
    try {
      return await db.collection('users').findOne({ email });
    } catch (e) {
      console.error('Erreur getUserByEmail:', e);
      return null;
    }
  },

  async getUserByPseudo(pseudo) {
    try {
      return await db.collection('users').findOne({ pseudo });
    } catch (e) {
      console.error('Erreur getUserByPseudo:', e);
      return null;
    }
  },

  async getUsers() {
    try {
      return await db.collection('users').find({}).project({ pseudo: 1, email: 1, admin: 1, created_at: 1 }).toArray();
    } catch (e) {
      console.error('Erreur getUsers:', e);
      return [];
    }
  },

  async setAdmin(pseudo, admin) {
    try {
      const result = await db.collection('users').updateOne(
        { pseudo },
        { $set: { admin: admin ? 1 : 0 } }
      );
      return result.modifiedCount > 0;
    } catch (e) {
      console.error('Erreur setAdmin:', e);
      return false;
    }
  },

  // BACKUP & RESTORE
  async getAllData() {
    try {
      const series = await db.collection('series').find({}).sort({ vedette: -1, _id: 1 }).toArray();
      const episodes = {};
      
      for (const s of series) {
        const eps = await db.collection('episodes').find({ serie_titre: s.titre }).sort({ saison: 1, numero: 1 }).toArray();
        if (eps.length > 0) episodes[s.titre] = eps;
      }
      
      return { series, episodes };
    } catch (e) {
      console.error('Erreur getAllData:', e);
      return { series: [], episodes: {} };
    }
  },

  async restoreData(data, mode = 'ajouter') {
    try {
      if (mode === 'ecraser') {
        await db.collection('episodes').deleteMany({});
        await db.collection('series').deleteMany({});
      }
      
      for (const s of data.series) {
        await db.collection('series').insertOne(s);
        if (s.vedette) {
          await db.collection('series').updateOne(
            { titre: s.titre },
            { $set: { vedette: 1 } }
          );
        }
      }
      
      for (const [titre, eps] of Object.entries(data.episodes || {})) {
        for (const ep of eps) {
          await db.collection('episodes').insertOne({
            ...ep,
            serie_titre: titre
          });
        }
      }
    } catch (e) {
      console.error('Erreur restoreData:', e);
    }
  }
};
