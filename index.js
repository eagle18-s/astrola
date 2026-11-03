const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const path = require('path');

// 1. EXPRESS WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[SERVER]: Veb Sayt ${PORT} portunda aktivdir.`);
});

// 2. DISCORD BOT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// SLASH COMMANDS DEFINITION
const commands = [
    new SlashCommandBuilder()
        .setName('moderasiya')
        .setDescription('Estetik Moderasiya Panelini Açar'),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Çatdakı mesajları silər')
        .addIntegerOption(opt => opt.setName('say').setDescription('Silinəcək mesaj sayı').setRequired(true))
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
        console.log('[BOT]: Slash komandaları uğurla yükləndi.');
    } catch (error) {
        console.error(error);
    }
});

// INTERACTION HANDLING
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'moderasiya') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ ASPROL Moderasiya Paneli')
                .setDescription('Aşağıdakı menudan icra etmək istədiyiniz əməliyyatı seçin və ya butonlardan istifadə edin.')
                .setColor('#5865F2')
                .setFooter({ text: 'ASPROL System • Estetik Moderasiya', iconURL: client.user.displayAvatarURL() });

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('mod_select')
                    .setPlaceholder('Əməliyyat Seçin...')
                    .addOptions([
                        { label: 'İstifadəçi Məlumatı', value: 'user_info', description: 'İstifadəçinin profili haqqında' },
                        { label: 'Server Məlumatı', value: 'server_info', description: 'Server haqqında statistikalar' }
                    ])
            );

            const rowButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_warn').setLabel('Xəbərdarlıq').setStyle(ButtonStyle.Warning),
                new ButtonBuilder().setCustomId('btn_clear').setLabel('Mesaj Sil').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_help').setLabel('Kömək').setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [rowSelect, rowButtons] });
        }

        if (interaction.commandName === 'clear') {
            const amount = interaction.options.getInteger('say');
            if (amount < 1 || amount > 100) {
                const errEmbed = new EmbedBuilder()
                    .setTitle('❌ Xəta')
                    .setDescription('1 ilə 100 arasında bir rəqəm daxil edin!')
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }

            await interaction.channel.bulkDelete(amount, true);
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Uğurlu')
                .setDescription(`Uğurla **${amount}** mesaj silindi.`)
                .setColor('#00FF88');
            
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }
    }

    // BUTTON & MENU RESPONSES
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_help') {
            const helpEmbed = new EmbedBuilder()
                .setTitle('ℹ️ Kömək Paneli')
                .setDescription('Bütün komandalar `/` (Slash) sistemi ilə çalışır.\nYeni əmrlər daxil etmək üçün geliştirici paneldən tənzimləyin.')
                .setColor('#00F2FE');
            await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
