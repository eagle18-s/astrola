const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

// 1. MONGODB CONNECTION
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 }).then(() => {
        console.log('[DATABASE]: MongoDB bulud bazasına uğurla qoşuldu!');
    }).catch(err => {
        console.error('[DATABASE ERROR]: Qoşulma xətası:', err);
    });
}

// Database Schemas
const settingSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    autoRoleId: String,
    logChannelId: String
});
const Setting = mongoose.model('Setting', settingSchema);

const leaderboardSchema = new mongoose.Schema({
    name: String,
    img: String,
    score: Number
});
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// 2. EXPRESS WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/leaderboard', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) return res.json([]);
        const list = await Leaderboard.find({});
        res.json(list);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/api/leaderboard', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) return res.status(500).send('Baza hələ hazır değil');
        const { name, img, score } = req.body;
        if (!name || !score) return res.status(400).send('Məlumat əksikdir');
        
        await Leaderboard.create({ name, img, score });
        res.status(200).send('Əlavə olundu');
    } catch (e) {
        res.status(500).send('Xəta');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[SERVER]: Veb Sayt ${PORT} portunda aktivdir.`);
});

// 3. DISCORD BOT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

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
});

// OTO-ROL EVENT
client.on('guildMemberAdd', async (member) => {
    try {
        if (mongoose.connection.readyState !== 1) return;
        const config = await Setting.findOne({ guildId: member.guild.id });
        if (!config || !config.autoRoleId) return;

        const role = member.guild.roles.cache.get(config.autoRoleId);
        if (role) await member.roles.add(role);
    } catch (err) { console.error('Oto-rol xətası:', err); }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild } = interaction;

    try {
        if (commandName === 'moderasiya') {
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setTitle('🛡️ ASPROL Pro Moderasiya Paneli').setDescription('Menudan əməliyyat seçin.').setColor('#5865F2')],
                ephemeral: true 
            });
        }
        else if (commandName === 'clear') {
            await interaction.deferReply({ ephemeral: true });
            const amount = options.getInteger('say');
            await interaction.channel.bulkDelete(amount, true);
            await interaction.editReply({ content: `Uğurla ${amount} mesaj silindi.` });
        }
        else if (commandName === 'ban') {
            await interaction.deferReply({ ephemeral: true });
            const user = options.getUser('istifadeci');
            await guild.members.ban(user);
            await interaction.editReply(`🔨 ${user.tag} ban olundu.`);
        }
        else if (commandName === 'kick') {
            await interaction.deferReply({ ephemeral: true });
            const user = options.getUser('istifadeci');
            await guild.members.kick(user);
            await interaction.editReply(`👢 ${user.tag} atıldı.`);
        }
        else if (commandName === 'avatar') {
            const user = options.getUser('istifadeci') || interaction.user;
            const embed = new EmbedBuilder().setTitle(`🖼️ ${user.username}`).setImage(user.displayAvatarURL({ size: 1024 }));
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        else if (commandName === 'oto-rol') {
            await interaction.deferReply({ ephemeral: true });
            if (mongoose.connection.readyState !== 1) {
                return interaction.editReply({ content: '⚠️ Verilənlər bazası hələ oyanır, zəhmət olmasa 5-10 saniyə sonra yenidən cəhd edin.' });
            }

            const role = options.getRole('rol');
            await Setting.findOneAndUpdate(
                { guildId: guild.id },
                { autoRoleId: role.id },
                { upsert: true, new: true }
            );

            const embed = new EmbedBuilder().setTitle('⚙️ Oto-Rol Təyin Olundu').setDescription(`Yeni gələnlərə avtomatik olaraq **${role.name}** veriləcək (Bazaya yazıldı).`).setColor('#10B981');
            await interaction.editReply({ embeds: [embed] });
        }
        else if (commandName === 'log') {
            await interaction.deferReply({ ephemeral: true });
            if (mongoose.connection.readyState !== 1) {
                return interaction.editReply({ content: '⚠️ Verilənlər bazası hələ oyanır, zəhmət olmasa 5-10 saniyə sonra yenidən cəhd edin.' });
            }

            const channel = options.getChannel('kanal');
            await Setting.findOneAndUpdate(
                { guildId: guild.id },
                { logChannelId: channel.id },
                { upsert: true, new: true }
            );

            const embed = new EmbedBuilder().setTitle('📝 Log Kanalı Təyin Olundu').setDescription(`Bot xatırlatmaları ${channel} kanalına göndərəcək (Bazaya yazıldı).`).setColor('#5865F2');
            await interaction.editReply({ embeds: [embed] });
        }
        else if (commandName === 'logyoxla') {
            await interaction.deferReply({ ephemeral: true });
            if (mongoose.connection.readyState !== 1) {
                return interaction.editReply({ content: '⚠️ Verilənlər bazası hələ oyanır, zəhmət olmasa 5-10 saniyə sonra yenidən cəhd edin.' });
            }
            
            const config = await Setting.findOne({ guildId: guild.id });
            if (!config || !config.logChannelId) {
                return interaction.editReply({ content: '❌ Hələ heç bir log kanalı təyin olunmayıb! Əvvəlcə `/log #kanal` yazın.' });
            }

            let roleText = 'Təyin olunmayıb';
            if (config.autoRoleId) {
                const role = guild.roles.cache.get(config.autoRoleId);
                roleText = role ? `<@&${config.autoRoleId}>` : 'ID qeyd olunub (Rol tapılmadı)';
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 ASPROL MongoDB Yoxlama Sorğusu')
                .setDescription('Bulud bazasından oxunan cari məlumatlarım:')
                .addFields(
                    { name: '⚙️ Bazadakı Oto-Rol', value: roleText, inline: true },
                    { name: '🛡️ Status', value: 'Buluddadırmı? Bəli, heç vaxt silinməz! 👍', inline: true }
                )
                .setColor('#10B981')
                .setTimestamp();

            const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
            if (channel) {
                await channel.send({ embeds: [embed] });
                await interaction.editReply({ content: `✅ Məlumatlar buluddan oxunub ${channel} kanalına göndərildi!` });
            } else {
                await interaction.editReply({ content: `⚠️ Məlumatlar bazadadır, lakin təyin olunan log kanalı tapılmadı!` });
            }
        }
    } catch (err) {
        console.error('Komanda xətası:', err);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: `❌ Xəta baş verdi: Baza ilə əlaqə gecikdi.` }).catch(() => {});
        } else {
            await interaction.reply({ content: `❌ Xəta baş verdi: Baza ilə əlaqə gecikdi.`, ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                       
