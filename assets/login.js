// Arquivo: assets/js/login.js

// Importações
// Note o "../" para subir da pasta "js" para a pasta "assets"
import { auth, db } from 'firebase.js'; 
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Elementos da DOM
const feedbackBox = document.getElementById('feedback-msg');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const btnLogin = document.querySelector('button[type="submit"]');

// Função de Feedback Visual
function mostrarMensagem(texto, tipo) {
    if (!feedbackBox) return;
    
    feedbackBox.style.display = 'block';
    feedbackBox.innerText = texto;
    
    if (tipo === 'erro') {
        feedbackBox.style.backgroundColor = '#ffebee';
        feedbackBox.style.color = '#c62828';
        feedbackBox.style.border = '1px solid #ffcdd2';
    } else {
        feedbackBox.style.backgroundColor = '#e8f5e9';
        feedbackBox.style.color = '#2e7d32';
        feedbackBox.style.border = '1px solid #c8e6c9';
    }
}

// --- LÓGICA DE LOGIN ---
const formLogin = document.getElementById('loginForm');
if(formLogin) {
    formLogin.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btnTextoOriginal = btnLogin.innerText;

        try {
            // 1. Loading
            btnLogin.innerText = "Verificando...";
            btnLogin.disabled = true;
            btnLogin.style.opacity = "0.7";
            feedbackBox.style.display = 'none';

            // 2. Autenticação Firebase
            const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
            const user = userCredential.user;

            btnLogin.innerText = "Identificando...";

            // 3. Triagem de Cargo (Role)
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                const cargo = userData.role;

                mostrarMensagem(`Bem-vindo, ${userData.nome || 'Usuário'}!`, "sucesso");

                // 4. Redirecionamento
                setTimeout(() => {
                    if (cargo === 'lider' || cargo === 'psi' || cargo === 'recep') {
                        window.location.href = "dashboard-lider.html";
                    } else if (cargo === 'paciente') {
                        // Trava temporária para pacientes
                        mostrarMensagem("Área do paciente em manutenção.", "erro");
                        btnLogin.innerText = "Acesso Restrito";
                    } else {
                        mostrarMensagem("Perfil sem permissão.", "erro");
                    }
                }, 1000);

            } else {
                mostrarMensagem("Erro: Perfil não encontrado no banco.", "erro");
                resetBtn(btnLogin, btnTextoOriginal);
            }

        } catch (error) {
            console.error("Login Error:", error.code);
            let msg = "Erro ao entrar.";
            
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = "E-mail ou senha incorretos.";
            } else if (error.code === 'auth/too-many-requests') {
                msg = "Muitas tentativas. Aguarde um pouco.";
            } else if (error.code === 'auth/network-request-failed') {
                msg = "Verifique sua conexão.";
            }
            
            mostrarMensagem(msg, "erro");
            resetBtn(btnLogin, btnTextoOriginal);
        }
    });
}

// Helper para resetar botão
function resetBtn(btn, texto) {
    btn.innerText = texto;
    btn.disabled = false;
    btn.style.opacity = "1";
}

// --- RECUPERAR SENHA ---
const btnForgot = document.getElementById('btn-forgot');
if(btnForgot) {
    btnForgot.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value;

        if (!email) {
            mostrarMensagem("Digite seu e-mail no campo acima.", "erro");
            emailInput.focus();
            return;
        }

        if(!confirm(`Enviar link de redefinição para: ${email}?`)) return;

        try {
            await sendPasswordResetEmail(auth, email);
            mostrarMensagem(`E-mail de recuperação enviado!`, "sucesso");
        } catch (error) {
            mostrarMensagem("Erro ao enviar e-mail.", "erro");
        }
    });
}
