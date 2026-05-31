# Firebase Functions

This folder contains the production AI product analysis backend.

Set the OpenAI key as a Firebase Functions secret:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Deploy the function and hosting rewrite:

```bash
firebase deploy --only functions,hosting
```

For local testing, run the Firebase emulators and the Vite dev server. The Vite proxy sends `/api/analyze-product-image` to the local Functions emulator.
