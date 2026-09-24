const {
  Client,
  GatewayIntentBits,
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


// ============================================================
// READY
// ============================================================

client.once('clientReady', async () => {
  console.log(`Cerberus online as ${client.user.tag}`);

  try {
    const role = await client.guilds.cache
      .first()
      ?.roles.fetch(MEMBER_ROLE_ID);

    if (role) {
      console.log(`Oathbound role: ${role.id}`);
    } else {
      console.warn(`Oathbound role not found: ${MEMBER_ROLE_ID}`);
    }
  } catch (error) {
    console.error('Unable to fetch Oathbound role:', error);
  }

  try {
    const rest = new REST({ version: '10' })
      .setToken(DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: [
          buildPactCommand().toJSON(),
        ],
      }
    );

    console.log('Slash commands registered globally.');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
});


// ============================================================
// /pacte-setup
// ============================================================

async function handleSetup(interaction) {
  if (!interaction.memberPermissions?.has('ManageGuild')) {
    return interaction.reply({
      content: 'You do not have permission to prepare the Pact.',
      ephemeral: true,
    });
  }

  try {
    const guild = interaction.guild;

    const role = await guild.roles.fetch(MEMBER_ROLE_ID);

    if (!role) {
      return interaction.reply({
        content:
          `The Oathbound role could not be found.\nRole ID: ${MEMBER_ROLE_ID}`,
        ephemeral: true,
      });
    }

    const botMember = await guild.members.fetchMe();

    if (botMember.roles.highest.position <= role.position) {
      return interaction.reply({
        content:
          'Cerberus cannot assign the Oathbound role because its highest role must be above Oathbound in the role hierarchy.',
        ephemeral: true,
      });
    }

    // ========================================================
    // GIF — envoyé comme premier message
    // ========================================================

    const gif =
      'https://cdn.discordapp.com/attachments/1498501932568940586/1552517277415637022/standard.gif?ex=6ab5e5e3&is=6ab49463&hm=7e1f5253ed29189bde027bb326bad3131923de4322174e0c2e92c21f0301c583&';

    await interaction.channel.send({
      content: gif,
    });

    // ========================================================
    // THE PACT — envoyé juste après le GIF
    // ========================================================

    const pactMessage = buildThresholdMessage();

    await interaction.channel.send({
      embeds: [pactMessage.embed],
      components: pactMessage.components,
    });

    // ========================================================
    // CONFIRMATION
    // ========================================================

    await interaction.reply({
      content: 'The Pact has been prepared.',
      ephemeral: true,
    });

  } catch (error) {
    console.error('Pact setup error:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Unable to open the Pact.',
        ephemeral: true,
      });
    }
  }
}

// ============================================================
// DECLARE YOUR NAME
// ============================================================

async function handleDeclare(interaction) {
  if (hasPact(interaction.guildId, interaction.user.id)) {
    return interaction.reply({
      content:
        'Your pact already exists. The Abyss has already acknowledged you.',
      ephemeral: true,
    });
  }

  try {
    const member = await interaction.guild.members.fetch(
      interaction.user.id
    );

    if (member.roles.cache.has(MEMBER_ROLE_ID)) {
      return interaction.reply({
        content:
          'You have already crossed the gates. You are already Oathbound.',
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('Member fetch error:', error);
  }

  const modal = new ModalBuilder()
    .setCustomId('pact_name_modal')
    .setTitle('THE PACT');

  const nameInput = new TextInputBuilder()
    .setCustomId('declared_name')
    .setLabel('Speak your name, mortal.')
    .setPlaceholder(interaction.user.username)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(32);

  const row = new ActionRowBuilder()
    .addComponents(nameInput);

  modal.addComponents(row);

  await interaction.showModal(modal);
}


// ============================================================
// NAME MODAL
// ============================================================

async function handleNameModal(interaction) {
  const declaredName = interaction.fields
    .getTextInputValue('declared_name')
    .trim();

  const realUsername = interaction.user.username;

  if (
    declaredName.toLowerCase() !==
    realUsername.toLowerCase()
  ) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x550000)
          .setTitle('NAME REJECTED')
          .setDescription([
            'That is not the name by which you entered this realm.',
            '',
            'Cerberus does not accept false names.',
            '',
            '**Speak your Discord username exactly.**',
          ].join('\n')),
      ],
      ephemeral: true,
    });
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x330000)
        .setTitle('NAME RECOGNIZED')
        .setDescription([
          `**${realUsername}**`,
          '',
          'The Abyss has acknowledged your name.',
          '',
          'Now comes the pact.',
        ].join('\n')),
    ],
    ephemeral: true,
  });

  await interaction.followUp({
    ...buildPactMessage(realUsername),
    ephemeral: true,
  });
}


// ============================================================
// SEAL THE PACT
// ============================================================

async function handleSeal(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const username = interaction.user.username;

  if (hasPact(guildId, userId)) {
    return interaction.reply({
      content:
        'The pact has already been sealed. There is no turning back.',
      ephemeral: true,
    });
  }

  try {
    const guild = interaction.guild;

    const member = await guild.members.fetch(userId);
    const role = await guild.roles.fetch(MEMBER_ROLE_ID);

    if (!role) {
      return interaction.reply({
        content:
          `The Oathbound role could not be found.\nRole ID: ${MEMBER_ROLE_ID}`,
        ephemeral: true,
      });
    }

    const botMember = await guild.members.fetchMe();

    if (botMember.roles.highest.position <= role.position) {
      return interaction.reply({
        content:
          'Cerberus cannot complete the transformation because the Oathbound role is above the bot role.',
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    // --------------------------------------------------------
    // PACT INITIATED
    // --------------------------------------------------------

    const progressEmbed = new EmbedBuilder()
      .setColor(0x330000)
      .setTitle('PACT INITIATED...')
      .setDescription([
        'The contract is being written...',
        '',
        '░░░░░░░░░░░░░░░░░░░░',
      ].join('\n'));

    await interaction.editReply({
      embeds: [progressEmbed],
      components: [],
    });

    await new Promise(resolve => setTimeout(resolve, 850));

    // --------------------------------------------------------
    // 25%
    // --------------------------------------------------------

    progressEmbed.setDescription([
      'The contract is being written...',
      '',
      '█████░░░░░░░░░░░░░░░ 25%',
    ].join('\n'));

    await interaction.editReply({
      embeds: [progressEmbed],
      components: [],
    });

    await new Promise(resolve => setTimeout(resolve, 850));

    // --------------------------------------------------------
    // 52%
    // --------------------------------------------------------

    progressEmbed.setDescription([
      'The contract is being written...',
      '',
      '██████████░░░░░░░░░░ 52%',
    ].join('\n'));

    await interaction.editReply({
      embeds: [progressEmbed],
      components: [],
    });

    await new Promise(resolve => setTimeout(resolve, 850));

    // --------------------------------------------------------
    // 78%
    // --------------------------------------------------------

    progressEmbed.setDescription([
      'The contract is being written...',
      '',
      '███████████████░░░░░ 78%',
    ].join('\n'));

    await interaction.editReply({
      embeds: [progressEmbed],
      components: [],
    });

    await new Promise(resolve => setTimeout(resolve, 850));

    // --------------------------------------------------------
    // 100%
    // --------------------------------------------------------

    progressEmbed.setDescription([
      'The contract is being written...',
      '',
      '████████████████████ 100%',
    ].join('\n'));

    await interaction.editReply({
      embeds: [progressEmbed],
      components: [],
    });

    await new Promise(resolve => setTimeout(resolve, 700));

    // --------------------------------------------------------
    // GIVE OATHBOUND ROLE
    // --------------------------------------------------------

    if (!member.roles.cache.has(MEMBER_ROLE_ID)) {
      await member.roles.add(
        role,
        'Cerberus Pact sealed'
      );
    }

    // --------------------------------------------------------
    // SAVE PACT
    // --------------------------------------------------------

    savePact(guildId, userId, {
      username,
      declaredAt: new Date().toISOString(),
    });

    // --------------------------------------------------------
    // FINAL MESSAGE
    // --------------------------------------------------------

    await interaction.editReply({
      ...buildSealedMessage(username),
    });

    console.log(
      `[PACT SEALED] ${username} (${userId}) -> Oathbound`
    );

  } catch (error) {
    console.error('Pact sealing error:', error);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x550000)
              .setTitle('THE RITUAL FAILED')
              .setDescription([
                'Cerberus could not complete the transformation.',
                '',
                'The gates remain closed.',
                '',
                'An administrator should inspect the bot logs.',
              ].join('\n')),
          ],
          components: [],
        });
      } else {
        await interaction.reply({
          content:
            'Cerberus could not complete the pact.',
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error(
        'Failed to send pact error message:',
        replyError
      );
    }
  }
}


// ============================================================
// LEAVE
// ============================================================

async function handleLeave(interaction) {
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x111111)
        .setTitle('THE GATE REMAINS CLOSED')
        .setDescription([
          'You have chosen not to seal the pact.',
          '',
          'The Abyss will remember nothing.',
          '',
          'If you return...',
          '',
          'Cerberus will be waiting.',
        ].join('\n')),
    ],
    components: [],
  });
}


// ============================================================
// INTERACTIONS
// ============================================================

client.on('interactionCreate', async (interaction) => {
  try {

    // Slash command
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'pacte-setup') {
        await handleSetup(interaction);
      }

      return;
    }

    // Button
    if (interaction.isButton()) {

      if (interaction.customId === 'pact_declare') {
        await handleDeclare(interaction);
        return;
      }

      if (interaction.customId === 'pact_seal') {
        await handleSeal(interaction);
        return;
      }

      if (interaction.customId === 'pact_leave') {
        await handleLeave(interaction);
        return;
      }

      return;
    }

    // Modal
    if (interaction.isModalSubmit()) {

      if (interaction.customId === 'pact_name_modal') {
        await handleNameModal(interaction);
        return;
      }

      return;
    }

  } catch (error) {
    console.error('Interaction error:', error);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content:
            'Cerberus encountered an unexpected error.',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content:
            'Cerberus encountered an unexpected error.',
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error(
        'Unable to send interaction error:',
        replyError
      );
    }
  }
});


// ============================================================
// MEMBER LEAVES SERVER
// ============================================================

client.on('guildMemberRemove', (member) => {
  try {
    resetPact(member.guild.id, member.id);

    console.log(
      `[PACT RESET] ${member.user.username} left the server.`
    );
  } catch (error) {
    console.error(
      'Failed to reset pact after member removal:',
      error
    );
  }
});


// ============================================================
// OATHBOUND ROLE REMOVED
// ============================================================

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const hadRole = oldMember.roles.cache.has(MEMBER_ROLE_ID);
    const hasRole = newMember.roles.cache.has(MEMBER_ROLE_ID);

    // Role was removed manually
    if (hadRole && !hasRole) {
      resetPact(
        newMember.guild.id,
        newMember.id
      );

      console.log(
        `[PACT RESET] Oathbound role removed from ${newMember.user.username}.`
      );
    }

  } catch (error) {
    console.error(
      'Failed to reset pact after role removal:',
      error
    );
  }
});


// ============================================================
// ERRORS
// ============================================================

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});


// ============================================================
// LOGIN
// ============================================================

client.login(DISCORD_TOKEN);
