const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

// 1. EXPRESS WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;

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

// JSON File Helper for Auto-Role persistence
const rolesFile = path.join(__dirname, 'roles.json');

function getSavedRoles() {
    if (!fs.existsSync(rolesFile)) {
        fs.writeFileSync(rolesFile, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(rolesFile, 'utf8'));
}

function saveRole(guildId, roleId) {
    const data = getSavedRoles();
    data[guildId] = roleId;
    fs.writeFileSync(rolesFile, JSON.stringify(data, null, 2));
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
    const saved = getSavedRoles();
    const roleId = saved[member.guild.id];
    if (!roleId) return;

    try {
        const role = member.guild.roles.cache.get(roleId);
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
        saveRole(guild.id, role.id);
        const embed = new EmbedBuilder().setTitle('⚙️ Oto-Rol Təyin Olundu').setDescription(`Yeni gələnlərə **${role.name}** veriləcək.`).setColor('#10B981');
        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
           
