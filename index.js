const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const path = require('path');

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

// Oto-rol yaddaşı (Server ID -> Rol ID)
const autoRoles = new Map();

// SLASH COMMANDS DEFINITION
const commands = [
    new SlashCommandBuilder()
        .setName('moderasiya')
        .setDescription('Estetik Moderasiya Panelini Açar'),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Çatdakı mesajları silər')
        .addIntegerOption(opt => opt.setName('say').setDescription('Silinəcək mesaj sayı (1-100)').setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('İstifadəçini sunucudan ban edər')
        .addUserOption(opt => opt.setName('istifadeci').setDescription('Ban ediləcək istifadəçi').setRequired(true))
        .addStringOption(opt => opt.setName('sebeb').setDescription('Ban səbəbi'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('İstifadəçini sunucudan atar')
        .addUserOption(opt => opt.setName('istifadeci').setDescription('Atılacaq istifadəçi').setRequired(true))
        .addStringOption(opt => opt.setName('sebeb').setDescription('Atılma səbəbi'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('İstifadəçinin profil şəklini göstərər')
        .addUserOption(opt => opt.setName('istifadeci').setDescription('Şəkli baxılacaq istifadəçi')),
    new SlashCommandBuilder()
        .setName('oto-rol')
        .setDescription('Yeni gələn hər kəsə avtomatik veriləcək rolu təyin edər')
        .addRoleOption(opt => opt.setName('rol').setDescription('Veriləcək rol').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

// REGISTER COMMANDS ON READY
client.once('ready', async () => {
    console.log(`[BOT]: ${client.user.tag} adı ilə giriş edildi!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('[BOT]: Bütün Slash komandaları uğurla yükləndi.');
    } catch (error) {
        console.error(error);
    }
});

// OTO-ROL EVENT (Yeni üzv qoşulduqda)
client.on('guildMemberAdd', async (member) => {
    const roleId = autoRoles.get(member.guild.id);
    if (!roleId) return;

    try {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            await member.roles.add(role);
            console.log(`[OTO-ROL]: ${member.user.tag} istifadəçisinə ${role.name} rolu verildi.`);
        }
    } catch (err) {
        console.error('Oto-rol verilməsində xəta:', err);
    }
});

// INTERACTION HANDLING
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild } = interaction;

        if (commandName === 'moderasiya') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ ASPROL Pro Moderasiya Paneli')
                .setDescription('Aşağıdakı menudan əməliyyat seçin və ya butonlardan istifadə edin.')
                .setColor('#5865F2')
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: 'ASPROL System • Estetik Təhlükəsizlik', iconURL: client.user.displayAvatarURL() });

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('mod_select')
                    .setPlaceholder('Əməliyyat Kateqoriyası...')
                    .addOptions([
                        { label: 'İstifadəçi Məlumatı', value: 'user_info', description: 'Profil detalları' },
                        { label: 'Server Məlumatı', value: 'server_info', description: 'Server statistikaları' }
                    ])
            );

            const rowButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_warn').setLabel('Xəbərdarlıq').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_help').setLabel('Kömək & Məlumat').setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [rowSelect, rowButtons] });
        }

        else if (commandName === 'clear') {
            const amount = options.getInteger('say');
            if (amount < 1 || amount > 100) {
                const errEmbed = new EmbedBuilder().setTitle('❌ Xəta').setDescription('Zəhmət olmasa **1 ilə 100** arasında rəqəm daxil edin!').setColor('#EF4444');
                return interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }

            await interaction.channel.bulkDelete(amount, true);
            const successEmbed = new EmbedBuilder().setTitle('✅ Uğurlu Təmizləmə').setDescription(`Söhbətdən **${amount}** mesaj silindi.`).setColor('#10B981');
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }

        else if (commandName === 'ban') {
            const user = options.getUser('istifadeci');
            const reason = options.getString('sebeb') || 'Səbəb göstərilməyib';
            const member = await guild.members.fetch(user.id).catch(() => null);

            if (!member) {
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Xəta').setDescription('İstifadəçi tapılmadı!').setColor('#EF4444')], ephemeral: true });
            }

            await member.ban({ reason });
            const banEmbed = new EmbedBuilder()
                .setTitle('🔨 İstifadəçi Ban Olundu')
                .setDescription(`**${user.tag}** sunucudan uzaqlaşdırıldı.`)
                .addFields({ name: 'Səbəb', value: reason })
                .setColor('#EF4444');
            await interaction.reply({ embeds: [banEmbed] });
        }

        else if (commandName === 'kick') {
            const user = options.getUser('istifadeci');
            const reason = options.getString('sebeb') || 'Səbəb göstərilməyib';
            const member = await guild.members.fetch(user.id).catch(() => null);

            if (!member) {
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Xəta').setDescription('İstifadəçi tapılmadı!').setColor('#EF4444')], ephemeral: true });
            }

            await member.kick(reason);
            const kickEmbed = new EmbedBuilder()
                .setTitle('👢 İstifadəçi Atıldı (Kick)')
                .setDescription(`**${user.tag}** sunucudan atıldı.`)
                .addFields({ name: 'Səbəb', value: reason })
                .setColor('#F59E0B');
            await interaction.reply({ embeds: [kickEmbed] });
        }

        else if (commandName === 'avatar') {
            const user = options.getUser('istifadeci') || interaction.user;
            const avatarEmbed = new EmbedBuilder()
                .setTitle(`🖼️ ${user.username} - Profil Şəkli`)
                .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
                .setColor('#00F2FE');
            await interaction.reply({ embeds: [avatarEmbed] });
        }

        else if (commandName === 'oto-rol') {
            const role = options.getRole('rol');
            autoRoles.set(guild.id, role.id);

            const roleEmbed = new EmbedBuilder()
                .setTitle('⚙️ Oto-Rol Təyin Olundu')
                .setDescription(`Bundan sonra yeni qoşulan hər kəsə avtomatik olaraq **${role.name}** rolu veriləcək!`)
                .setColor('#10B981');
            await interaction.reply({ embeds: [roleEmbed] });
        }
    }

    // BUTTON RESPONSES
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_help') {
            const helpEmbed = new EmbedBuilder()
                .setTitle('ℹ️ ASPROL Kömək Mərkəzi')
                .setDescription('Bütün moderasiya əmrləri `/` (Slash) vasitəsilə işləyir.\nƏmrlər: `/clear`, `/ban`, `/kick`, `/avatar`, `/oto-rol`')
                .setColor('#00F2FE');
            await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
