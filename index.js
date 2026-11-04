const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelType
} = require('discord.js');
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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('sorğu')
        .setDescription('Sürətli səsvermə embedi yaradar')
        .addStringOption(opt => opt.setName('movzu').setDescription('Səsvermə mövzusu').setRequired(true)),
    new SlashCommandBuilder()
        .setName('dəstək')
        .setDescription('Dəstək (Ticket) panelini göndərər')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`[BOT]: ${client.user.tag} adı ilə giriş edildi!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('[BOT]: Köhnə komandalar təmizlənir...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });

        console.log('[BOT]: Yeni komandalar qlobal olaraq qeydiyyatdan keçirilir...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        
        console.log('[BOT]: Slash komandaları uğurla yeniləndi!');
    } catch (error) { 
        console.error('Komanda yükləmə xətası:', error); 
    }
});

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
    // 1. TICKET YARATMA DÜYMƏSİ
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        const ticketChannelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');

        const existingChannel = interaction.guild.channels.cache.find(c => c.name === ticketChannelName);
        if (existingChannel) {
            return interaction.reply({ content: `❌ Sizin artıq açıq bir dəstək kanalınız var: ${existingChannel}`, ephemeral: true });
        }

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: ticketChannelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                    }
                ]
            });

            const embed = new EmbedBuilder()
                .setTitle('📩 ASPROL Dəstək Mərkəzi')
                .setDescription(`Xoş gəldiniz <@${interaction.user.id}>!\nZəhmət olmasa probleminizi və ya sualınızı ətraflı yazın. Adminlərimiz tezliklə cavab verəcək.`)
                .setColor('#00F2FE')
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Ticket-i Bağla')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Dəstək kanalınız yaradıldı: ${ticketChannel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ Ticket kanalı yaradılarkən xəta baş verdi!', ephemeral: true });
        }
    }

    // 2. TICKET BAĞLAMA DÜYMƏSİ
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 Bu dəstək kanalı 5 saniyə sonra silinəcək...');
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.error('Kanal silinmə xətası:', err);
            }
        }, 5000);
    }

    // 3. EMBED MODAL
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
            await interaction.editReply({ content: '❌ Xəta baş verdi! ID-lərin düzgün olduğundan əmin olun.' });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild } = interaction;

    try {
        if (commandName === 'dəstək') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 ASPROL Dəstək Sistemi')
                .setDescription('Komandamızla əlaqə saxlamaq üçün aşağıdakı düyməyə basaraq özünüzə özəl **Dəstək (Ticket)** açın.')
                .setColor('#5865F2');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('📩 Ticket Aç')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
        else if (commandName === 'sorğu') {
            const topic = options.getString('movzu');
            const embed = new EmbedBuilder()
                .setTitle('📊 Yeni Səsvermə')
                .setDescription(topic)
                .setColor('#F1C40F')
                .setFooter({ text: `Səsverməni başladı: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ content: '✅ Səsvermə başladıldı!', ephemeral: true });
            const pollMessage = await interaction.channel.send({ embeds: [embed] });
            await pollMessage.react('👍');
            await pollMessage.react('👎');
        }
        else if (commandName === 'moderasiya') {
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

            const embed = new EmbedBuilder()
                .setTitle('🔍 ASPROL JSON Yoxlama Sorğusu')
                .setDescription('id.json faylından oxunan tənzimləmələr uğurla işləyir! 👍')
                .setColor('#10B981')
                .setTimestamp();

            const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
            if (channel) {
                await channel.send({ embeds: [embed] });
                await interaction.editReply({ content: `✅ Log kanala göndərildi!` });
            } else {
                await interaction.editReply({ content: `⚠️ Log kanalı tapılmadı!` });
            }
        }
    } catch (err) {
        console.error('Komanda xətası:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
                
