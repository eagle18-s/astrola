const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

// 1. EXPRESS WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

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

// id.json faylından oxumaq üçün funksiya
function getSettings() {
    const settingsPath = path.join(__dirname, 'id.json');
    if (!fs.existsSync(settingsPath)) return {};
    try {
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
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
        .setName('logyoxla')
        .setDescription('Botun yaddaşdakı tənzimləmələrini yoxlayır')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`[BOT]: ${client.user.tag} adı ilə giriş edildi!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('[BOT]: Slash komandaları yükləndi.');
    } catch (error) { console.error(error); }

    // BOT RESTART OLANDA ID.JSON-DAN OXUYUB LOG KANALINA XATIRLATMA GÖNDƏRMƏSİ
    setTimeout(async () => {
        try {
            const settings = getSettings();
            for (const [guildId, config] of Object.entries(settings)) {
                if (config.logChannelId) {
                    try {
                        const guild = await client.guilds.fetch(guildId).catch(() => null);
                        if (!guild) continue;
                        const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
                        if (channel) {
                            let roleText = 'Təyin olunmayıb';
                            if (config.autoRoleId) {
                                const role = guild.roles.cache.get(config.autoRoleId);
                                roleText = role ? `<@&${config.autoRoleId}>` : 'ID qeyd olunub';
                            }

                            const embed = new EmbedBuilder()
                                .setTitle('🤖 ASPROL Bot Yenidən Başladı!')
                                .setDescription('id.json faylından tənzimləmələrim uğurla yükləndi:')
                                .addFields(
                                    { name: '⚙️ Aktiv Oto-Rol', value: roleText, inline: true },
                                    { name: '🛡️ Status', value: 'Sabit fayldan oxudum, heç vaxt silinməz! 👍', inline: true }
                                )
                                .setColor('#00F2FE')
                                .setTimestamp();
                            
                            await channel.send({ embeds: [embed] });
                        }
                    } catch (err) {
                        console.error('Log kanalına mesaj atıla bilmədi:', err);
                    }
                }
            }
        } catch (e) { console.error('Restart log xətası:', e); }
    }, 4000);
});

// OTO-ROL EVENT
client.on('guildMemberAdd', async (member) => {
    try {
        const settings = getSettings();
        const config = settings[member.guild.id] || Object.values(settings)[0];
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
        else if (commandName === 'logyoxla') {
            await interaction.deferReply({ ephemeral: true });
            
            const settings = getSettings();
            // Əgər guild.id tapılmasa, birbaşa id.json-dakı ilk konfiqurasiyanı götürür
            const config = settings[guild.id] || Object.values(settings)[0];

            if (!config || !config.logChannelId) {
                return interaction.editReply({ content: '❌ `id.json` faylında heç bir log kanalı tapılmadı!' });
            }

            let roleText = 'Təyin olunmayıb';
            if (config.autoRoleId) {
                const role = guild.roles.cache.get(config.autoRoleId);
                roleText = role ? `<@&${config.autoRoleId}>` : 'ID qeyd olunub (Rol tapılmadı)';
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 ASPROL JSON Yoxlama Sorğusu')
                .setDescription('id.json faylından oxunan cari məlumatlarım:')
                .addFields(
                    { name: '⚙️ Fayldakı Oto-Rol', value: roleText, inline: true },
                    { name: '🛡️ Status', value: 'Həmişə yerindədir! 👍', inline: true }
                )
                .setColor('#10B981')
                .setTimestamp();

            const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
            if (channel) {
                await channel.send({ embeds: [embed] });
                await interaction.editReply({ content: `✅ Məlumatlar id.json faylından oxunub ${channel} kanalına göndərildi!` });
            } else {
                await interaction.editReply({ content: `⚠️ Məlumatlar fayldadır, lakin təyin olunan log kanalı tapılmadı!` });
            }
        }
    } catch (err) {
        console.error('Komanda xətası:', err);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: `❌ Xəta baş verdi.` }).catch(() => {});
        } else {
            await interaction.reply({ content: `❌ Xəta baş verdi.`, ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                                                                    
