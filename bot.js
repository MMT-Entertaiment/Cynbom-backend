require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const API = 'https://cynbom-backend.onrender.com';
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
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
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), { body: commands })
  .then(() => console.log('Commandes slash enregistrées'))
  .catch(console.error);

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ ephemeral: true });

  const { commandName } = interaction;

  try {
    if (commandName === 'cree-backup') {
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
        
        if (comportement === 'ecraser') {
          const allSeries = await fetch(`${API}/series`).then(r => r.json());
          for (const s of allSeries) {
            await fetch(`${API}/series/${encodeURIComponent(s.titre)}`, { method: 'DELETE' });
          }
        }
        
        for (const s of backup.series) {
          await fetch(`${API}/series`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
          if (s.vedette) await fetch(`${API}/series/${encodeURIComponent(s.titre)}/vedette`, { method: 'POST' });
        }
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

  } catch (err) {
    console.error(err);
    await interaction.editReply('❌ Erreur de connexion avec l\'API.');
  }
});

client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);

  async function envoyerBackup() {
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
        content: `📦 **Backup automatique Cynbom** — ${date}`,
        files: [{ attachment: Buffer.from(backup), name: `cynbom-backup-${date.replace(/\//g, '-')}.json` }]
      });
      console.log('Backup envoyé sur Discord');
    } catch(e) {
      console.error('Erreur backup:', e);
    }
  }

  setTimeout(envoyerBackup, 10000);
  setInterval(envoyerBackup, 24 * 60 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
