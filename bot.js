require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const API = `http://localhost:${process.env.PORT || 3000}`;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Définition des commandes slash
const commands = [
  new SlashCommandBuilder()
    .setName('ajouter-serie')
    .setDescription('Ajouter une série au site')
    .addStringOption(o => o.setName('titre').setDescription('Titre de la série').setRequired(true))
    .addStringOption(o => o.setName('studio').setDescription('Studio').setRequired(true))
    .addIntegerOption(o => o.setName('annee').setDescription('Année de sortie').setRequired(true))
    .addStringOption(o => o.setName('age').setDescription('Classification âge (ex: 13+)').setRequired(true))
    .addStringOption(o => o.setName('genre').setDescription('Genre (ex: SF, Comédie...)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('supprimer-serie')
    .setDescription('Supprimer une série du site')
    .addStringOption(o => o.setName('titre').setDescription('Titre exact de la série').setRequired(true)),

  new SlashCommandBuilder()
    .setName('modifier-serie')
    .setDescription('Modifier une info d\'une série')
    .addStringOption(o => o.setName('titre').setDescription('Titre exact de la série').setRequired(true))
    .addStringOption(o => o.setName('champ').setDescription('Champ à modifier').setRequired(true)
      .addChoices(
        { name: 'Titre', value: 'titre' },
        { name: 'Studio', value: 'studio' },
        { name: 'Année', value: 'annee' },
        { name: 'Âge', value: 'age' },
        { name: 'Genre', value: 'genre' },
      ))
    .addStringOption(o => o.setName('valeur').setDescription('Nouvelle valeur').setRequired(true)),

  new SlashCommandBuilder()
    .setName('vedette')
    .setDescription('Mettre une série en vedette sur le site')
    .addStringOption(o => o.setName('titre').setDescription('Titre exact de la série').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ajouter-episode')
    .setDescription('Ajouter un épisode à une série')
    .addStringOption(o => o.setName('serie').setDescription('Titre exact de la série').setRequired(true))
    .addIntegerOption(o => o.setName('saison').setDescription('Numéro de saison').setRequired(true))
    .addIntegerOption(o => o.setName('numero').setDescription('Numéro d\'épisode').setRequired(true))
    .addStringOption(o => o.setName('titre').setDescription('Titre de l\'épisode').setRequired(false)),

  new SlashCommandBuilder()
    .setName('retirer-episode')
    .setDescription('Retirer un épisode d\'une série')
    .addStringOption(o => o.setName('serie').setDescription('Titre exact de la série').setRequired(true))
    .addIntegerOption(o => o.setName('saison').setDescription('Numéro de saison').setRequired(true))
    .addIntegerOption(o => o.setName('numero').setDescription('Numéro d\'épisode').setRequired(true)),

  new SlashCommandBuilder()
    .setName('liste-series')
    .setDescription('Voir toutes les séries du site'),
].map(c => c.toJSON());

// Enregistrement des commandes
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), { body: commands })
  .then(() => console.log('Commandes slash enregistrées'))
  .catch(console.error);

// Gestion des interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ ephemeral: true });

  const { commandName } = interaction;

  try {
    if (commandName === 'ajouter-serie') {
      const body = {
        titre: interaction.options.getString('titre'),
        studio: interaction.options.getString('studio'),
        annee: interaction.options.getInteger('annee'),
        age: interaction.options.getString('age'),
        genre: interaction.options.getString('genre'),
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
      await interaction.editReply(data.success ? `✏️ **${titre}** — ${champ} mis à jour : **${valeur}**` : `❌ Série introuvable.`);
    }

    else if (commandName === 'vedette') {
      const titre = interaction.options.getString('titre');
      const res = await fetch(`${API}/series/${encodeURIComponent(titre)}/vedette`, { method: 'POST' });
      const data = await res.json();
      await interaction.editReply(data.success ? `⭐ **${titre}** est maintenant en vedette.` : `❌ Série introuvable.`);
    }

    else if (commandName === 'ajouter-episode') {
      const serie = interaction.options.getString('serie');
      const saison = interaction.options.getInteger('saison');
      const numero = interaction.options.getInteger('numero');
      const titre = interaction.options.getString('titre') || null;
      const res = await fetch(`${API}/series/${encodeURIComponent(serie)}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saison, numero, titre }),
      });
      const data = await res.json();
      await interaction.editReply(data.success ? `✅ Épisode S${saison}E${numero} ajouté à **${serie}**.` : `❌ Série introuvable.`);
    }

    else if (commandName === 'retirer-episode') {
      const serie = interaction.options.getString('serie');
      const saison = interaction.options.getInteger('saison');
      const numero = interaction.options.getInteger('numero');
      const res = await fetch(`${API}/series/${encodeURIComponent(serie)}/episodes/${saison}/${numero}`, { method: 'DELETE' });
      const data = await res.json();
      await interaction.editReply(data.success ? `🗑️ Épisode S${saison}E${numero} retiré de **${serie}**.` : `❌ Épisode introuvable.`);
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

client.once('ready', () => console.log(`Bot connecté en tant que ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);
