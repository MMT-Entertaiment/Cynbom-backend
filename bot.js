require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const API = `http://localhost:${process.env.PORT || 3000}`;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('ajouter-serie')
    .setDescription('Ajouter une série ou un film au site')
    .addStringOption(o => o.setName('titre').setDescription('Titre').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Type').setRequired(true)
      .addChoices(
        { name: 'Série', value: 'Série' },
        { name: 'Film', value: 'Film' },
        { name: 'OST', value: 'OST' },
      ))
    .addStringOption(o => o.setName('genre').setDescription('Genre').setRequired(true)
      .addChoices(
        { name: 'Action', value: 'Action' },
        { name: 'Aventure', value: 'Aventure' },
        { name: 'Comédie', value: 'Comédie' },
        { name: 'Drame', value: 'Drame' },
        { name: 'Fantaisie', value: 'Fantaisie' },
        { name: 'Horreur', value: 'Horreur' },
        { name: 'Horreur Psychologique', value: 'Horreur Psychologique' },
        { name: 'Musical', value: 'Musical' },
        { name: 'Romance', value: 'Romance' },
        { name: 'SF', value: 'SF' },
        { name: 'Super-héros', value: 'Super-héros' },
        { name: 'Thriller', value: 'Thriller' },
        { name: 'Documentaire', value: 'Documentaire' },
        { name: 'Animation', value: 'Animation' },
      ))
    .addStringOption(o => o.setName('studio').setDescription('Studio').setRequired(true))
    .addIntegerOption(o => o.setName('annee').setDescription('Année de sortie').setRequired(true))
    .addStringOption(o => o.setName('age').setDescription('Classification âge (ex: 13+)').setRequired(true))
    .addStringOption(o => o.setName('image').setDescription('URL image').setRequired(true)),

  new SlashCommandBuilder()
    .setName('supprimer-serie')
    .setDescription('Supprimer une série du site')
    .addStringOption(o => o.setName('titre').setDescription('Titre exact de la série').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('modifier-serie')
    .setDescription('Modifier une info d\'une série')
    .addStringOption(o => o.setName('titre').setDescription('Titre exact de la série').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('champ').setDescription('Champ à modifier').setRequired(true)
      .addChoices(
        { name: 'Titre', value: 'titre' },
        { name: 'Studio', value: 'studio' },
        { name: 'Année', value: 'annee' },
        { name: 'Âge', value: 'age' },
        { name: 'Genre', value: 'genre' },
        { name: 'Type', value: 'type' },
        { name: 'Image', value: 'image' },
      ))
    .addStringOption(o => o.setName('valeur').setDescription('Nouvelle valeur').setRequired(true)),

  new SlashCommandBuilder()
    .setName('vedette')
    .setDescription('Mettre une série en vedette sur le site')
    .addStringOption(o => o.setName('titre').setDescription('Titre exact de la série').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('ajouter-episode')
    .setDescription('Ajouter un épisode à une série')
    .addStringOption(o => o.setName('serie').setDescription('Titre exact de la série').setRequired(true).setAutocomplete(true))
    .addIntegerOption(o => o.setName('numero').setDescription('Numéro d\'épisode').setRequired(true))
    .addStringOption(o => o.setName('saison').setDescription('Numéro ou nom de saison (ex: 1, Trailer)').setRequired(false))
    .addStringOption(o => o.setName('titre').setDescription('Titre de l\'épisode').setRequired(false))
    .addStringOption(o => o.setName('video').setDescription('URL YouTube (https://www.youtube.com/watch?v=XXXX)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('modifier-episode')
    .setDescription('Modifier la vidéo d\'un épisode')
    .addStringOption(o => o.setName('serie').setDescription('Titre exact de la série').setRequired(true).setAutocomplete(true))
    .addIntegerOption(o => o.setName('numero').setDescription('Numéro d\'épisode').setRequired(true))
    .addStringOption(o => o.setName('video').setDescription('Nouvelle URL YouTube').setRequired(true))
    .addStringOption(o => o.setName('saison').setDescription('Numéro ou nom de saison (ex: 1, Trailer)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('retirer-episode')
    .setDescription('Retirer un épisode d\'une série')
    .addStringOption(o => o.setName('serie').setDescription('Titre exact de la série').setRequired(true).setAutocomplete(true))
    .addIntegerOption(o => o.setName('numero').setDescription('Numéro d\'épisode').setRequired(true))
    .addStringOption(o => o.setName('saison').setDescription('Numéro ou nom de saison (ex: 1, Trailer)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('cree-backup')
    .setDescription('Créer un backup manuel de la base de données'),

  new SlashCommandBuilder()
    .setName('restaurer-backup')
    .setDescription('Restaurer la DB depuis un fichier backup JSON joint')
    .addAttachmentOption(o => o.setName('fichier').setDescription('Fichier backup .json').setRequired(true))
    .addStringOption(o => o.setName('comportement').setDescription('Mode de restauration').setRequired(true)
      .addChoices(
        { name: "Ajouter (conserver l'existant)", value: 'ajouter' },
        { name: 'Écraser (vider puis importer)', value: 'ecraser' }
      )),

  new SlashCommandBuilder()
    .setName('liste-series')
    .setDescription('Voir toutes les séries du site'),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), { body: commands })
  .then(() => console.log('Commandes slash enregistrées'))
  .catch(console.error);


// Autocomplete pour les noms de séries
client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;
  
  if (['supprimer-serie', 'modifier-serie', 'vedette', 'ajouter-episode', 'retirer-episode', 'modifier-episode'].includes(interaction.commandName)) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    try {
      const series = await fetch(`${API}/series`).then(r => r.json());
      const filtered = series
        .filter(s => s.titre.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map(s => ({ name: s.titre, value: s.titre }));
      await interaction.respond(filtered.length > 0 ? filtered : [{ name: 'Aucune série trouvée', value: '' }]);
    } catch {
      await interaction.respond([{ name: 'Erreur de chargement', value: '' }]);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ ephemeral: true });

  const { commandName } = interaction;

  try {
    if (commandName === 'ajouter-serie') {
      const type = interaction.options.getString('type');
      const genre = interaction.options.getString('genre');
      const body = {
        titre: interaction.options.getString('titre'),
        studio: interaction.options.getString('studio'),
        annee: interaction.options.getInteger('annee'),
        age: interaction.options.getString('age'),
        genre: `${type} | ${genre}`,
        image: interaction.options.getString('image'),
      };
      await fetch(`${API}/series`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await interaction.editReply(`✅ Série **${body.titre}** ajoutée.`);
    }

    else if (commandName === 'supprimer-serie') {
      const titre = interaction.options.getString('titre');
      const res = await fetch(`${API}/series/${encodeURIComponent(titre)}`, { method: 'DELETE' });
      const data = await res.json();
      await interaction.editReply(data.success ? `🗑️ Série **${titre}** supprimée.` : `❌ Série introuvable.`);
    }

    else if (commandName === 'modifier-serie') {
      const titre = interaction.options.getString('titre');
      const champ = interaction.options.getString('champ');
      const valeur = interaction.options.getString('valeur');
      const res = await fetch(`${API}/series/${encodeURIComponent(titre)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ champ, valeur }),
      });
      const data = await res.json();
      await interaction.editReply(data.success ? `✏️ **${titre}** — ${champ} mis à jour.` : `❌ Série introuvable.`);
    }

    else if (commandName === 'vedette') {
      const titre = interaction.options.getString('titre');
      const res = await fetch(`${API}/series/${encodeURIComponent(titre)}/vedette`, { method: 'POST' });
      const data = await res.json();
      await interaction.editReply(data.success ? `⭐ **${titre}** est maintenant en vedette.` : `❌ Série introuvable.`);
    }

    else if (commandName === 'ajouter-episode') {
      const serie = interaction.options.getString('serie');
      const saison = interaction.options.getString('saison') || '1';
      const numero = interaction.options.getInteger('numero');
      const titre = interaction.options.getString('titre') || null;
      const video = interaction.options.getString('video') || null;
      const res = await fetch(`${API}/series/${encodeURIComponent(serie)}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saison, numero, titre, video }),
      });
      const data = await res.json();
      await interaction.editReply(data.success ? `✅ Épisode S${saison}E${numero} ajouté à **${serie}**.` : `❌ Série introuvable.`);
    }

    else if (commandName === 'modifier-episode') {
      const serie = interaction.options.getString('serie');
      const saison = interaction.options.getString('saison') || '1';
      const numero = interaction.options.getInteger('numero');
      const video = interaction.options.getString('video');
      const res = await fetch(`${API}/series/${encodeURIComponent(serie)}/episodes/${saison}/${numero}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video }),
      });
      const data = await res.json();
      await interaction.editReply(data.success ? `✏️ Vidéo de S${saison}E${numero} mise à jour.` : `❌ Épisode introuvable.`);
    }

    else if (commandName === 'retirer-episode') {
      const serie = interaction.options.getString('serie');
      const saison = interaction.options.getString('saison') || '1';
      const numero = interaction.options.getInteger('numero');
      const res = await fetch(`${API}/series/${encodeURIComponent(serie)}/episodes/${saison}/${numero}`, { method: 'DELETE' });
      const data = await res.json();
      await interaction.editReply(data.success ? `🗑️ Épisode S${saison}E${numero} retiré de **${serie}**.` : `❌ Épisode introuvable.`);
    }

    else if (commandName === 'cree-backup') {
      try {
        const series = await fetch(`${API}/series`).then(r => r.json());
        const episodes = {};
        for (const s of series) {
          const eps = await fetch(`${API}/series/${encodeURIComponent(s.titre)}/episodes`).then(r => r.json());
          if (eps.length > 0) episodes[s.titre] = eps;
        }
        const backup = JSON.stringify({ series, episodes }, null, 2);
        const date = new Date().toLocaleDateString('fr-FR');
        const channel = await client.channels.fetch('1502237956163895307');
        await channel.send({
          content: `📦 **Backup manuel Cynbom** — ${date}`,
          files: [{ attachment: Buffer.from(backup), name: `cynbom-backup-${date.replace(/\//g, '-')}.json` }]
        });
        await interaction.editReply(`✅ Backup créé et envoyé dans le channel backup !`);
      } catch(e) {
        console.error(e);
        await interaction.editReply('❌ Erreur lors de la création du backup.');
      }
    }

    else if (commandName === 'restaurer-backup') {
      const attachment = interaction.options.getAttachment('fichier');
      const comportement = interaction.options.getString('comportement');
      if (!attachment) return await interaction.editReply('❌ Joignez un fichier backup JSON à la commande.');
      try {
        const res = await fetch(attachment.url);
        const backup = await res.json();
        
        // Vider la DB si mode écraser
        if (comportement === 'ecraser') {
          const allSeries = await fetch(`${API}/series`).then(r => r.json());
          for (const s of allSeries) {
            await fetch(`${API}/series/${encodeURIComponent(s.titre)}`, { method: 'DELETE' });
          }
        }
        
        // Restaurer séries
        for (const s of backup.series) {
          await fetch(`${API}/series`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
          if (s.vedette) await fetch(`${API}/series/${encodeURIComponent(s.titre)}/vedette`, { method: 'POST' });
        }
        // Restaurer épisodes
        for (const [titre, eps] of Object.entries(backup.episodes || {})) {
          for (const ep of eps) {
            await fetch(`${API}/series/${encodeURIComponent(titre)}/episodes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ep) });
          }
        }
        await interaction.editReply(`✅ Backup restauré ! ${backup.series.length} séries/films récupérés.`);
      } catch(e) {
        await interaction.editReply('❌ Erreur lors de la restauration.');
      }
    }

    else if (commandName === 'liste-series') {
      const res = await fetch(`${API}/series`);
      const series = await res.json();
      if (series.length === 0) return await interaction.editReply('Aucune série pour le moment.');
      const liste = series.map(s => `${s.vedette ? '⭐ ' : ''}**${s.titre}** — ${s.studio} · ${s.annee} · ${s.age} · ${s.genre}`).join('\n');
      await interaction.editReply(`📋 **Séries sur Cynbom :**\n${liste}`);
    }

  } catch (err) {
    console.error(err);
    await interaction.editReply('❌ Erreur de connexion avec l\'API.');
  }
});

client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);

  // Backup automatique toutes les 24h
  async function envoyerBackup() {
    try {
      const series = await fetch('http://localhost:' + (process.env.PORT || 3000) + '/series').then(r => r.json());
      const episodes = {};
      for (const s of series) {
        const eps = await fetch('http://localhost:' + (process.env.PORT || 3000) + '/series/' + encodeURIComponent(s.titre) + '/episodes').then(r => r.json());
        if (eps.length > 0) episodes[s.titre] = eps;
      }
      const backup = JSON.stringify({ series, episodes }, null, 2);
      const date = new Date().toLocaleDateString('fr-FR');
      const channel = await client.channels.fetch('1502237956163895307');
      await channel.send({
        content: `📦 **Backup automatique Cynbom** — ${date}`,
        files: [{ attachment: Buffer.from(backup), name: `cynbom-backup-${date.replace(/\//g, '-')}.json` }]
      });
      console.log('Backup envoyé sur Discord');
    } catch(e) {
      console.error('Erreur backup:', e);
    }
  }

  // Backup immédiat au démarrage + toutes les 24h
  setTimeout(envoyerBackup, 10000);
  setInterval(envoyerBackup, 24 * 60 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
