/**
 * @fileoverview The main entry point for the Discord bot.
 * @author arika-tune
 */

const {
    Client,
    GatewayIntentBits,
    Collection,
    ActivityType,
  } = require('discord.js');
  const fs = require('node:fs');
  const path = require('node:path');
  require('dotenv').config();
  
  /**
   * The Discord client.
   * @type {Client}
   */
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
  });
  
  /**
   * A collection of commands.
   * @type {Collection<string, Command>}
   */
  client.commands = new Collection();
  
  /**
   * The path to the commands directory.
   * @type {string}
   */
  const commandsPath = path.join(__dirname, 'commands');
  
  /**
   * An array of command filenames.
   * @type {string[]}
   */
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));
  
  /**
   * Loads commands from the commands directory.
   */
  function loadCommands() {
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = require(filePath);
        client.commands.set(command.data.name, command);
      } catch (error) {
        console.error(`Error loading command ${file}:`, error);
      }
    }
  }
  
  /**
   * Deploys slash commands to the Discord application.
   * @async
   * @returns {Promise<void>}
   */
  async function deployCommands() {
    try {
      console.log('Deploying commands...');
      const data = Array.from(client.commands.values()).map(
        (command) => command.data.toJSON(),
      );
      await client.application.commands.set(data);
      console.log('Commands deployed!');
    } catch (error) {
      console.error('Error deploying commands:', error);
    }
  }
  
  /**
   * Sets the bot's presence.
   * @async
   * @returns {Promise<void>}
   */
  async function setPresence() {
    try {
      await client.user.setPresence({
        activities: [{ name: '✨😊🎤', type: ActivityType.Custom }],
        status: 'online',
      });
    } catch (error) {
      console.error('Error setting presence:', error);
    }
  }
  
  /**
   * Handles the 'ready' event.
   * @async
   * @returns {Promise<void>}
   */
  async function handleReady() {
    try {
      console.log(`Running on ${client.user.tag}!`);
      await setPresence();
  
      if (process.argv.includes('--deploy')) {
        await deployCommands();
      }
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }
  
  /**
   * Handles interaction creation events.
   * @param {Interaction} interaction The interaction that was created.
   * @async
   * @returns {Promise<void>}
   */
  async function handleInteractionCreate(interaction) {
    if (!interaction.isChatInputCommand()) return;
  
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
  
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error executing command ${interaction.commandName}:`, error);
      try {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  }
  
  
  // Load commands before the bot is ready
  loadCommands();
  
  client.once('ready', handleReady);
  client.on('interactionCreate', handleInteractionCreate);
  
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });
  
  client.login(process.env.TOKEN);