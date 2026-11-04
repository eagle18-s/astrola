const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

// 1. AÇARI BİRBAŞA KODA DAXİL EDİRİK
const GROQ_API_KEY = "Gsk_F2Ix4eg42uyxM7GEiaoDWGdyb3FY7Hg5VyDStED7bQkcUC1V6g2O";

// 2. EXPRESS WEB SERVER
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

// 3. DISCORD BOT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Admin şifrəsi ilə xüsusi embed yaradıcı paneli açar')
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

// GROQ AI FETCH FUNKSİYASI
async function askGroq(promptText) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [
                    { role: 'system', content: 'Sən ASPROL adlı mehriban və ağıllı Discord köməkçisisən. Qısa və azərbaycanca cavablar ver.' },
                    { role: 'user', content: promptText }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.error('Groq Fetch Xətası:', err);
        return null;
    }
}

// BOTU ETİKəTLƏYƏndə SÖHBƏT ETMƏK
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isMentioned = message.mentions.has(client.user.id);
    if (!isMentioned) return;

    const cleanContent = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
    if (!cleanContent) return;

    try {
        const aiReply = await askGroq(cleanContent);
        if (aiReply) {
            await message.reply(aiReply);
        } else {
            await message.reply('❌ Süni intellekt cavab verə bilmədi.');
        }
    } catch (err) {
        console.error('Mesaj xətası:', err);
        await message.reply('❌ Xəta baş verdi.');
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'open_embed_modal') {
        const modal = new ModalBuilder()
            .setCustomId('embed_creator_modal')
            .setTitle('Estetik Embed Hazırlayıcı');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Başlığı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('embed_desc')
            .setLabel('Embed Mətni (Description)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const serverIdInput = new TextInputBuilder()
            .setCustomId('server_id')
            .setLabel('Server ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const channelIdInput = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('Kanal ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(serverIdInput),
            new ActionRowBuilder().addComponents(channelIdInput)
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'embed_creator_modal') {
        const title = interaction.fields.getTextInputValue('embed_title');
        const desc = interaction.fields.getTextInputValue('embed_desc');
        const serverId = interaction.fields.getTextInputValue('server_id');
        const channelId = interaction.fields.getTextInputValue('channel_id');

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = await client.guilds.fetch(serverId);
            if (!guild) return interaction.editReply({ content: '❌ Bot bu Server ID-sini tapa bilmədi!' });

            const channel = await guild.channels.fetch(channelId);
            if (!channel) return interaction.editReply({ content: '❌ Bu Serverdə belə bir Kanal ID tapılmadı!' });

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(desc)
                .setColor('#00F2FE')
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Embed uğurla <#${channelId}> kanalına göndərildi!` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Xəta baş verdi! ID-lərin düzgün olduğundan və botun həmin serverdə olduğundan əmin olun.' });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild } = interaction;

    try {
        if (commandName === 'moderasiya') {
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setTitle('🛡️ ASPROL Pro Moderasiya Paneli').setDescription('Menudan əməliyyat seçin.').setColor('#5865F2')],
                ephemeral: true 
            });
        }
        else if (commandName === 'embed') {
            await interaction.reply({ content: '🔐 Zəhmət olmasa çata botun gizli kodunu yazın (30 saniyəniz var):', ephemeral: true });

            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async m => {
                try { await m.delete(); } catch(e) {}

                if (m.content === 'qaqa1212A') {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('open_embed_modal')
                            .setLabel('✨ Embed Hazırla')
                            .setStyle(ButtonStyle.Primary)
                    );
                    await interaction.followUp({ content: '✅ Kod doğrudur! Aşağıdakı düyməyə basaraq panel açın:', components: [row], ephemeral: true });
                } else {
                    await interaction.followUp({ content: '❌ Yanlış kod!', ephemeral: true });
                }
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
            const config = settings[guild.id] || Object.values(settings)[0];

            if (!config || !config.logChannelId) {
                return interaction.editReply({ content: '❌ `id.json` faylında heç bir log kanalı tapılmadı!' });
            }

            let roleText = 'Təyin olunmayıb';
            if (config.autoRoleId) {
                const role = guild.roles.cache.get(config.autoRoleId);
                roleText = role ? `<@&${config.autoRoleId}>` : 'ID qeyd olunub';
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 ASPROL JSON Yoxlama Sorğusu')
                .addFields({ name: '⚙️ Oto-Rol', value: roleText, inline: true })
                .setColor('#10B981');

            const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
            if (channel) {
                await channel.send({ embeds: [embed] });
                await interaction.editReply({ content: `✅ Log göndərildi!` });
            } else {
                await interaction.editReply({ content: `⚠️ Kanal tapılmadı!` });
            }
        }
    } catch (err) {
        console.error('Komanda xətası:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
                
