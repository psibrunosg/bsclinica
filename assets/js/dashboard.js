// Arquivo: assets/js/dashboard.js

import { auth, db } from '../firebase.js'; // Note o "../" para voltar para a pasta assets
import { signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// --- 1. Verificação de Segurança (Auth Guard) ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Se não estiver logado, manda pro login
        window.location.href = "index.html";
        return;
    }

    // Tenta buscar o nome do Líder para exibir na tela
    // Colocamos num try/catch para não travar a tela se der erro de permissão
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Atualiza o nome na saudação (Ex: "Olá, Bruno!")
            const nomeDisplay = document.getElementById('adminName');
            if(nomeDisplay) nomeDisplay.innerText = data.nome || "Líder";
            
            // --- TRAVA DE SEGURANÇA DESATIVADA TEMPORARIAMENTE ---
            // Isso permite que você acesse o painel mesmo se o banco
            // ainda não tiver atualizado seu status para "lider"
            /*
            if(data.role !== 'lider') {
                alert("Acesso negado. Apenas líderes podem ver este painel.");
                window.location.href = "index.html";
            }
            */
        }
    } catch (error) {
        console.warn("Aviso: Não foi possível ler os dados do usuário, mas o acesso foi liberado.", error);
    }
});

// --- 2. Função de Navegação (Menu e Abas) ---
// Precisamos anexar ao 'window' para o HTML conseguir chamar no onclick
window.mostrarSecao = function(idSecao, elementoMenu) {
    // Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    
    // Remove classe 'active' de todos os itens do menu
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Mostra a seção desejada e ativa o menu
    const secao = document.getElementById(idSecao);
    if(secao) secao.classList.add('active');
    
    if(elementoMenu) {
        elementoMenu.classList.add('active');
    }
}

// --- 3. Carregar Lista de Psicólogos (Tempo Real) ---
function carregarEquipe() {
    const listaPsi = document.getElementById('lista-psi');
    if(!listaPsi) return;

    // Query: Quero todos os usuários onde 'role' é igual a 'psi'
    const q = query(collection(db, "users"), where("role", "==", "psi"));
    
    // onSnapshot: O Firebase avisa sempre que algo mudar no banco
    onSnapshot(q, (querySnapshot) => {
        listaPsi.innerHTML = ""; // Limpa a lista
        let totalPsi = 0;

        querySnapshot.forEach((doc) => {
            totalPsi++;
            const data = doc.data();
            
            // Simulação de status (Futuramente ligaremos à agenda real)
            const isOnline = Math.random() > 0.5; 
            const statusHtml = isOnline 
                ? `<span class="status-badge status-online"></span> Disponível`
                : `<span class="status-badge status-busy"></span> Em atendimento`;

            const row = `
                <tr>
                    <td>${statusHtml}</td>
                    <td><strong>${data.nome}</strong></td>
                    <td>${data.crp || '-'}</td>
                    <td>${data.abordagem || 'TCC'}</td>
                </tr>
            `;
            listaPsi.innerHTML += row;
        });
        
        // Atualiza o contador no card do topo se ele existir
        const contador = document.getElementById('count-psi');
        if(contador) contador.innerText = totalPsi;
    });
}

// --- 4. Renderizar Salas (Simulação Visual) ---
function renderizarSalas() {
    const container = document.getElementById('grid-salas');
    if(!container) return;

    // Dados mocados (falsos) por enquanto, até criarmos a collection "agenda"
    const salas = [
        { nome: "Sala 01 - Acolhimento", ocupada: true, psi: "Dra. Ana" },
        { nome: "Sala 02 - TCC", ocupada: false, psi: null },
        { nome: "Sala 03 - Infantil", ocupada: true, psi: "Dr. Pedro" },
        { nome: "Sala 04 - Grupo", ocupada: false, psi: null },
        { nome: "Sala 05 - Online", ocupada: true, psi: "Dr. Bruno" },
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
                <p style="font-size: 0.9rem; margin-top: 5px;">
                    ${sala.ocupada ? `<strong style="color:#e74c3c">${sala.psi}</strong>` : '<span style="color:green">Livre</span>'}
                </p>
            </div>
        `;
        container.innerHTML += card;
    });
    
    const countSalas = document.getElementById('count-salas');
    if(countSalas) countSalas.innerText = `${ocupadas}/${salas.length}`;
}

// --- 5. Lógica de Novo Cadastro (Interno) ---
const formCadastro = document.getElementById('internalRegisterForm');
if(formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = formCadastro.querySelector('button');
        const txtOriginal = btn.innerText;
        btn.innerText = "Salvando...";
        btn.disabled = true;

        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const nome = document.getElementById('reg-name').value;
        const role = document.getElementById('reg-role').value;
        const phone = document.getElementById('reg-phone').value;
        
        // Dados extras se for psicólogo
        const crpInput = document.getElementById('reg-crp');
        const abordagemInput = document.getElementById('reg-abordagem');
        const crp = crpInput ? crpInput.value : "";
        const abordagem = abordagemInput ? abordagemInput.value : "";

        try {
            // AVISO: Criar usuário no Client-side desloga o atual.
            if(!confirm("Ao criar um novo usuário, o sistema precisará fazer logout da sua conta administrativa por segurança (limitação do Firebase Web). Deseja continuar e logar novamente?")) {
                throw new Error("Cancelado pelo usuário.");
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const newUser = userCredential.user;

            // Salva os detalhes no Firestore
            await setDoc(doc(db, "users", newUser.uid), {
                uid: newUser.uid,
                nome: nome,
                email: email,
                role: role,
                telefone: phone,
                crp: role === 'psi' ? crp : null,
                abordagem: role === 'psi' ? abordagem : null,
                criadoEm: serverTimestamp()
            });

            alert("Cadastro realizado com sucesso! Faça login novamente como Líder.");
            window.location.href = "index.html";

        } catch (error) {
            console.error(error);
            // Tratamento de mensagem de erro simples
            if (error.message !== "Cancelado pelo usuário.") {
                alert("Erro ao cadastrar: " + error.message);
            }
        } finally {
            btn.innerText = txtOriginal;
            btn.disabled = false;
        }
    });
}

// --- 6. Controle de Exibição de Campos (Psi vs Outros) ---
const selectRole = document.getElementById('reg-role');
if(selectRole) {
    selectRole.addEventListener('change', function() {
        const areaPsi = document.getElementById('reg-psi-extras');
        if(areaPsi) {
            if(this.value === 'psi') {
                areaPsi.style.display = 'block';
            } else {
                areaPsi.style.display = 'none';
            }
        }
    });
}

// --- 7. Logout ---
const btnLogout = document.getElementById('btnLogout');
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}

// Inicializa as funções ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    carregarEquipe();
    renderizarSalas();
});
