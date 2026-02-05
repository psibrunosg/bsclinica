// firebase.js
// Importa as funções necessárias do Firebase (Versão Web/CDN)
// Estamos usando a versão 11.2.0 (compatível com 2026)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Configuração do Seu Projeto (Pegue esses dados no Console do Firebase)
// Vá em: Configurações do Projeto (engrenagem) -> Geral -> Seus aplicativos
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "bs-psicologia.firebaseapp.com",
  projectId: "bs-psicologia",
  storageBucket: "bs-psicologia.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Inicializa o app do Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços que vamos usar
// 'auth' será usado para login/cadastro
// 'db' será usado para salvar tarefas e dados dos pacientes
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
