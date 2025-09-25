// js/app-docs.js
// Minimal client for "Save Doc URL" + "Send to Google Doc"

// ---- CONFIG ----
// Either edit here, or inject via <script> that defines window.__firebase_config_json
const DEFAULT_CONFIG = {
  // TODO: replace with your Firebase web app keys
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  appId: "YOUR_APP_ID"
};

// DOM ids expected to exist in week1.html
const EL_IDS = {
  docUrlInput: "gcDocUrl",
  saveBtn: "gcSaveDocBtn",
  workInput: "gcWorkInput",
  sendBtn: "gcSendBtn",
  status: "portfolioStatus"
};

(async function init() {
  const cfg = window.__firebase_config_json ? JSON.parse(window.__firebase_config_json) : DEFAULT_CONFIG;

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } =
    await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
  const { getFirestore, doc, setDoc, getDoc } =
    await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
  const { getFunctions, httpsCallable } =
    await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js");

  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app);
  const callTransfer = httpsCallable(functions, "transferToDoc");

  const el = {};
  for (const k of Object.keys(EL_IDS)) el[k] = document.getElementById(EL_IDS[k]);

  // Simple auth UI hooks (optional: wire to your existing buttons)
  const topLoginBtn = document.getElementById("googleLoginTop");
  const topSignOutBtn = document.getElementById("signOutTop");

  const provider = new GoogleAuthProvider();

  async function ensureLogin() {
    if (auth.currentUser) return auth.currentUser;
    const { user } = await signInWithPopup(auth, provider);
    return user;
  }

  function updateStatus(text) {
    if (el.status) el.status.textContent = text;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      updateStatus(`Signed in as ${user.email}`);
      if (topLoginBtn) topLoginBtn.classList.add("hidden");
      if (topSignOutBtn) topSignOutBtn.classList.remove("hidden");

      // Load saved Doc ID to show a friendly message
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().docId) {
        el.docUrlInput?.setAttribute("data-has-doc", "true");
      }
    } else {
      updateStatus("Not signed in");
      if (topLoginBtn) topLoginBtn.classList.remove("hidden");
      if (topSignOutBtn) topSignOutBtn.classList.add("hidden");
    }
  });

  topLoginBtn?.addEventListener("click", () => ensureLogin());
  topSignOutBtn?.addEventListener("click", () => signOut(auth));

  // Save Doc URL (extract ID and store in /users/{uid})
  el.saveBtn?.addEventListener("click", async () => {
    const user = await ensureLogin();
    const url = (el.docUrlInput?.value || "").trim();
    const m = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!m) return alert("That doesn’t look like a Google Doc URL.");
    const docId = m[1];
    await setDoc(doc(db, "users", user.uid), { docId }, { merge: true });
    alert("Saved! Share your Doc with the Firebase service account (Editor) so the app can write to it.");
  });

  // Send to Google Doc
  el.sendBtn?.addEventListener("click", async () => {
    const user = await ensureLogin();
    const content = (el.workInput?.value || "").trim();
    if (!content) return alert("Write something first 😊");
    updateStatus("Sending...");
    try {
      await callTransfer({ content });
      updateStatus("Sent! Check your Google Doc.");
    } catch (e) {
      console.error(e);
      updateStatus("Error sending. Is your Doc shared with the service account?");
      alert("Error sending. Make sure your Doc is shared with the service account (Editor).");
    }
  });
})();
