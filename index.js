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
    console.log(`[SERVER]: Web Sunucusu ${PORT} portunda aktif.`);
});

// 2. DISCORD BOT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
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
    new SlashCommandBuilder().setName('moderasyon').setDescription('Estetik Moderasyon Panelini Açar'),
    new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Sohbetteki mesajları siler')
        .addIntegerOption(opt => opt.setName('sayi').setDescription('Silinecek mesaj sayısı').setRequired(true)),
    new SlashCommandBuilder()
        .setName('yasakla')
        .setDescription('Kullanıcıyı sunucudan yasaklar')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Sebep'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('at')
        .setDescription('Kullanıcıyı sunucudan atar')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Sebep'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Kullanıcının profil fotoğrafını gösterir')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı')),
    new SlashCommandBuilder()
        .setName('logkontrol')
        .setDescription('Botun bellekteki ayarlarını kontrol eder')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Admin şifresiyle özel embed oluşturucu paneli açar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('sorgu')
        .setDescription('Hızlı oylama embedi oluşturur')
        .addStringOption(opt => opt.setName('konu').setDescription('Oylama konusu').setRequired(true)),
    new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Evet / Hayır butonlu anket paneli gönderir')
        .addStringOption(opt => opt.setName('konu').setDescription('Anket konusu').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('destek')
        .setDescription('Destek (Ticket) panelini gönderir')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('yazitura')
        .setDescription('Yazı Tura atar'),
    new SlashCommandBuilder()
        .setName('zar')
        .setDescription('1 ile 6 arasında rastgele zar atar'),
    new SlashCommandBuilder()
        .setName('sunucubilgi')
        .setDescription('Sunucu hakkında detaylı bilgi gösterir'),
    new SlashCommandBuilder()
        .setName('kullanicibilgi')
        .setDescription('Kullanıcı hakkında detaylı bilgi gösterir')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı')),
    new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Botun tüm komutlarını listeler'),
    new SlashCommandBuilder()
        .setName('qoşul')
        .setDescription('Bulunduğun ses kanalına katılır')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`[BOT]: ${client.user.tag} olarak giriş yapıldı!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('[BOT]: Komutlar global olarak güncelleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('[BOT]: Slash komutları başarıyla güncellendi!');
    } catch (error) { 
        console.error('Komut yükleme hatası:', error); 
    }
});

// Otomatik Rol ve Loglama Sistemi
client.on('guildMemberAdd', async (member) => {
    try {
        const settings = getSettings();
        const config = settings[member.guild.id] || Object.values(settings)[0];
        if (!config) return;

        if (config.autoRoleId) {
            const role = member.guild.roles.cache.get(config.autoRoleId);
            if (role) await member.roles.add(role);
        }

        if (config.logChannelId) {
            const logChannel = member.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 Yeni Kullanıcı Katıldı')
                    .setDescription(`**${member.user.tag}** sunucuya giriş yaptı!`)
                    .setColor('#10B981')
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    } catch (err) { console.error('Oto-rol veya log hatası:', err); }
});
            client.on('interactionCreate', async (interaction) => {
    // 1. TICKET OLUŞTURMA BUTONU
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        const ticketChannelName = `destek-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');

        const existingChannel = interaction.guild.channels.cache.find(c => c.name === ticketChannelName);
        if (existingChannel) {
            return interaction.reply({ content: `❌ Zaten açık olan bir destek kanalınız var: ${existingChannel}`, ephemeral: true });
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
                .setTitle('📩 ASTROL Destek Merkezi')
                .setDescription(`Hoş geldiniz <@${interaction.user.id}>!\nLütfen sorununuzu veya talebinizi detaylı bir şekilde yazın. Yetkililerimiz en kısa sürede ilgilenecektir.`)
                .setColor('#00F2FE')
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Talebi Kapat')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Destek kanalınız oluşturuldu: ${ticketChannel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ Destek kanalı oluşturulurken bir hata oluştu!', ephemeral: true });
        }
    }

    // 2. TICKET KAPATMA BUTONU
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 Bu destek kanalı 5 saniye sonra silinecek...');
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.error('Kanal silme hatası:', err);
            }
        }, 5000);
    }

    // 3. ANKET OY BUTONLARI (Evet / Hayır)
    if (interaction.isButton() && (interaction.customId === 'anket_yes' || interaction.customId === 'anket_no')) {
        const choice = interaction.customId === 'anket_yes' ? 'Evet' : 'Hayır';
        await interaction.reply({ content: `✅ Oyunuz başarıyla kaydedildi: **${choice}**`, ephemeral: true });
    }

    // 4. EMBED MODAL
    if (interaction.isButton() && interaction.customId === 'open_embed_modal') {
        const modal = new ModalBuilder()
            .setCustomId('embed_creator_modal')
            .setTitle('Estetik Embed Oluşturucu');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Başlığı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('embed_desc')
            .setLabel('Embed Metni (Description)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const serverIdInput = new TextInputBuilder()
            .setCustomId('server_id')
            .setLabel('Sunucu ID')
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
            if (!guild) return interaction.editReply({ content: '❌ Bot bu Sunucu ID-sini bulamadı!' });

            const channel = await guild.channels.fetch(channelId);
            if (!channel) return interaction.editReply({ content: '❌ Bu Sunucuda böyle bir Kanal ID bulunamadı!' });

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(desc)
                .setColor('#00F2FE')
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Embed başarıyla <#${channelId}> kanalına gönderildi!` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Bir hata oluştu! ID-lerin doğru olduğundan emin olun.' });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild } = interaction;

    try {
        if (commandName === 'destek') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 ASTROL Destek Sistemi')
                .setDescription('Ekibimizle iletişim kurmak için aşağıdaki düğmeye basarak kendinize özel bir **Destek (Ticket)** açın.')
                .setColor('#5865F2');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('📩 Destek Talebi Aç')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
        else if (commandName === 'sorgu') {
            const topic = options.getString('konu');
            const embed = new EmbedBuilder()
                .setTitle('📊 Yeni Oylama')
                .setDescription(topic)
                .setColor('#F1C40F')
                .setFooter({ text: `Oylamayı başlatan: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ content: '✅ Oylama başlatıldı!', ephemeral: true });
            const pollMessage = await interaction.channel.send({ embeds: [embed] });
            await pollMessage.react('👍');
            await pollMessage.react('👎');
        }
        else if (commandName === 'anket') {
            const topic = options.getString('konu');
            const embed = new EmbedBuilder()
                .setTitle('📋 Yeni Anket')
                .setDescription(topic)
                .setColor('#9B59B6')
                .setFooter({ text: `Anketi başlatan: ${interaction.user.username}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('anket_yes')
                    .setLabel('👍 Evet')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('anket_no')
                    .setLabel('👎 Hayır')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({ content: '✅ Anket başarıyla oluşturuldu!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [row] });
        }
        else if (commandName === 'moderasyon') {
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setTitle('🛡️ ASTROL Pro Moderasyon Paneli').setDescription('Menüden bir işlem seçin.').setColor('#5865F2')],
                ephemeral: true 
            });
        }
        else if (commandName === 'embed') {
            await interaction.reply({ content: '🔐 Lütfen sohbete botun gizli şifresini yazın (30 saniyeniz var):', ephemeral: true });

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
                    await interaction.followUp({ content: '✅ Şifre doğru! Aşağıdaki düğmeye basarak paneli açın:', components: [row], ephemeral: true });
                } else {
                    await interaction.followUp({ content: '❌ Yanlış şifre!', ephemeral: true });
                }
            });
        }
        else if (commandName === 'sil') {
            await interaction.deferReply({ ephemeral: true });
            const amount = options.getInteger('sayi');
            await interaction.channel.bulkDelete(amount, true);
            await interaction.editReply({ content: `Başarıyla ${amount} mesaj silindi.` });
        }
        else if (commandName === 'yasakla') {
            await interaction.deferReply({ ephemeral: true });
            const user = options.getUser('kullanici');
            await guild.members.ban(user);
            await interaction.editReply(`🔨 ${user.tag} sunucudan yasaklandı.`);
        }
        else if (commandName === 'at') {
            await interaction.deferReply({ ephemeral: true });
            const user = options.getUser('kullanici');
            await guild.members.kick(user);
            await interaction.editReply(`👢 ${user.tag} sunucudan atıldı.`);
        }
        else if (commandName === 'avatar') {
            const user = options.getUser('kullanici') || interaction.user;
            const embed = new EmbedBuilder().setTitle(`🖼️ ${user.username}`).setImage(user.displayAvatarURL({ size: 1024 }));
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        else if (commandName === 'logkontrol') {
            await interaction.deferReply({ ephemeral: true });
            const settings = getSettings();
            const config = settings[guild.id] || Object.values(settings)[0];

            if (!config || !config.logChannelId) {
                return interaction.editReply({ content: '❌ `id.json` dosyasında herhangi bir log kanalı bulunamadı!' });
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 ASTROL JSON Kontrol Sorgusu')
                .setDescription('id.json dosyasından okunan ayarlar başarıyla çalışıyor! 👍')
                .setColor('#10B981')
                .setTimestamp();

            const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
            if (channel) {
                await channel.send({ embeds: [embed] });
                await interaction.editReply({ content: `✅ Log kanala gönderildi!` });
            } else {
                await interaction.editReply({ content: `⚠️ Log kanalı bulunamadı!` });
            }
        }
        else if (commandName === 'yazitura') {
            const sonuc = Math.random() < 0.5 ? '🪙 Yazı' : '🪙 Tura';
            await interaction.reply({ content: `Yazı-Tura sonucu: **${sonuc}**` });
        }
        else if (commandName === 'zar') {
            const zarSayisi = Math.floor(Math.random() * 6) + 1;
            await interaction.reply({ content: `🎲 Attığın zar: **${zarSayisi}**` });
        }
        else if (commandName === 'sunucubilgi') {
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${guild.name} Sunucu Bilgileri`)
                .addFields(
                    { name: '👑 Sunucu Sahibi', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '👥 Üye Sayısı', value: `${guild.memberCount}`, inline: true },
                    { name: '📅 Kuruluş Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: false }
                )
                .setColor('#3498DB')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'kullanicibilgi') {
            const user = options.getUser('kullanici') || interaction.user;
            const member = await guild.members.fetch(user.id);
            const embed = new EmbedBuilder()
                .setTitle(`👤 ${user.tag} Bilgileri`)
                .setThumbnail(user.displayAvatarURL({ size: 1024 }))
                .addFields(
                    { name: '🆔 ID', value: `${user.id}`, inline: true },
                    { name: '📅 Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: '📅 Hesap Kuruluş', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }
                )
                .setColor('#E67E22')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'yardim') {
            const embed = new EmbedBuilder()
                .setTitle('📖 ASTROL Bot Yardım Menüsü')
                .setDescription('Sunucumuzdaki mevcut komutların listesi:')
                .addFields(
                    { name: '🛠️ Moderasyon & Yönetim', value: '`/moderasyon`, `/sil`, `/yasakla`, `/at`, `/embed`, `/logkontrol`', inline: false },
                    { name: '🎫 Destek & Etkileşim', value: '`/destek`, `/sorgu`, `/anket`', inline: false },
                    { name: '🎮 Eğlence & Bilgi', value: '`/yazitura`, `/zar`, `/sunucubilgi`, `/kullanicibilgi`, `/avatar`, `/yardim`, `/qoşul`', inline: false }
                )
                .setColor('#2ECC71')
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        else if (commandName === 'qoşul') {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({ content: '❌ Önce bir ses kanalına girmelisin!', ephemeral: true });
            }

            try {
                const { joinVoiceChannel } = require('@discordjs/voice');
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                await interaction.reply({ content: `✅ Başarıyla **${voiceChannel.name}** kanalına katıldım!`, ephemeral: true });
            } catch (err) {
                console.error('Ses bağlantı hatası:', err);
                await interaction.reply({ content: `❌ Ses hatası detayı: \`\`\`${err.message}\`\`\``, ephemeral: true });
            }
        }
    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
                                     
