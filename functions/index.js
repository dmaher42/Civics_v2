/**
 * Quick start:
 * 1) In Google Cloud Console, enable APIs: Docs API + Drive API
 * 2) Share students' Docs or the target folder with your Firebase service account:
 *    {project-id}@appspot.gserviceaccount.com  (Editor)
 * 3) Deploy: firebase deploy --only functions
 *
 * Frontend will call: httpsCallable('transferToDoc') with { content }
 *
 * README-style checklist:
 * - Enable Docs + Drive APIs for the Firebase project.
 * - Share each student Doc with {project-id}@appspot.gserviceaccount.com (Editor).
 * - Deploy via `cd functions && npm i && firebase deploy --only functions`.
 * - Update the Firebase web config injected on week1.html.
 */

const { onCall } = require("firebase-functions/v2/https");
const { getApp, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { google } = require("googleapis");
const { GoogleAuth } = require("googleapis-common");

if (!getApps().length) initializeApp();

async function getClients() {
  const auth = new GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive"
    ],
  });
  const client = await auth.getClient();
  return {
    docs: google.docs({ version: "v1", auth: client }),
  };
}

const safe = (s) => (typeof s === "string" ? s : "");

exports.transferToDoc = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid;
  const email = req.auth?.token?.email || "Student";
  if (!uid) throw new Error("Unauthenticated.");

  const content = safe(req.data?.content);
  if (!content) throw new Error("No content.");

  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) throw new Error("No user profile found.");
  const docId = userSnap.data()?.docId;
  if (!docId) throw new Error("No Google Doc saved for this user.");

  const { docs } = await getClients();
  const now = new Date().toISOString();
  const header = `Submission from ${email} — ${now}\n\n`;

  // Append at end (avoids overwriting teacher instructions)
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        { insertText: { endOfSegmentLocation: {}, text: header + content + "\n\n" } }
      ]
    }
  });

  return { ok: true };
});
