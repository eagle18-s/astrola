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
    new SlashCommandBuilder().setName('sil').setDescription('Sohbetteki mesajları siler').addIntegerOption(opt => opt.setName('sayi').setDescription('Silinecek mesaj sayısı').setRequired(true)),
    new SlashCommandBuilder().setName('yasakla').setDescription('Kullanıcıyı sunucudan yasaklar').addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName('at').setDescription('Kullanıcıyı sunucudan atar').addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Sebep')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName('avatar').setDescription('Kullanıcının profil fotoğrafını gösterir').addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı')),
    new SlashCommandBuilder().setName('logkontrol').setDescription('Botun bellekteki ayarlarını kontrol eder').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('embed').setDescription('Admin şifresiyle özel embed oluşturucu paneli açar').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sorgu').setDescription('Hızlı oylama embedi oluşturur').addStringOption(opt => opt.setName('konu').setDescription('Oylama konusu').setRequired(true)),
    new SlashCommandBuilder().setName('anket').setDescription('Evet / Hayır butonlu anket paneli gönderir').addStringOption(opt => opt.setName('konu').setDescription('Anket konusu').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('destek').setDescription('Destek (Ticket) panelini gönderir').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('yazitura').setDescription('Yazı Tura atar'),
    new SlashCommandBuilder().setName('zar').setDescription('1 ile 6 arasında rastgele zar atar'),
    new SlashCommandBuilder().setName('sunucubilgi').setDescription('Sunucu hakkında detaylı bilgi gösterir'),
    new SlashCommandBuilder().setName('kullanicibilgi').setDescription('Kullanıcı hakkında detaylı bilgi gösterir').addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı')),
    new SlashCommandBuilder().setName('yardim').setDescription('Botun tüm komutlarını listeler'),
    new SlashCommandBuilder().setName('qoşul').setDescription('Bulunduğun ses kanalına katılır'),
    new SlashCommandBuilder().setName('özelodasetup').setDescription('Özel oda yönetim kategorisini ve 15 butonlu kontrol panelini kurar').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('güncelemenot').setDescription('Detaylı son güncelleme notlarını belirtilen kanala gönderir').addChannelOption(opt => opt.setName('kanal').setDescription('Notun gönderileceği kanal').addChannelTypes(ChannelType.GuildText).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('gamesetup').setDescription('Sadece adminler için özel oyun ve etkinlik sistemini kurar').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`[BOT]: ${client.user.tag} olarak giriş yapıldı!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('[BOT]: Slash komutları başarıyla güncellendi!');
    } catch (error) { 
        console.error('Komut yükleme hatası:', error); 
    }

    // Keep-Alive & DM Bildirim Sistemi (Hər 2 dəqiqədən bir)
    setInterval(async () => {
        try {
            const res = await fetch('https://astrol.onrender.com');
            console.log(`[KEEP-ALIVE]: Sayt yoxlanıldı, Status: ${res.status}`);

            const targetUser = await client.users.fetch('1561721639518081105').catch(() => null);
            if (targetUser) {
                await targetUser.send('🟢 **ASTROL Bot Aktivdir!** Sayt yoxlanıldı və serverin işləməyə davam edir.');
            }
        } catch (err) { 
            console.error('[KEEP-ALIVE] Xəta:', err.message); 
        }
    }, 2 * 60 * 1000);
});

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
                const logEmbed = new EmbedBuilder().setTitle('📥 Yeni Kullanıcı Katıldı').setDescription(`**${member.user.tag}** sunucuya giriş yaptı!`).setColor('#10B981').setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    } catch (err) { console.error('Oto-rol veya log hatası:', err); }
});

const tempChannels = new Map();

client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild;
    const member = newState.member;

    if (newState.channel && newState.channel.name.includes('➕ | Otaq Yarat')) {
        try {
            const category = newState.channel.parent;
            const channelName = `🔊 ${member.user.username} Odası`;
            const voiceChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: category ? category.id : null,
                permissionOverwrites: [{ id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers] }]
            });
            tempChannels.set(voiceChannel.id, member.id);
            await member.voice.setChannel(voiceChannel);
        } catch (err) { console.error('Özel oda oluşturma hatası:', err); }
    }

    if (oldState.channel && tempChannels.has(oldState.channel.id)) {
        if (oldState.channel.members.size === 0) {
            try {
                await oldState.channel.delete();
                tempChannels.delete(oldState.channel.id);
            } catch (err) { console.error('Boş oda silme hatası:', err); }
        }
    }
});
    client.on('interactionCreate', async (interaction) => {
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
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
                ]
            });
            const embed = new EmbedBuilder().setTitle('📩 ASTROL Destek Merkezi').setDescription(`Hoş geldiniz <@${interaction.user.id}>!\nLütfen sorununuzu veya talebinizi detaylı bir şekilde yazın.`).setColor('#00F2FE').setTimestamp();
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Talebi Kapat').setStyle(ButtonStyle.Danger));
            await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Destek kanalınız oluşturuldu: ${ticketChannel}`, ephemeral: true });
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Destek kanalı oluşturulurken bir hata oluştu!', ephemeral: true }); }
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 Bu destek kanalı 5 saniye sonra silinecek...');
        setTimeout(async () => { try { await interaction.channel.delete(); } catch (err) {} }, 5000);
    }

    if (interaction.isButton() && (interaction.customId === 'anket_yes' || interaction.customId === 'anket_no')) {
        const choice = interaction.customId === 'anket_yes' ? 'Evet' : 'Hayır';
        await interaction.reply({ content: `✅ Oyunuz başarıyla kaydedildi: **${choice}**`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId.startsWith('temp_')) {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply({ content: '❌ Bu butonları kullanabilmek için bir ses kanalında olmalısın!', ephemeral: true });
        const action = interaction.customId.replace('temp_', '');
        if (action === 'isim') return interaction.reply({ content: '✏️ Oda ismini değiştirmek için `/sesisim` kullanabilirsin.', ephemeral: true });
        if (action === 'gizlilik') {
            const isPrivate = channel.permissionOverwrites.cache.has(interaction.guild.id);
            if (isPrivate) {
                await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
                await interaction.reply({ content: '🔓 Odanız herkese açık hale getirildi.', ephemeral: true });
            } else {
                await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
                await interaction.reply({ content: '🔒 Odanız gizli hale getirildi.', ephemeral: true });
            }
        } else if (action === 'sil') {
            try { await interaction.reply({ content: '🗑️ Odanız siliniyor...', ephemeral: true }); await channel.delete(); } catch (e) {}
        } else {
            await interaction.reply({ content: `⚙️ **${action.toUpperCase()}** işlemi başarıyla uygulandı!`, ephemeral: true });
        }
    }

    if (interaction.isButton() && interaction.customId === 'open_embed_modal') {
        const modal = new ModalBuilder().setCustomId('embed_creator_modal').setTitle('Estetik Embed Oluşturucu');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_title').setLabel('Başlık').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_desc').setLabel('Metin').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_id').setLabel('Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_id').setLabel('Kanal ID').setStyle(TextInputStyle.Short).setRequired(true))
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
            const channel = await guild.channels.fetch(channelId);
            const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor('#00F2FE').setTimestamp();
            await channel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Embed başarıyla <#${channelId}> kanalına gönderildi!` });
        } catch (err) { await interaction.editReply({ content: '❌ Bir hata oluştu! ID-lerin doğru olduğundan emin olun.' }); }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild } = interaction;

    try {
        if (commandName === 'destek') {
            const embed = new EmbedBuilder().setTitle('🎫 ASTROL Destek Sistemi').setDescription('Destek açmak için aşağıdaki düğmeye basın.').setColor('#5865F2');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('📩 Destek Talebi Aç').setStyle(ButtonStyle.Success));
            await interaction.reply({ embeds: [embed], components: [row] });
        }
        else if (commandName === 'sorgu') {
            const topic = options.getString('konu');
            const embed = new EmbedBuilder().setTitle('📊 Yeni Oylama').setDescription(topic).setColor('#F1C40F').setTimestamp();
            await interaction.reply({ content: '✅ Oylama başlatıldı!', ephemeral: true });
            const msg = await interaction.channel.send({ embeds: [embed] });
            await msg.react('👍'); await msg.react('👎');
        }
        else if (commandName === 'anket') {
            const topic = options.getString('konu');
            const embed = new EmbedBuilder().setTitle('📋 Yeni Anket').setDescription(topic).setColor('#9B59B6').setTimestamp();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('anket_yes').setLabel('👍 Evet').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('anket_no').setLabel('👎 Hayır').setStyle(ButtonStyle.Danger)
            );
            await interaction.reply({ content: '✅ Anket oluşturuldu!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [row] });
        }
        else if (commandName === 'moderasyon') {
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ ASTROL Pro Moderasyon').setColor('#5865F2')], ephemeral: true });
        }
        else if (commandName === 'embed') {
            await interaction.reply({ content: '🔐 Şifreyi yazın (30 san):', ephemeral: true });
            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
            collector.on('collect', async m => {
                try { await m.delete(); } catch(e) {}
                if (m.content === 'qaqa1212A') {
                    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_embed_modal').setLabel('✨ Embed Hazırla').setStyle(ButtonStyle.Primary));
                    await interaction.followUp({ content: '✅ Doğru! Paneli aç:', components: [row], ephemeral: true });
                } else { await interaction.followUp({ content: '❌ Yanlış şifre!', ephemeral: true }); }
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
            await guild.members.ban(options.getUser('kullanici'));
            await interaction.editReply(`🔨 Kullanıcı yasaklandı.`);
        }
        else if (commandName === 'at') {
            await interaction.deferReply({ ephemeral: true });
            await guild.members.kick(options.getUser('kullanici'));
            await interaction.editReply(`👢 Kullanıcı atıldı.`);
        }
        else if (commandName === 'avatar') {
            const user = options.getUser('kullanici') || interaction.user;
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🖼️ ${user.username}`).setImage(user.displayAvatarURL({ size: 1024 }))], ephemeral: true });
        }
        else if (commandName === 'logkontrol') {
            await interaction.deferReply({ ephemeral: true });
            const settings = getSettings();
            const config = settings[guild.id] || Object.values(settings)[0];
            if (!config || !config.logChannelId) return interaction.editReply({ content: '❌ Log kanal bulunamadı!' });
            const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
            if (channel) {
                await channel.send({ embeds: [new EmbedBuilder().setTitle('🔍 Log Test').setColor('#10B981')] });
                await interaction.editReply({ content: '✅ Log gönderildi!' });
            } else { await interaction.editReply({ content: '⚠️ Kanal bulunamadı!' }); }
        }
        else if (commandName === 'yazitura') {
            await interaction.reply({ content: `Yazı-Tura: **${Math.random() < 0.5 ? '🪙 Yazı' : '🪙 Tura'}**` });
        }
        else if (commandName === 'zar') {
            await interaction.reply({ content: `🎲 Zar: **${Math.floor(Math.random() * 6) + 1}**` });
        }
        else if (commandName === 'sunucubilgi') {
            const embed = new EmbedBuilder().setTitle(`📊 ${guild.name}`).addFields({ name: 'Üye', value: `${guild.memberCount}`, inline: true }).setColor('#3498DB');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'kullanicibilgi') {
            const user = options.getUser('kullanici') || interaction.user;
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`👤 ${user.tag}`).setColor('#E67E22')] });
        }
        else if (commandName === 'yardim') {
            const embed = new EmbedBuilder().setTitle('📖 Yardım Menüsü').setDescription('`/moderasyon`, `/destek`, `/özelodasetup`, `/gamesetup`, `/güncelemenot`, `/qoşul`').setColor('#2ECC71');
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        else if (commandName === 'qoşul') {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.reply({ content: '❌ Önce bir ses kanalına girmelisin!', ephemeral: true });
            try {
                const { joinVoiceChannel } = require('@discordjs/voice');
                joinVoiceChannel({ channelId: voiceChannel.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
                await interaction.reply({ content: `✅ **${voiceChannel.name}** kanalına katıldım!`, ephemeral: true });
            } catch (err) { await interaction.reply({ content: `❌ Hata: \`\`\`${err.message}\`\`\``, ephemeral: true }); }
        }
        else if (commandName === 'özelodasetup') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const category = await guild.channels.create({ name: '🔊 ASTROL ÖZEL ODA', type: ChannelType.GuildCategory });
                await guild.channels.create({ name: '➕ | Otaq Yarat', type: ChannelType.GuildVoice, parent: category.id });
                const textChannel = await guild.channels.create({ name: '🎵│oda-kontrol', type: ChannelType.GuildText, parent: category.id, permissionOverwrites: [{ id: guild.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }] });

                const r1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('temp_isim').setLabel('Oda İsmi').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('temp_limiti').setLabel('Oda Limiti').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('temp_gizlilik').setLabel('Gizlilik').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('temp_bekleme').setLabel('Bekleme Odası').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('temp_sohbet').setLabel('Sohbet').setStyle(ButtonStyle.Secondary)
                );
                const r2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('temp_guvenilir').setLabel('Güvenilir').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('temp_guvensiz').setLabel('Güvensiz').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('temp_davet').setLabel('Davet').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('temp_sestenat').setLabel('Sesten At').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('temp_bolge').setLabel('Bölge').setStyle(ButtonStyle.Secondary)
                );
                const r3 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('temp_engelle').setLabel('Engelle').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('temp_engelialdir').setLabel('Engeli Kaldır').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('temp_sahiplen').setLabel('Sahiplen').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('temp_odayidevret').setLabel('Odayı Devret').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('temp_sil').setLabel('Sil').setStyle(ButtonStyle.Danger)
                );
                const embed = new EmbedBuilder().setTitle('🎛️ ASTROL Ses Kontrol Paneli').setDescription('Odanızı yönetmek için butonları kullanın.').setColor('#38BDF8');
                await textChannel.send({ embeds: [embed], components: [r1, r2, r3] });
                await interaction.editReply({ content: '✅ Özel oda sistemi başarıyla kuruldu!' });
            } catch (err) { await interaction.editReply({ content: '❌ Kurulum hatası!' }); }
        }
        else if (commandName === 'gamesetup') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const category = await guild.channels.create({ name: '🎮 ASTROL OYUN & ETKİNLİK', type: ChannelType.GuildCategory });
                await guild.channels.create({ name: '🎮│oyun-sohbet', type: ChannelType.GuildText, parent: category.id });
                await guild.channels.create({ name: '🔊 Etkinlik Odası', type: ChannelType.GuildVoice, parent: category.id });

                const embed = new EmbedBuilder()
                    .setTitle('🎮 ASTROL Oyun & Etkinlik Merkezi')
                    .setDescription('Sunucumuzda düzenlenecek oyun etkinlikleri için bu kategori kullanılacaktır. İyi eğlenceler!')
                    .setColor('#F1C40F')
                    .setTimestamp();

                await interaction.editReply({ content: '✅ Oyun ve etkinlik sistemi admin yetkisiyle başarıyla kuruldu!' });
            } catch (err) { await interaction.editReply({ content: '❌ Oyun kurulumu sırasında hata oluştu!' }); }
        }
        else if (commandName === 'güncelemenot') {
            const channel = options.getChannel('kanal');
            await interaction.deferReply({ ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle('🚀 ASTROL Bot & Sunucu - Büyük Güncelleme Notu')
                .setDescription('Sistemimiz güncellendi! Yeni eklenen özellikler aşağıdadır:')
                .addFields(
                    { name: '🔊 Sonsuz Özel Oda Sistemi', value: '`➕ | Otaq Yarat` kanalına girerek kendi odanızı açabilirsiniz.', inline: false },
                    { name: '🎛️ 15 Butonlu Panel', value: 'Ses odalarınızı tam kontrol edin.', inline: false },
                    { name: '🎮 Oyun ve Etkinlik Sistemi', value: '`/gamesetup` ile özel oyun odaları kurulabilir.', inline: false }
                )
                .setColor('#38BDF8').setTimestamp();
            await channel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Güncelleme notu <#${channel.id}> kanalına gönderildi!` });
        }
    } catch (err) { console.error('Komut hatası:', err); }
});

client.login(process.env.DISCORD_TOKEN);
                
