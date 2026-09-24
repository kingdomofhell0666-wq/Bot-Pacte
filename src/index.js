const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');

const {
  DISCORD_TOKEN,
  MEMBER_ROLE_ID,
} = require('./config');

const {
  ensureStore,
  hasPact,
  getPact,
  savePact,
  resetPact,
} = require('./pacts');

const {
  buildPactCommand,
  buildThresholdMessage,
  buildPactMessage,
  buildSealedMessage,
} = require('./commands');

ensureStore();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const commands = [buildPactCommand().toJSON()];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('Slash commands registered globally.');
}

function makeNameModal() {
  const input = new TextInputBuilder()
    .setCustomId('declared_name')
    .setLabel('Your Discord username')
    .setPlaceholder('Speak your name...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(32);

  return new ModalBuilder()
    .setCustomId('pact_name_modal')
    .setTitle('Cerberus is listening...')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

function nameMatchesDiscordUsername(input, username) {
  return input.trim().toLowerCase() === username.trim().toLowerCase();
}

function errorEmbed(text) {
  return new EmbedBuilder()
    .setColor(0x330000)
    .setTitle('THE ABYSS REMAINS SILENT')
    .setDescription(text);
}

async function handleSetup(interaction) {
  if (!interaction.memberPermissions?.has('ManageGuild')) {
    return interaction.reply({
      content: 'Only members with Manage Server can prepare the ceremony.',
      ephemeral: true,
    });
  }

  const role = await interaction.guild.roles.fetch(MEMBER_ROLE_ID);

  if (!role) {
    return interaction.reply({
      content: `The configured Oathbound role (${MEMBER_ROLE_ID}) could not be found in this server.`,
      ephemeral: true,
    });
  }

  if (!interaction.guild.members.me.roles.highest.comparePositionTo(role) > 0) {
    // Kept intentionally simple below; the explicit check is performed again
    // using the resolved Role objects to produce a useful error.
  }

  if (interaction.guild.members.me.roles.highest.position <= role.position) {
    return interaction.reply({
      content: 'Cerberus cannot grant Oathbound because the bot role is not above the Oathbound role. Move the bot role above Oathbound in Server Settings → Roles.',
      ephemeral: true,
    });
  }

  await interaction.channel.send(buildThresholdMessage());

  return interaction.reply({
    content: 'The threshold has been prepared in this channel.',
    ephemeral: true,
  });
}

async function handleDeclare(interaction) {
  const member = interaction.member;

  if (hasPact(interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed('Your name has already been sealed in the Abyss.')],
      ephemeral: true,
    });
  }

  if (member.roles.cache.has(MEMBER_ROLE_ID)) {
    return interaction.reply({
      embeds: [errorEmbed('The Abyss already recognizes you. Your pact is already sealed.')],
      ephemeral: true,
    });
  }

  await interaction.showModal(makeNameModal());
}

async function handleNameModal(interaction) {
  const declaredName = interaction.fields.getTextInputValue('declared_name').trim();
  const discordUsername = interaction.user.username;

  if (!nameMatchesDiscordUsername(declaredName, discordUsername)) {
    return interaction.reply({
      embeds: [
        errorEmbed([
          'Cerberus does not recognize that name.',
          '',
          'Speak the exact username of the Discord account standing before the gate.',
        ].join('\n')),
      ],
      ephemeral: true,
    });
  }

  if (hasPact(interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed('Your name has already been sealed in the Abyss.')],
      ephemeral: true,
    });
  }

  const acknowledged = new EmbedBuilder()
    .setColor(0x220000)
    .setTitle('Name recognized.')
    .setDescription([
      `**${discordUsername}**`,
      '',
      'The Abyss has acknowledged you.',
    ].join('\n'));

  await interaction.reply({
    embeds: [acknowledged, buildPactMessage(discordUsername).embeds[0]],
    components: buildPactMessage(discordUsername).components,
    ephemeral: true,
  });
}

async function handleSeal(interaction) {
  if (hasPact(interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed('This pact has already been sealed.')],
      ephemeral: true,
    });
  }

  const role = await interaction.guild.roles.fetch(MEMBER_ROLE_ID);

  if (!role) {
    return interaction.reply({
      embeds: [errorEmbed('The Oathbound role could not be found. The ceremony cannot continue.')],
      ephemeral: true,
    });
  }

  const me = interaction.guild.members.me;

  if (!me || me.roles.highest.position <= role.position) {
    return interaction.reply({
      embeds: [errorEmbed('Cerberus cannot complete the transformation. The Oathbound role must be below the bot’s highest role.')],
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();

  const progressMessages = [
    'PACT INITIATED...\n\n████░░░░░░░░░░░░ 25%\n\nThe contract is being written...',
    'PACT INITIATED...\n\n████████░░░░░░░░ 52%\n\nThe Abyss is reading your name...',
    'PACT INITIATED...\n\n████████████░░░░ 78%\n\nThe gates are beginning to open...',
    'PACT INITIATED...\n\n████████████████ 100%\n\nThe contract is complete.',
  ];

  for (const content of progressMessages) {
    await interaction.editReply({
      content,
      embeds: [],
      components: [],
    });
    await new Promise(resolve => setTimeout(resolve, 850));
  }

  try {
    await interaction.member.roles.add(role, 'Kingdom of Hell — Pact sealed');
  } catch (error) {
    console.error('Failed to grant Oathbound:', error);

    return interaction.editReply({
      content: '',
      embeds: [errorEmbed('The contract was written, but the transformation could not be completed. Check the bot role hierarchy and Manage Roles permission.')],
      components: [],
    });
  }

  savePact(interaction.user.id, {
    userId: interaction.user.id,
    username: interaction.user.username,
    declaredName: interaction.user.username,
    guildId: interaction.guildId,
    roleId: MEMBER_ROLE_ID,
    sealedAt: new Date().toISOString(),
  });

  return interaction.editReply({
    content: '',
    ...buildSealedMessage(interaction.user.username),
  });
}

async function handleLeave(interaction) {
  return interaction.update({
    content: '',
    embeds: [
      new EmbedBuilder()
        .setColor(0x111111)
        .setTitle('THE GATE REMAINS CLOSED')
        .setDescription([
          'You have chosen not to enter.',
          '',
          'The Abyss will remember nothing.',
        ].join('\n')),
    ],
    components: [],
  });
}

client.once('ready', async () => {
  console.log(`Cerberus online as ${client.user.tag}`);
  console.log(`Oathbound role: ${MEMBER_ROLE_ID}`);

  try {
    await registerCommands();
  } catch (error) {
    console.error('Command registration failed:', error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'pacte-setup') {
      return await handleSetup(interaction);
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'pact_declare') return await handleDeclare(interaction);
      if (interaction.customId === 'pact_seal') return await handleSeal(interaction);
      if (interaction.customId === 'pact_leave') return await handleLeave(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'pact_name_modal') {
      return await handleNameModal(interaction);
    }
  } catch (error) {
    console.error('Interaction error:', error);

    const response = {
      content: 'The Abyss encountered an error while processing the pact.',
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
  }
});

client.on('guildMemberRemove', member => {
  const wasReset = resetPact(member.id);

  if (wasReset) {
    console.log(`Pact reset for ${member.user.tag} (${member.id}) — member left the guild.`);
  }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
  const hadRole = oldMember.roles.cache.has(MEMBER_ROLE_ID);
  const stillHasRole = newMember.roles.cache.has(MEMBER_ROLE_ID);

  if (hadRole && !stillHasRole) {
    const wasReset = resetPact(newMember.id);

    if (wasReset) {
      console.log(`Pact reset for ${newMember.user.tag} (${newMember.id}) — Oathbound role removed.`);
    }
  }
});

client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.login(DISCORD_TOKEN);
