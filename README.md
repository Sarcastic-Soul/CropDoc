<div align="center">

# 🌿 CropDoc

**Point your phone at a leaf and get an instant diagnosis and treatment plan, fully offline.**

![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.86-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

![TensorFlow Lite](https://img.shields.io/badge/TensorFlow_Lite-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![llama.cpp](https://img.shields.io/badge/llama.cpp-SmolLM2-8A2BE2?style=for-the-badge)
![Whisper](https://img.shields.io/badge/Whisper-Speech_to_text-412991?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Gemini-Optional-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

![Offline first](https://img.shields.io/badge/100%25-Offline_first-2E7D32?style=flat-square)
![Languages](https://img.shields.io/badge/Languages-11-2E7D32?style=flat-square)
![Classes](https://img.shields.io/badge/Diseases-38_classes-2E7D32?style=flat-square)
[![Hackathon](https://img.shields.io/badge/NextStep_Hacks-2026-2E7D32?style=flat-square)](https://devpost.com/software/cropdoc-pcnmez)

[![Download APK](https://img.shields.io/github/v/release/Sarcastic-Soul/CropDoc?label=Download%20APK&logo=android&style=for-the-badge&color=2E7D32)](https://github.com/Sarcastic-Soul/CropDoc/releases/latest)
[![Watch the demo](https://img.shields.io/badge/Watch_the_demo-2:18-2E7D32?style=for-the-badge&logo=youtube&logoColor=white)](https://github.com/Sarcastic-Soul/CropDoc/releases/download/v1.0.0/CropDoc-demo.mp4)
[![Devpost](https://img.shields.io/badge/Devpost-Submission-003E54?style=for-the-badge&logo=devpost&logoColor=white)](https://devpost.com/software/cropdoc-pcnmez)

<img src="docs/screenshots/01-home.png" width="200" alt="Home" />
<img src="docs/screenshots/03-diagnosis.png" width="200" alt="Diagnosis" />
<img src="docs/screenshots/08-ask-answer.png" width="200" alt="Offline AI assistant" />

[Download](https://github.com/Sarcastic-Soul/CropDoc/releases/latest) · [Demo video](https://github.com/Sarcastic-Soul/CropDoc/releases/download/v1.0.0/CropDoc-demo.mp4) · [Devpost](https://devpost.com/software/cropdoc-pcnmez) · [Features](#features) · [Screenshots](#screenshots) · [How it works](#how-it-works) · [Getting started](#getting-started) · [Tech notes](docs/TECHNICAL.md)

</div>

---

## 💡 Why CropDoc

- 🌾 Farmers who can't tell one leaf disease from another often spray broad-spectrum chemicals. That costs money, harms soil and water, and often misses the real problem.
- 📵 Most diagnosis apps need a good data connection. Many fields don't have one.
- ✅ CropDoc runs everything on the phone. It names the specific disease, suggests a targeted treatment and works out the dose, **so farmers spray less and spray the right thing.**

Built for **NextStep Hacks 2026**, theme *Earth Forward*, Machine Learning / AI track. See the **[Devpost submission](https://devpost.com/software/cropdoc-pcnmez)**.

<a id="features"></a>

## ✨ Features

- 📸 **Instant offline diagnosis**: an on-device MobileNetV2 identifies 38 conditions across 14 crops, with a confidence score and treatment steps.
- 🗂️ **Batch field scanning**: scan leaf after leaf, then get a summary of the worst finding and a count for each disease.
- 📈 **Plot tracking**: tag scans by plot (e.g. *North Field - Row 3*) and see whether it's improving or getting worse.
- 🧪 **Dosage calculator**: enter a plot size (m², ha or acres) or a plant count to get how much product and water to mix.
- 🏷️ **Label scanner**: on-device OCR reads a pesticide label and checks its dose against the typical rate.
- 🤖 **Ask, an offline AI assistant**: a small LLM that runs on the phone, grounded in CropDoc's treatment data. You can attach any past scan to a question.
- 🎙️ **Voice in, voice out**: ask questions out loud and hear the answers read back.
- 🌍 **11 languages**: English, Hindi, Spanish, Mandarin, Portuguese, Bengali, Indonesian, Swahili, Vietnamese, French and Urdu (RTL).
- ☁️ **Optional Gemini second opinion**: a richer explanation of a diagnosis when you're online. The app never depends on it.

<a id="screenshots"></a>

## 📱 Screenshots

### Diagnosis & tracking

| Diagnosis | Treatment | History | Plot progress |
| :---: | :---: | :---: | :---: |
| <img src="docs/screenshots/03-diagnosis.png" width="180" /> | <img src="docs/screenshots/04-treatment.png" width="180" /> | <img src="docs/screenshots/02-history.png" width="180" /> | <img src="docs/screenshots/05-plot-progress.png" width="180" /> |

### Offline vs. Gemini second opinion

| 📴 Offline only (always available) | ☁️ With Gemini (online, optional) |
| :---: | :---: |
| <img src="docs/screenshots/04-treatment.png" width="240" /> | <img src="docs/screenshots/15-diagnosis-gemini.png" width="240" /> |
| Diagnosis + standard treatment steps | Checks the photo, explains the spread, adds tailored tips |

### Dosage calculator

| By plot area | By plant count |
| :---: | :---: |
| <img src="docs/screenshots/06-dosage-area.png" width="200" /> | <img src="docs/screenshots/07-dosage-plants.png" width="200" /> |

### Ask: offline AI assistant

| Answer | Attach a scan | Scan-aware answer | Chat history |
| :---: | :---: | :---: | :---: |
| <img src="docs/screenshots/08-ask-answer.png" width="180" /> | <img src="docs/screenshots/09-ask-attach-picker.png" width="180" /> | <img src="docs/screenshots/10-ask-attached-scan.png" width="180" /> | <img src="docs/screenshots/11-ask-chat-history.png" width="180" /> |

### Languages & settings

| Hindi | Language picker | Settings |
| :---: | :---: | :---: |
| <img src="docs/screenshots/14-diagnosis-hindi.png" width="180" /> | <img src="docs/screenshots/13-language-picker.png" width="180" /> | <img src="docs/screenshots/12-settings.png" width="180" /> |

<a id="how-it-works"></a>

## ⚙️ How it works

```
Photo
  │  crop & resize to 224×224, normalize
  ▼
MobileNetV2 (TFLite, on-device) ──► disease + confidence
  │
  ├──► Treatment steps         11 languages, offline
  ├──► Dosage + label OCR      ML Kit, offline
  ├──► Ask assistant           SmolLM2 via llama.rn, offline
  └──► Gemini second opinion   optional, online only
```

- 🧠 **Classifier**: MobileNetV2 fine-tuned on PlantVillage (~95% eval accuracy), converted from PyTorch to TFLite.
- 💬 **Assistant**: SmolLM2-360M through `llama.rn`, with vector search over the treatment data to ground its answers.
- 🗣️ **Speech**: Whisper tiny through `whisper.rn` for voice input, and the phone's built-in text-to-speech for replies.
- 📦 The diagnosis model ships with the app. The assistant (~370 MB) and speech model (~78 MB) are **optional one-time downloads**.

**Supported crops:** Apple · Blueberry · Cherry · Corn · Grape · Orange · Peach · Bell pepper · Potato · Raspberry · Soybean · Squash · Strawberry · Tomato

<a id="getting-started"></a>

## 🚀 Getting started

### Install the app

- 📥 Download the latest APK from **[Releases](https://github.com/Sarcastic-Soul/CropDoc/releases/latest)** and open it on your phone. You'll need to allow installs from your browser or file manager.
- 📱 Needs an arm64 Android phone, which covers virtually every modern one.

### Build from source

> [!NOTE]
> Android only. CropDoc uses native modules, so it **won't run in Expo Go**. You need a development build.

```sh
npm install

npm run android:lite     # build & install on a USB-connected phone (resource-capped)
# or: npx eas build --profile development --platform android

npm run start            # start Metro, then open the app on your phone
```

- 🐢 The first build is slow because `whisper.rn` compiles whisper.cpp from source.
- 📱 You need an arm64 Android phone, which covers virtually every modern one.

## 🗂️ Project structure

```
src/app/          screens: tabs (Home, History, Dosage, Ask), result, camera, plot, settings
src/components/   shared UI
src/lib/model/    preprocessing, TFLite inference, labels, treatments
src/lib/llm/      chat model download, engine, embeddings, retrieval
src/lib/stt/      Whisper speech-to-text
src/lib/dosage/   dose maths and label OCR
src/lib/i18n/     translations
assets/model/     model.tflite + per-language treatment data
```

## 🔒 Privacy & limitations

- 🔐 Photos, history and chats **stay on the phone**. The only network calls are the optional model downloads, and Gemini, which gets a photo only when you tap *Ask Gemini* for it.
- 🔑 You bring your own Gemini key. It's stored encrypted in the Android Keystore and never bundled with the app.
- 🍃 The model was trained on single leaves against plain backgrounds, so photograph one leaf that fills the frame.
- ⚠️ Dosage figures are **typical label rates**. Always follow the label on your product.
- 🤏 The 360M-parameter assistant can make mistakes. Check important decisions with an agricultural extension officer.
- 🌐 The translations are machine-generated and haven't been reviewed by native speakers yet.

---

<div align="center">

📖 Implementation details: **[docs/TECHNICAL.md](docs/TECHNICAL.md)**

</div>
