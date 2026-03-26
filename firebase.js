import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "COLOCA_AQUI",
  authDomain: "COLOCA_AQUI",
  projectId: "COLOCA_AQUI",
  storageBucket: "COLOCA_AQUI",
  messagingSenderId: "COLOCA_AQUI",
  appId: "COLOCA_AQUI"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export async function uploadFile(file) {

  const storageRef = ref(storage, "formacoes/" + file.name);

  await uploadBytes(storageRef, file);

  const url = await getDownloadURL(storageRef);

  return url;
}
