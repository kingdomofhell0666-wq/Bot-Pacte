const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

function buildPactCommand() {
  return new SlashCommandBuilder()
    .setName('pacte-setup')
    .setDescription('Prepare the Cerberus Pact ceremony in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.bitfield.toString())
    .setDMPermission(false);
}

function buildThresholdMessage() {
  const embed = new EmbedBuilder()
    .setColor(0x220000)
    .setTitle('THE PACT')
    .setDescription([
      'You have crossed the threshold.',
      '',
      'Few do.',
      '',
      'Before the gates open,',
      'the Abyss requires one thing.',
      '',
      'To seal the Pact,',
      'you must leave your signature.',
      '',
      'Write your name.',
    ].join('\n'));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pact_declare')
      .setLabel('DECLARE YOUR NAME')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✍️')
  );

  return {
    embed,
    components: [row],
  };
}

function buildPactMessage(username) {
  const embed = new EmbedBuilder()
    .setColor(0x220000)
    .setTitle('📜 THE PACT')
    .setDescription([
      'You stand before the gates of the Kingdom of Hell.',
      '',
      'Beyond them, you will no longer stand among the unseen.',
      '',
      'You enter willingly.',
      '',
      'You accept the laws of this realm.',
      '',
      'You abandon your place among the ordinary...',
      '',
      '...and take your place among demons.',
      '',
      '**Your soul is the price of passage.**',
      '',
      'Do you seal the pact?',
    ].join('\n'))
    .setFooter({
      text: `Name declared: ${username}`,
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pact_seal')
      .setLabel('SEAL THE PACT')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔥'),

    new ButtonBuilder()
      .setCustomId('pact_leave')
      .setLabel('LEAVE')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✖️')
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

function buildSealedMessage(username) {
  const embed = new EmbedBuilder()
    .setColor(0x550000)
    .setTitle('╔ PACT SEALED ╗')
    .setDescription([
      'There is no turning back.',
      '',
      'The Abyss has accepted your name.',
      '',
      'Your mortal passage ends here.',
      '',
      '**Welcome, Demon.**',
    ].join('\n'))
    .setFooter({
      text: username,
    });

  return {
    embeds: [embed],
    components: [],
  };
}

module.exports = {
  buildPactCommand,
  buildThresholdMessage,
  buildPactMessage,
  buildSealedMessage,
};