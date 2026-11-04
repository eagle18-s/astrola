const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
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

// DM-də !EMBED ƏMRİ VƏ ŞİFRƏ YOXLAMASI
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Ancaq DM-də (message.guild yoxdursa) işləyir
    if (!message.guild && message.content === '!embed') {
        await message.reply('🔐 Botun gizli kodunu daxil edin:');

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async m => {
            if (m.content === 'qaqa1212A') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('open_embed_modal')
                        .setLabel('✨ Embed Hazırla')
                        .setStyle(ButtonStyle.Primary)
                );
                await m.reply({ content: '✅ Kod doğrudur! Aşağıdakı düyməyə basaraq embed yarada bilərsiniz:', components: [row] });
            } else {
                await m.reply('❌ Yanlış kod!');
            }
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    // 1. DÜYMƏYƏ BASILANDA MODAL (MENYU) AÇILMASI
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

    // 2. MODAL GÖNDƏRİLƏNDƏ KANALA EMBEDİN ATILMASI
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
            
