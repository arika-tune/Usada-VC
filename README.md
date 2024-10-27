# ✨ Usada-VC 🎤

[日本語](README_ja.md)

* Usada-VC is an application that uses Discord as an interface for seed.
> Currently released model supports zero-shot voice conversion 🔊 and zero-shot singing voice conversion 🎙. Without any training, it is able to clone a voice given a reference speech of 1~30 seconds.

## 🚀 How to Use

1. Prepare the source audio file you want to convert and the target audio file.
2. Execute the `/conversion` command with the following options:

    * **source:** Source audio file (required)
    * **target:** Target audio file (required)
    * **singing:** Enable singing mode or not (required, true/false)
    * **diffusion_steps:** Number of diffusion steps (1-100, optional)
    * **semi_tone_shift:** Semitone shift (singing mode only, optional)

![image](Screen.png)

3. Usada-VC will convert the audio and reply with the result.

## 🛠️ Installation

1. Clone this repository.
2. Install npm packages.
   ```bash
   npm install
   ```
3. Run `seed_setup.bat` in the `conversion` directory to set up the required environment.
4. Install the necessary libraries in the venv environment of `conversion\seed`.
   ```bash
   cd conversion\seed
   python -m venv env
   .\env\Scripts\activate
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the same directory as `index.js` and set the Discord Bot token to `TOKEN`.
5. For the first bot startup, run deploy_and_start.bat.
   Alternatively, run `index.js` with the `--deploy` argument to deploy commands to Discord.
   ```bash
   node index.js --deploy
   ```
5. (Only for the first time, model download will be automatically executed before starting voice conversion. This may take some time.)

## 💻 Environment

* Only Windows environment is supported.
* Python 3.10 environment is expected.
* Built using Node.js 20.17.

## 📝 Notes

* WAV format is supported for audio files.
* Semitone shift is only available in singing mode.
* The conversion process may take some time.
* Use at your own risk. By running this, you agree to use it at your own responsibility.
* I cannot guarantee that this repository will be maintained in the future.
	(I am already working on new inspiration)

## 🤝 Acknowledgments

The seed of this Usada-VC is forked from Plachtaa's repository. We express our great respect and gratitude ✨

---