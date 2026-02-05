// Arquivo: assets/js/dashboard.js

// Importações do Firebase
import { auth, db } from '../firebase.js'; 
import { signOut, onAuthStateChanged, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { initializeApp, getApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";

// --- 1. Verificação de Acesso ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // Busca dados do Líder (sem travas, apenas para exibir o nome)
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const nomeDisplay = document.getElementById('adminName');
            if(nomeDisplay) nomeDisplay.innerText = data.nome || "Líder";
        }
    } catch (error) {
        console.warn("Erro silencioso ao buscar nome:", error);
    }
});

// --- 2. Navegação (Abas) ---
window.mostrarSecao = function(idSecao, elementoMenu) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const secao = document.getElementById(idSecao);
    if(secao) secao.classList.add('active');
    
    if(elementoMenu) elementoMenu.classList.add('active');
}

// --- 3. Carregar Equipe (Realtime) ---
function carregarEquipe() {
    const listaPsi = document.getElementById('lista-psi');
    if(!listaPsi) return;

    // Busca Psis
    const q = query(collection(db, "users"), where("role", "==", "psi"));
    
    onSnapshot(q, (querySnapshot) => {
        listaPsi.innerHTML = ""; 
        let totalPsi = 0;

        querySnapshot.forEach((doc) => {
            totalPsi++;
            const data = doc.data();
            
            // Simulação de status
            const isOnline = Math.random() > 0.5; 
            const statusHtml = isOnline 
                ? `<span class="status-badge status-online"></span> Disponível`
                : `<span class="status-badge status-busy"></span> Em atendimento`;

            const row = `
                <tr>
                    <td>${statusHtml}</td>
                    <td><strong>${data.nome}</strong></td>
                    <td>${data.crp || '-'}</td>
                    <td>${data.abordagem || '-'}</td>
                </tr>
            `;
            listaPsi.innerHTML += row;
        });
        
        const contador = document.getElementById('count-psi');
        if(contador) contador.innerText = totalPsi;
    });
}

// --- 4. Renderizar Salas ---
function renderizarSalas() {
    const container = document.getElementById('grid-salas');
    if(!container) return;

    const salas = [
        { nome: "Sala 01", ocupada: true, psi: "Dra. Ana" },
        { nome: "Sala 02", ocupada: false, psi: null },
        { nome: "Sala 03", ocupada: false, psi: null },
    ];

    container.innerHTML = "";
    let ocupadas = 0;
    
    salas.forEach(sala => {
        if(sala.ocupada) ocupadas++;
        const card = `
            <div class="room-card ${sala.ocupada ? 'occupied' : ''}">
                <div style="font-size: 2rem; color: var(--color-primary); margin-bottom: 10px;">
                    <i class="fas fa-${sala.ocupada ? 'door-closed' : 'door-open'}"></i>
                </div>
                <h4>${sala.nome}</h4>
                <p style="font-size: 0.9rem;">
                    ${sala.ocupada ? `<strong style="color:#e74c3c">${sala.psi}</strong>` : '<span style="color:green">Livre</span>'}
                </p>
            </div>
        `;
        container.innerHTML += card;
    });

    const contadorSalas = document.getElementById('count-salas');
    if(contadorSalas) contadorSalas.innerText = `${ocupadas}/${salas.length}`;
}

// --- 5. CADASTRO (Sem Logout / Sem Alerts) ---
const formCadastro = document.getElementById('internalRegisterForm');
if(formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Elementos de UI
        const btn = formCadastro.querySelector('button');
        const errorMsg = document.getElementById('reg-error-msg');
        const txtOriginal = "Realizar Cadastro";
        
        // Feedback Visual
        btn.innerText = "Processando...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
        errorMsg.style.display = "none";

        // Coleta dados
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const nome = document.getElementById('reg-name').value;
        const role = document.getElementById('reg-role').value;
        const phone = document.getElementById('reg-phone').value;
        const crp = document.getElementById('reg-crp')?.value || "";
        const abordagem = document.getElementById('reg-abordagem')?.value || "";

        let secondaryApp = null;

        try {
            // Inicializa App Secundário (Fantasma)
            const config = getApp().options;
            secondaryApp = initializeApp(config, "RegistradorTemporario");
            const secondaryAuth = getAuth(secondaryApp);

            // Cria usuário no Auth (No app fantasma)
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            const newUser = userCredential.user;

            // Salva no Banco (Com suas credenciais de Líder)
            await setDoc(doc(db, "users", newUser.uid), {
                uid: newUser.uid,
                nome: nome,
                email: email,
                role: role,
                telefone: phone,
                crp: role === 'psi' ? crp : null,
                abordagem: role === 'psi' ? abordagem : null,
                criadoPor: auth.currentUser.uid,
                criadoEm: serverTimestamp()
            });

            // Sucesso Visual
            btn.innerText = "Cadastrado com Sucesso!";
            btn.style.backgroundColor = "var(--color-success)";
            formCadastro.reset();
            
            // Volta o botão ao normal após 3 segundos
            setTimeout(() => {
                btn.innerText = txtOriginal;
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.backgroundColor = ""; // Volta a cor original do CSS
            }, 3000);

        } catch (error) {
            console.error(error);
            // Erro Visual
            btn.innerText = "Erro ao Cadastrar";
            btn.style.backgroundColor = "#e74c3c"; // Vermelho
            errorMsg.innerText = "Erro: " + error.code; // Mostra código técnico discretamente
            errorMsg.style.display = "block";
            
            setTimeout(() => {
                btn.innerText = txtOriginal;
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.backgroundColor = "";
            }, 3000);
        } finally {
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
        }
    });
}

// --- 6. Controle de UI ---
const selectRole = document.getElementById('reg-role');
if(selectRole) {
    selectRole.addEventListener('change', function() {
        const areaPsi = document.getElementById('reg-psi-extras');
        if(areaPsi) {
            this.value === 'psi' ? areaPsi.style.display = 'block' : areaPsi.style.display = 'none';
        }
    });
}

const btnLogout = document.getElementById('btnLogout');
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth).then(() => { window.location.href = "index.html"; });
    });
}

// Start
document.addEventListener("DOMContentLoaded", () => {
    carregarEquipe();
    renderizarSalas();
});
