// Arquivo: assets/js/dashboard.js

// Importações do Firebase
import { auth, db } from '../firebase.js'; 
import { signOut, onAuthStateChanged, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
mport { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
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
    if (idSecao === 'sec-agenda' && calendar) {
        setTimeout(() => { calendar.render(); }, 200); // Força redesenhar
    }
    if(elementoMenu) elementoMenu.classList.add('active');
}

// --- 3. Carregar Equipe (Realtime) ---
// --- IMPORTANTE: Adicione 'deleteDoc' na primeira linha de imports do arquivo ---
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";


// --- 3. Carregar Equipe (Psicólogos e Recepcionistas) ---
function carregarEquipe() {
    // A) LISTAR PSICÓLOGOS
    const listaPsi = document.getElementById('lista-psi');
    if (listaPsi) {
        const qPsi = query(collection(db, "users"), where("role", "==", "psi"));
        
        onSnapshot(qPsi, (snapshot) => {
            listaPsi.innerHTML = "";
            
            if(snapshot.empty){
                listaPsi.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999;">Nenhum psicólogo cadastrado.</td></tr>`;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                // Status simulado (depois virá da agenda)
                const isOnline = Math.random() > 0.3; 
                const statusHtml = isOnline 
                    ? `<span class="status-badge status-online"></span> <small>Disponível</small>`
                    : `<span class="status-badge status-busy"></span> <small>Em atendimento</small>`;

                // ... dentro do loop dos Psicólogos
                const row = `
                    <tr>
                        <td>${statusHtml}</td>
                        <td style="font-weight: 600; color: var(--color-primary);">${data.nome}</td>
                        <td>${data.crp || '-'}</td>
                        <td>${data.abordagem || '-'}</td>
                        <td style="text-align: right;">
                            <button onclick="abrirEditor('${doc.id}')" style="background:none; border:none; color:#2980b9; cursor:pointer; margin-right: 10px;" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="excluirUsuario('${doc.id}', '${data.nome}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;" title="Excluir">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
                listaPsi.innerHTML += row;
            });
            // Atualiza contador do topo
            const countPsi = document.getElementById('count-psi');
            if(countPsi) countPsi.innerText = snapshot.size;
        });
    }

    // B) LISTAR RECEPCIONISTAS
    const listaRecep = document.getElementById('lista-recep');
    if (listaRecep) {
        const qRecep = query(collection(db, "users"), where("role", "==", "recep"));
        
        onSnapshot(qRecep, (snapshot) => {
            listaRecep.innerHTML = "";
            
            if(snapshot.empty){
                listaRecep.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999;">Nenhuma recepcionista cadastrada.</td></tr>`;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                // ... dentro do loop dos Recepcionista
                const row = `
                    <tr>
                        <td>${statusHtml}</td>
                        <td style="font-weight: 600; color: var(--color-primary);">${data.nome}</td>
                        <td>${data.crp || '-'}</td>
                        <td>${data.abordagem || '-'}</td>
                        <td style="text-align: right;">
                            <button onclick="abrirEditor('${doc.id}')" style="background:none; border:none; color:#2980b9; cursor:pointer; margin-right: 10px;" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="excluirUsuario('${doc.id}', '${data.nome}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;" title="Excluir">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
                listaRecep.innerHTML += row;
            });
        });
    }
}

// --- Função Extra: Excluir Usuário ---
// Colocamos no window para o HTML conseguir enxergar
window.excluirUsuario = async function(uid, nome) {
    if(confirm(`Tem certeza que deseja remover ${nome} da equipe?\nEssa ação não pode ser desfeita.`)) {
        try {
            await deleteDoc(doc(db, "users", uid));
            // O onSnapshot vai atualizar a tabela sozinho automaticamente!
            alert("Usuário removido.");
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir: " + error.message);
        }
    }
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
// --- FUNÇÕES DE EDIÇÃO ---

// 1. Abrir o Modal e Carregar Dados
window.abrirEditor = async function(uid) {
    const modal = document.getElementById('modal-editar');
    const form = document.getElementById('form-editar');
    
    // Mostra carregando...
    modal.style.display = 'flex';
    
    try {
        // Busca os dados atuais do usuário no banco
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Preenche os campos
            document.getElementById('edit-uid').value = uid;
            document.getElementById('edit-role').value = data.role;
            document.getElementById('edit-nome').value = data.nome;
            document.getElementById('edit-telefone').value = data.telefone || '';
            
            // Se for Psi, mostra e preenche campos extras
            const areaPsi = document.getElementById('edit-extras-psi');
            if (data.role === 'psi') {
                areaPsi.style.display = 'block';
                document.getElementById('edit-crp').value = data.crp || '';
                document.getElementById('edit-abordagem').value = data.abordagem || '';
            } else {
                areaPsi.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Erro ao abrir editor:", error);
        alert("Erro ao carregar dados do usuário.");
        fecharModal();
    }
}

// 2. Fechar Modal
window.fecharModal = function() {
    document.getElementById('modal-editar').style.display = 'none';
}

// 3. Salvar Edição
const formEditar = document.getElementById('form-editar');
if(formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = formEditar.querySelector('button[type="submit"]');
        const txtOriginal = btn.innerText;
        btn.innerText = "Salvando...";
        btn.disabled = true;

        const uid = document.getElementById('edit-uid').value;
        const role = document.getElementById('edit-role').value;
        
        // Objeto com os dados básicos
        const dadosAtualizados = {
            nome: document.getElementById('edit-nome').value,
            telefone: document.getElementById('edit-telefone').value
        };

        // Se for Psi, adiciona os extras
        if (role === 'psi') {
            dadosAtualizados.crp = document.getElementById('edit-crp').value;
            dadosAtualizados.abordagem = document.getElementById('edit-abordagem').value;
        }

        try {
            // Atualiza no Firestore
            const docRef = doc(db, "users", uid);
            await updateDoc(docRef, dadosAtualizados);
            
            alert("Dados atualizados com sucesso!");
            fecharModal();
            
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            btn.innerText = txtOriginal;
            btn.disabled = false;
        }
    });
}
// --- AGENDA & FULLCALENDAR ---

let calendar; // Variável global para o calendário

function inicializarAgenda() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // 1. Configuração do FullCalendar
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', // Começa vendo o Mês
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'pt-br', // Tradução
        editable: true,  // Permite arrastar (futuro)
        selectable: true, // Permite clicar na data vazia
        
        // Clicar em dia vazio -> Novo Agendamento
        dateClick: function(info) {
            abrirModalAgenda(null, info.dateStr);
        },

        // Clicar em evento existente -> Editar/Excluir
        eventClick: function(info) {
            abrirModalAgenda(info.event);
        },

        // Carregar eventos do Firestore
        events: async function(info, successCallback, failureCallback) {
            try {
                // Busca agendamentos no banco
                const q = query(collection(db, "agendamentos"));
                
                // Realtime Listener
                onSnapshot(q, (snapshot) => {
                    const eventos = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            title: `${data.paciente} (${data.psiNome})`, // O que aparece no bloco
                            start: `${data.data}T${data.hora}`, // Formato ISO
                            backgroundColor: definirCorPorTipo(data.tipo),
                            extendedProps: { ...data } // Guarda dados extras
                        };
                    });
                    successCallback(eventos);
                });
            } catch (error) {
                console.error("Erro agenda:", error);
                failureCallback(error);
            }
        }
    });

    calendar.render();
    
    // Carrega a lista de Psis para o select do modal
    carregarSelectPsis();
}

// Helper: Cor do evento baseada no tipo
function definirCorPorTipo(tipo) {
    if (tipo === 'Avaliação') return '#f39c12'; // Laranja
    if (tipo === 'Online') return '#9b59b6';    // Roxo
    return '#1F4E5F';                           // Azul Padrão
}

// --- FUNÇÕES DO MODAL DA AGENDA ---

// 1. Abrir Modal (Para Criar ou Editar)
window.abrirModalAgenda = function(evento, dataClicada) {
    const modal = document.getElementById('modal-agenda');
    const form = document.getElementById('form-agenda');
    const btnExcluir = document.getElementById('btn-excluir-evento');
    
    form.reset();
    modal.style.display = 'flex';

    if (evento) {
        // MODO EDIÇÃO
        const props = evento.extendedProps;
        document.getElementById('event-id').value = evento.id;
        document.getElementById('evt-data').value = props.data;
        document.getElementById('evt-hora').value = props.hora;
        document.getElementById('evt-psi').value = props.psiId;
        document.getElementById('evt-paciente').value = props.paciente;
        document.getElementById('evt-tipo').value = props.tipo;
        
        btnExcluir.style.display = 'block'; // Mostra lixeira
    } else {
        // MODO NOVO
        document.getElementById('event-id').value = "";
        document.getElementById('evt-data').value = dataClicada || new Date().toISOString().split('T')[0];
        document.getElementById('evt-hora').value = "08:00";
        btnExcluir.style.display = 'none'; // Esconde lixeira
    }
}

window.fecharModalAgenda = function() {
    document.getElementById('modal-agenda').style.display = 'none';
}

// 2. Preencher Select de Psicólogos
async function carregarSelectPsis() {
    const select = document.getElementById('evt-psi');
    const q = query(collection(db, "users"), where("role", "==", "psi"));
    
    const snapshot = await getDoc(doc(db, "dummy", "test")); // Dummy call ou use getDocs se importado
    // Melhor usar onSnapshot para manter atualizado sempre
    onSnapshot(q, (snap) => {
        select.innerHTML = '<option value="">Selecione o Profissional...</option>';
        snap.forEach(doc => {
            const psi = doc.data();
            const option = document.createElement('option');
            option.value = psi.uid;
            option.textContent = psi.nome;
            select.appendChild(option);
        });
    });
}

// 3. Salvar Agendamento
document.getElementById('form-agenda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = "Salvando...";

    const id = document.getElementById('event-id').value;
    const psiSelect = document.getElementById('evt-psi');
    
    const dados = {
        data: document.getElementById('evt-data').value,
        hora: document.getElementById('evt-hora').value,
        psiId: psiSelect.value,
        psiNome: psiSelect.options[psiSelect.selectedIndex].text,
        paciente: document.getElementById('evt-paciente').value,
        tipo: document.getElementById('evt-tipo').value
    };

    try {
        if (id) {
            // Atualizar Existente
            await updateDoc(doc(db, "agendamentos", id), dados);
        } else {
            // Criar Novo (Usando addDoc para ID automático)
            // Precisamos importar addDoc lá em cima se não tiver
            // Como usamos setDoc antes, vamos usar uma referência de doc aleatória
            const novoRef = doc(collection(db, "agendamentos")); 
            await setDoc(novoRef, dados);
        }
        
        fecharModalAgenda();
        calendar.refetchEvents(); // Atualiza visual
        alert("Agendamento salvo!");
        
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "Salvar Agendamento";
    }
});

// 4. Excluir Agendamento
window.excluirAgendamento = async function() {
    const id = document.getElementById('event-id').value;
    if (confirm("Cancelar este agendamento?")) {
        await deleteDoc(doc(db, "agendamentos", id));
        fecharModalAgenda();
        calendar.refetchEvents();
    }
}

// IMPORTANTE: Adicione inicializarAgenda() no DOMContentLoaded existente
document.addEventListener("DOMContentLoaded", () => {
    // ... suas outras inits ...
    inicializarAgenda();
    // O JS vai chiar se a aba estiver oculta (display:none), então
    // temos um truque: quando clicar na aba Agenda, forçamos o calendar.render()
});
// Start
document.addEventListener("DOMContentLoaded", () => {
    carregarEquipe();
    renderizarSalas();
});
