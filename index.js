require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// --- IN-MEMORY VARIABLES ---
let welcomeChannelId = null;
let autoRoleId = null;

// ----------------------------------
// 1. COMMANDS DEFINITION (ENGLISH)
// ----------------------------------
const commands = [
    // --- ADMIN SETUPS ---
    new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Admin: Set the channel for welcome messages')
        .addChannelOption(option => option.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Admin: Sets up the ticket panel in the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('setup-roles')
        .setDescription('Admin: Create a self-serve role menu')
        .addRoleOption(option => option.setName('role1').setDescription('First role option').setRequired(true))
        .addRoleOption(option => option.setName('role2').setDescription('Second role option').setRequired(false))
        .addRoleOption(option => option.setName('role3').setDescription('Third role option').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('setup-autorole')
        .setDescription('Admin: Set the role automatically given to new members')
        .addRoleOption(option => option.setName('role').setDescription('The role to give').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- MODERATION & TOOLS ---
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Mod: Create a simple poll')
        .addStringOption(option => option.setName('question').setDescription('The poll question').setRequired(true))
        .addStringOption(option => option.setName('option1').setDescription('First option').setRequired(true))
        .addStringOption(option => option.setName('option2').setDescription('Second option').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Mod: Deletes a specific number of messages')
        .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Mod: Kicks a member')
        .addUserOption(option => option.setName('target').setDescription('The member to kick').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Mod: Bans a member')
        .addUserOption(option => option.setName('target').setDescription('The member to ban').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    // --- PUBLIC COMMANDS ---
    new SlashCommandBuilder().setName('help').setDescription('Displays a list of all available commands'),
    new SlashCommandBuilder().setName('ping').setDescription('Shows the bot and API latency'),
    new SlashCommandBuilder().setName('serverinfo').setDescription('Displays information about the server'),
    new SlashCommandBuilder().setName('8ball').setDescription('Ask the magic 8-ball a question')
        .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true))
].map(command => command.toJSON());

// ----------------------------------
// 2. BOT STARTUP
// ----------------------------------
client.once('ready', async () => {
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ All (/) commands are ready and pushed to Discord!');
    } catch (error) {
        console.error('❌ Error pushing commands:', error);
    }
});

// ----------------------------------
// EVENT: WELCOME & AUTO-ROLE
// ----------------------------------
client.on('guildMemberAdd', async member => {
    
    // 1. Auto-Role System
    if (autoRoleId) {
        const role = member.guild.roles.cache.get(autoRoleId);
        if (role) {
            await member.roles.add(role).catch(() => console.log(`Could not give auto-role to ${member.user.tag}`)); 
        }
    }

    // 2. Welcome Message System
    if (!welcomeChannelId) return;
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Welcome, ${member.user.username}! 🌟`)
        .setDescription('Hello and welcome to the server with the different Luma tools, have a great time!')
        .setImage('https://wallpapercave.com/wp/wp7575112.jpg')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
        
    welcomeChannel.send({ content: `Hey <@${member.id}>!`, embeds: [welcomeEmbed] });
});

// ----------------------------------
// 3. EXECUTING INTERACTIONS
// ----------------------------------
client.on('interactionCreate', async interaction => {
    
    // ==========================================
    // SLASH COMMANDS
    // ==========================================
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        // --- SETUPS (Admin) ---
        if (commandName === 'setup-welcome') {
            welcomeChannelId = options.getChannel('channel').id;
            await interaction.reply({ content: `✅ Welcome channel set to <#${welcomeChannelId}>.`, ephemeral: true });
        }
        else if (commandName === 'setup-autorole') {
            autoRoleId = options.getRole('role').id;
            await interaction.reply({ content: `✅ Auto-role set to <@&${autoRoleId}>. New members will get it automatically!`, ephemeral: true });
        }
        else if (commandName === 'setup-ticket') {
            const embed = new EmbedBuilder().setTitle('🎫 Support Tickets').setDescription('Click below to open a ticket.').setColor('#2B2D31');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('📩 Open Ticket').setStyle(ButtonStyle.Primary));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Ticket panel active.', ephemeral: true });
        }
        else if (commandName === 'setup-roles') {
            const role1 = options.getRole('role1');
            const role2 = options.getRole('role2');
            const role3 = options.getRole('role3');

            const menuOptions = [new StringSelectMenuOptionBuilder().setLabel(role1.name).setValue(role1.id).setDescription('Click to toggle this role')];
            if (role2) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel(role2.name).setValue(role2.id).setDescription('Click to toggle this role'));
            if (role3) menuOptions.push(new StringSelectMenuOptionBuilder().setLabel(role3.name).setValue(role3.id).setDescription('Click to toggle this role'));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('role_select')
                .setPlaceholder('Choose a role to get or remove...')
                .addOptions(menuOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const embed = new EmbedBuilder().setTitle('🎭 Self-Serve Roles').setDescription('Select a role from the menu below to add or remove it from your profile.').setColor('#9B59B6');

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Role menu created.', ephemeral: true });
        }

        // --- PUBLIC & MODERATION FEATURES ---
        else if (commandName === 'poll') {
            const question = options.getString('question');
            const opt1 = options.getString('option1');
            const opt2 = options.getString('option2');

            const embed = new EmbedBuilder()
                .setTitle(`📊 Poll: ${question}`)
                .setDescription(`🅰️ ${opt1}\n\n🅱️ ${opt2}`)
                .setColor('#3498DB')
                .setFooter({ text: `Asked by ${interaction.user.username}` });

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('🅰️');
            await msg.react('🅱️');
        }

        // --- UTILITY / MODERATION ---
        else if (commandName === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor('#00FFaa')
                .setTitle('📜 Bot Command List')
                .addFields(
                    { name: '⚙️ Setup (Admin)', value: '`/setup-welcome`, `/setup-ticket`, `/setup-roles`, `/setup-autorole`' },
                    { name: '🛡️ Moderation', value: '`/kick`, `/ban`, `/clear`, `/poll`' },
                    { name: '🛠️ Utility & Fun', value: '`/help`, `/ping`, `/serverinfo`, `/8ball`' }
                );
            await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        }
        else if (commandName === 'ping') await interaction.reply(`🏓 Pong! \`${client.ws.ping}ms\``);
        else if (commandName === 'serverinfo') await interaction.reply(`📊 **${interaction.guild.name}** has ${interaction.guild.memberCount} members.`);
        else if (commandName === '8ball') await interaction.reply(`🔮 **Question:** *${options.getString('question')}*\n💬 **Answer:** It is certain.`);
        
        else if (commandName === 'clear') {
            await interaction.channel.bulkDelete(options.getInteger('amount'), true);
            await interaction.reply({ content: `🗑️ Deleted ${options.getInteger('amount')} messages.`, ephemeral: true });
        }
        else if (commandName === 'kick') {
            await options.getMember('target').kick().then(() => interaction.reply(`🔨 Kicked.`)).catch(() => interaction.reply({ content: 'Failed. Do I have permissions?', ephemeral: true }));
        }
        else if (commandName === 'ban') {
            await options.getMember('target').ban().then(() => interaction.reply(`🚫 Banned.`)).catch(() => interaction.reply({ content: 'Failed. Do I have permissions?', ephemeral: true }));
        }
    }

    // ==========================================
    // MENUS & BUTTONS
    // ==========================================
    else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'role_select') {
            const roleId = interaction.values[0];
            const role = interaction.guild.roles.cache.get(roleId);
            const member = interaction.member;

            if (!role) return interaction.reply({ content: '❌ Error: Role not found.', ephemeral: true });

            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
                await interaction.reply({ content: `➖ Removed the **${role.name}** role.`, ephemeral: true });
            } else {
                await member.roles.add(roleId);
                await interaction.reply({ content: `➕ Added the **${role.name}** role.`, ephemeral: true });
            }
        }
    }

    else if (interaction.isButton()) {
        if (interaction.customId === 'open_ticket') {
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            const embed = new EmbedBuilder().setTitle('🎫 Ticket').setDescription('Support will be here soon.').setColor('#2ECC71');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close').setStyle(ButtonStyle.Danger));
            await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Ticket: ${ticketChannel}`, ephemeral: true });
        }
        else if (interaction.customId === 'close_ticket') {
            await interaction.reply('🔒 Closing in 5s...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
