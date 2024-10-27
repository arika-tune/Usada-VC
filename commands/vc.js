/**
 * @fileoverview Handles voice conversion commands.
 * @author arika-tune
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Valid audio file extensions.
 * @const {Array<string>}
 */
const VALID_AUDIO_EXTENSIONS = ['.wav'];

/**
 * Maximum allowed audio duration in seconds.
 * @const {number}
 */
const MAX_AUDIO_DURATION = 30;

/**
 * Default diffusion steps for singing mode.
 * @const {number}
 */
const DEFAULT_SINGING_DIFFUSION_STEPS = 60;

/**
 * Default diffusion steps for non-singing mode.
 * @const {number}
 */
const DEFAULT_NON_SINGING_DIFFUSION_STEPS = 25;


/**
 * Handles the voice conversion command.
 * @param {CommandInteraction} interaction The interaction object.
 * @return {Promise<void>}
 */
async function execute(interaction) {
  await interaction.deferReply();
  let tempDir = '';

  try {
    tempDir = createTempDir();
    const { sourcePath, targetPath, singing, diffusionSteps, semiToneShift } =
      await processInteractionOptions(interaction, tempDir);

    const command = buildConversionCommand(
      sourcePath, targetPath, tempDir, singing, diffusionSteps,
      semiToneShift);
    await executeConversion(command, interaction, tempDir);
  } catch (error) {
    console.error('Error in convert command:', error);
    await interaction.editReply(`Error: ${error.message}`)
      .catch(console.error);
  } finally {
    cleanupTempDir(tempDir);
  }
}


/**
 * Processes the interaction options and validates them.
 * @param {CommandInteraction} interaction The interaction object.
 * @param {string} tempDir The temporary directory path.
 * @return {Promise<Object>} An object containing the processed options.
 * @throws {Error} If validation fails.
 */
async function processInteractionOptions(interaction, tempDir) {
  const source = interaction.options.getAttachment('source');
  const target = interaction.options.getAttachment('target');
  const singing = interaction.options.getBoolean('singing');
  let diffusionSteps = interaction.options.getInteger('diffusion_steps');
  const semiToneShift = interaction.options.getInteger('semi_tone_shift') || 0;

  validateAudioFile(source);
  validateAudioFile(target);

  if (!singing && semiToneShift !== 0) {
    throw new Error('Semi-tone shift can only be used with singing mode.');
  }

  diffusionSteps = determineDiffusionSteps(singing, diffusionSteps);

  const sourcePath = await downloadFile(source.url, tempDir, 'source');
  const targetPath = await downloadFile(target.url, tempDir, 'target');

  await validateAudioDuration(sourcePath, 'source');
  await validateAudioDuration(targetPath, 'target');

  return { sourcePath, targetPath, singing, diffusionSteps, semiToneShift };
}


/**
 * Creates a temporary directory.
 * @return {string} The path to the temporary directory.
 */
function createTempDir() {
  const tempDir =
    path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'discord-bot-temp',
      uuidv4());
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}


/**
 * Cleans up the temporary directory.
 * @param {string} dir The path to the temporary directory.
 */
function cleanupTempDir(dir) {
  if (dir) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}


/**
 * Validates the audio file extension.
 * @param {Object} file The file attachment object.
 * @throws {Error} If the file extension is invalid.
 */
function validateAudioFile(file) {
  if (!VALID_AUDIO_EXTENSIONS.some(
    (ext) => file.name.toLowerCase().endsWith(ext))) {
    throw new Error('Invalid audio file format.');
  }
}


/**
 * Downloads a file from a URL to the specified directory.
 * @param {string} url The URL of the file.
 * @param {string} dir The directory to save the file to.
 * @param {string} prefix The filename prefix.
 * @return {Promise<string>} The path to the downloaded file.
 */
async function downloadFile(url, dir, prefix) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const filePath = path.join(dir, `${prefix}_${uuidv4()}.wav`);
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return filePath;
}


/**
 * Determines the diffusion steps based on singing mode and user input.
 * @param {boolean} singing Whether singing mode is enabled.
 * @param {number|null} diffusionSteps The user-specified diffusion steps.
 * @return {number} The determined diffusion steps.
 */
function determineDiffusionSteps(singing, diffusionSteps) {
  if (singing && diffusionSteps === null) {
    return DEFAULT_SINGING_DIFFUSION_STEPS;
  } else if (diffusionSteps === null) {
    return DEFAULT_NON_SINGING_DIFFUSION_STEPS;
  }
  return diffusionSteps;
}


/**
 * Validates the duration of an audio file.
 * @param {string} filePath The path to the audio file.
 * @param {string} fileName The name of the audio file (for error messages).
 * @return {Promise<void>}
 * @throws {Error} If the audio duration exceeds the maximum allowed.
 */
async function validateAudioDuration(filePath, fileName) {
  const duration = await getAudioDuration(filePath);
  if (duration > MAX_AUDIO_DURATION) {
    throw new Error(
      `The ${fileName} audio file exceeds the maximum duration of ${MAX_AUDIO_DURATION} seconds.`);
  }
}


/**
 * Builds the voice conversion command.
 * @param {string} sourcePath Path to the source audio file.
 * @param {string} targetPath Path to the target audio file.
 * @param {string} outputDir Path to the output directory.
 * @param {boolean} singing Singing mode flag.
 * @param {number} diffusionSteps Number of diffusion steps.
 * @param {number} semiToneShift Semi-tone shift value.
 * @return {string} The constructed command string.
 */
function buildConversionCommand(
  sourcePath, targetPath, outputDir, singing, diffusionSteps,
  semiToneShift) {
  const pythonPath =
    path.join(process.cwd(), 'conversion', 'seed', 'env', 'Scripts',
      'python.exe');
  const scriptPath =
    path.join(process.cwd(), 'conversion', 'seed', 'inference.py');

  const command = [
    `"${pythonPath}"`, `"${scriptPath}"`, `--source "${sourcePath}"`,
    `--target "${targetPath}"`, `--output "${outputDir}"`,
    `--diffusion-steps ${diffusionSteps}`, `--length-adjust 1.0`,
    `--inference-cfg-rate 0.7`,
  ];

  if (singing) {
    command.push(`--f0-condition true`);
    command.push(`--semi-tone-shift ${semiToneShift}`);
  } else {
    command.push(`--auto-f0-adjust true`);
  }

  return command.join(' ');
}


/**
 * Executes the voice conversion command and sends the result.
 * @param {string} command The command to execute.
 * @param {CommandInteraction} interaction The interaction object.
 * @param {string} tempDir The temporary directory path.
 * @return {Promise<void>}
 * @throws {Error} If the output file is not found or an execution error occurs.
 */
async function executeConversion(command, interaction, tempDir) {
  const {} = await executeCommand(command);

  const outputFile =
    fs.readdirSync(tempDir).find((file) => file.startsWith('vc_'));
  if (!outputFile) {
    throw new Error('Output file not found.');
  }

  await interaction.editReply({
    content: 'Voice conversion complete!',
    files: [path.join(tempDir, outputFile)],
  });
}


/**
 * Executes a command.
 * @param {string} command The command to execute.
 * @return {Promise<Object>} An object containing the stdout and stderr.
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        console.error('Execution error:', error);
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}


/**
 * Gets the duration of an audio file.
 * @param {string} filePath The path to the audio file.
 * @return {Promise<number>} The duration of the audio file in seconds.
 */
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`,
      (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(parseFloat(stdout));
        }
      });
  });
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('conversion')
    .setDescription('Convert voice using seed.')
    .addAttachmentOption((option) => option.setName('source')
      .setDescription('The source audio file.')
      .setRequired(true))
    .addAttachmentOption((option) => option.setName('target')
      .setDescription('The target audio file.')
      .setRequired(true))
    .addBooleanOption((option) => option.setName('singing')
      .setDescription('Enable singing mode.')
      .setRequired(true))
    .addIntegerOption((option) => option.setName('diffusion_steps')
      .setDescription('Number of diffusion steps (1-100).')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100))
    .addIntegerOption(
      (option) => option.setName('semi_tone_shift')
        .setDescription('Semi-tone shift (singing mode only).')
        .setRequired(false)),
  execute,
};