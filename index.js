const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

// 1. EXPRESS WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Leaderboard JSON API
const lbFile = path.join(__dirname, 'leaderboard.json');

function getLeaderboard() {
    if (!fs.existsSync(lbFile)) {
        fs.writeFileSync(lbFile, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(lbFile, 'utf8'));
}

app.get('/api/leaderboard', (req, res) => {
    res.json(getLeaderboard());
});

app.post('/api/leaderboard', (req, res) => {
    const { name, img, score } = req.body;
    if (!name || !score) return res.status(400).send('Məlumat əksikdir');
    
    let list = getLeaderboard();
    list.push({ name, img, score });
    fs.writeFileSync(lbFile, JSON.stringify(list, null, 2));
    res.status(200).send('Əlavə olundu');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[SERVER]: Veb Sayt ${PORT} portunda aktivdir.`);
});

// 2. DISCORD BOT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Settings JSON (Oto-rol və Log kanalı üçün)
const settingsFile = path.join(__dirname, 'settings.json');

function getSettings() {
    if (!fs.existsSync(settingsFile)) {
        fs.writeFileSync(settingsFile, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
}

function saveSettings(data) {
    fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2));
}

// SLASH COMMANDS DEFINITION
const commands = [
    new SlashCommandBuilder().setName('moderasiya').setDescription('Estetik Moderasiya Panelini Açar'),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Çatdakı mesajları silər')
        .addIntegerOption(opt => opt.setName('say').setDescription('Silinəcək mesaj sayı').setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('İstifadəçini sunucudan ban edər')
        .addUserOption(opt => opt.setName('istifadeci').setDescription('İstifadəçi').setRequired(true))
        .addStringOption(opt => opt.setName('sebeb').setDescription('Səbəb'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('İstifadəçini sunucudan atar')
        .addUserOption(opt => opt.setName('istifadeci').setDescription('İstifadəçi').setRequired(true))
        .addStringOption(opt => opt.setName('sebeb').setDescription('Səbəb'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('İstifadəçinin profil şəklini göstərər')
        .addUserOption(opt => opt.setName('istifadeci').setDescription('İstifadəçi')),
    new SlashCommandBuilder()
        .setName('oto-rol')
        .setDescription('Yeni gələn hər kəsə veriləcək rolu təyin edər')
        .addRoleOption(opt => opt.setName('rol').setDescription('Rol').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('log')
        .setDescription('Botun bildirişləri atacağı log kanalını təyin edər')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Log kanalı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('logyoxla')
        .setDescription('Botun yaddaşdakı oto-rol və log məlumatlarını yoxlayır')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`[BOT]: ${client.user.tag} adı ilə giriş edildi!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('[BOT]: Slash komandaları yükləndi.');
    } catch (error) { console.error(error); }

    // BOT RESTART OLANDA TƏYİN OLUNMUŞ LOG KANALINA XATIRLATMA GÖNDƏRMƏSİ
    const settings = getSettings();
    for (const [guildId, config] of Object.entries(settings)) {
        if (config.logChannelId) {
            try {
                const guild = await client.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(config.logChannelId);
                if (channel) {
                    let roleText = 'Təyin olunmayıb';
                    if (config.autoRoleId) {
                        const role = guild.roles.cache.get(config.autoRoleId);
                        roleText = role ? `<@&${config.autoRoleId}>` : 'ID qeyd olunub';
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('🤖 ASPROL Bot Yenidən Başladı!')
                        .setDescription('Sistemlər uğurla işə düşdü. Yaddaşda saxlanılan cari tənzimləmələrimiz:')
                        .addFields(
                            { name: '⚙️ Aktiv Oto-Rol', value: roleText, inline: true },
                            { name: '🛡️ Status', value: 'Hər şey nəzarət altındadır, unutmamışam! 👍', inline: true }
                        )
                        .setColor('#00F2FE')
                        .setTimestamp();
                    
                    await channel.send({ embeds: [embed] });
                }
            } catch (err) {
                console.error(`Log kanalına mesaj göndərilə bilmədi (${guildId}):`, err);
            }
        }
    }
});

// OTO-ROL EVENT
client.on('guildMemberAdd', async (member) => {
    const settings = getSettings();
    const config = settings[member.guild.id];
    if (!config || !config.autoRoleId) return;

    try {
        const role = member.guild.roles.cache.get(config.autoRoleId);
        if (role) await member.roles.add(role);
    } catch (err) { console.error(err); }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild } = interaction;

    if (commandName === 'moderasiya') {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ ASPROL Pro Moderasiya Paneli')
            .setDescription('Menudan əməliyyat seçin.')
            .setColor('#5865F2');
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'clear') {
        const amount = options.getInteger('say');
        await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({ content: `Uğurla ${amount} mesaj silindi.`, ephemeral: true });
    }
    else if (commandName === 'ban') {
        const user = options.getUser('istifadeci');
        await guild.members.ban(user);
        await interaction.reply(`🔨 ${user.tag} ban olundu.`);
    }
    else if (commandName === 'kick') {
        const user = options.getUser('istifadeci');
        await guild.members.kick(user);
        await interaction.reply(`👢 ${user.tag} atıldı.`);
    }
    else if (commandName === 'avatar') {
        const user = options.getUser('istifadeci') || interaction.user;
        const embed = new EmbedBuilder().setTitle(`🖼️ ${user.username}`).setImage(user.displayAvatarURL({ size: 1024 }));
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'oto-rol') {
        const role = options.getRole('rol');
        let settings = getSettings();
        if (!settings[guild.id]) settings[guild.id] = {};
        settings[guild.id].autoRoleId = role.id;
        saveSettings(settings);

        const embed = new EmbedBuilder().setTitle('⚙️ Oto-Rol Təyin Olundu').setDescription(`Yeni gələnlərə avtomatik olaraq **${role.name}** veriləcək.`).setColor('#10B981');
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'log') {
        const channel = options.getChannel('kanal');
        let settings = getSettings();
        if (!settings[guild.id]) settings[guild.id] = {};
        settings[guild.id].logChannelId = channel.id;
        saveSettings(settings);

        const embed = new EmbedBuilder().setTitle('📝 Log Kanalı Təyin Olundu').setDescription(`Bot xatırlatmaları ${channel} kanalına göndərəcək.`).setColor('#5865F2');
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'logyoxla') {
        const settings = getSettings();
        const config = settings[guild.id];

        if (!config || !config.logChannelId) {
            return interaction.reply({ content: '❌ Hələ heç bir log kanalı təyin olunmayıb! Əvvəlcə `/log #kanal` yazın.', ephemeral: true });
        }

        const channel = guild.channels.cache.get(config.logChannelId);
        if (!channel) {
            return interaction.reply({ content: '❌ Əvvəl təyin olunan log kanalı tapılmadı (silinmiş ola bilər).', ephemeral: true });
        }

        let roleText = 'Təyin olunmayıb';
        if (config.autoRoleId) {
            const role = guild.roles.cache.get(config.autoRoleId);
            roleText = role ? `<@&${config.autoRoleId}>` : 'ID qeyd olunub';
        }

        const embed = new EmbedBuilder()
            .setTitle('🔍 ASPROL Log Yoxlama Sorğusu')
            .setDescription('Yaddaşda saxlanılan cari məlumatlarım tamamilə yerindədir:')
            .addFields(
                { name: '⚙️ Yaddaşdakı Oto-Rol', value: roleText, inline: true },
                { name: '🛡️ Status', value: 'Unutmamışam, hər şey yadımadadır! 👍', inline: true }
            )
            .setColor('#10B981')
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Məlumatlar uğurla ${channel} kanalına göndərildi!`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
    
