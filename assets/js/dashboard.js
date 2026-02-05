// Arquivo: assets/js/dashboard.js

// --- 1. IMPORTAÇÕES UNIFICADAS (Tudo aqui no topo) ---
import { auth, db } from '../firebase.js'; 
import { signOut, onAuthStateChanged, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
// Adicionei todas as funções do Firestore necessárias aqui:
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { initializeApp, getApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";

// Variável global do calendário
let calendar; 

// --- 2. VERIFICAÇÃO DE ACESSO ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

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

// --- 3. NAVEGAÇÃO ---
window.mostrarSecao = function(idSecao, elementoMenu) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const secao = document.getElementById(idSecao);
    if(secao) secao.classList.add('active');
    
    // TRUQUE DO CALENDÁRIO: Se abrir a agenda, força o desenho
    if (idSecao === 'sec-agenda' && calendar) {
        setTimeout(() => { calendar.render(); }, 200); 
    }
    
    if(elementoMenu) elementoMenu.classList.add('active');
}

// --- 4. CARREGAR EQUIPE (Realtime) ---
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
                const isOnline = Math.random() > 0.3; 
                const statusHtml = isOnline 
                    ? `<span class="status-badge status-online"></span> <small>Disponível</small>`
                    : `<span class="status-badge status-busy"></span> <small>Em atendimento</small>`;

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
                const row = `
                    <tr>
                        <td><span class="status-badge status-online"></span> <small>Ativo</small></td>
                        <td style="font-weight: 600; color: var(--color-primary);">${data.nome}</td>
                        <td>${data.email}</td>
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

// --- 5. FUNÇÕES GLOBAIS (Excluir/Editar/Logout) ---
window.excluirUsuario = async function(uid, nome) {
    if(confirm(`Tem certeza que deseja remover ${nome} da equipe?\nEssa ação não pode ser desfeita.`)) {
        try {
            await deleteDoc(doc(db, "users", uid));
            alert("Usuário removido.");
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir: " + error.message);
        }
    }
}

const btnLogout = document.getElementById('btnLogout');
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth).then(() => { window.location.href = "index.html"; });
    });
}

// --- 6. RENDERIZAR SALAS ---
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

// --- 7. CADASTRO ---
const formCadastro = document.getElementById('internalRegisterForm');
if(formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = formCadastro.querySelector('button');
        const errorMsg = document.getElementById('reg-error-msg');
        const txtOriginal = "Realizar Cadastro";
        
        btn.innerText = "Processando...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
        if(errorMsg) errorMsg.style.display = "none";

        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const nome = document.getElementById('reg-name').value;
        const role = document.getElementById('reg-role').value;
        const phone = document.getElementById('reg-phone').value;
        const crp = document.getElementById('reg-crp')?.value || "";
        const abordagem = document.getElementById('reg-abordagem')?.value || "";

        let secondaryApp = null;

        try {
            const config = getApp().options;
            secondaryApp = initializeApp(config, "RegistradorTemporario");
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            const newUser = userCredential.user;

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

            btn.innerText = "Cadastrado com Sucesso!";
            btn.style.backgroundColor = "var(--color-success)";
            formCadastro.reset();
            
            setTimeout(() => {
                btn.innerText = txtOriginal;
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.backgroundColor = "";
            }, 3000);

        } catch (error) {
            console.error(error);
            btn.innerText = "Erro ao Cadastrar";
            btn.style.backgroundColor = "#e74c3c";
            if(errorMsg) {
                errorMsg.innerText = "Erro: " + error.code;
                errorMsg.style.display = "block";
            }
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

// Controle de UI do Cadastro
const selectRole = document.getElementById('reg-role');
if(selectRole) {
    selectRole.addEventListener('change', function() {
        const areaPsi = document.getElementById('reg-psi-extras');
        if(areaPsi) {
            this.value === 'psi' ? areaPsi.style.display = 'block' : areaPsi.style.display = 'none';
        }
    });
}

// --- 8. EDIÇÃO (MODAL) ---
window.abrirEditor = async function(uid) {
    const modal = document.getElementById('modal-editar');
    modal.style.display = 'flex';
    
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('edit-uid').value = uid;
            document.getElementById('edit-role').value = data.role;
            document.getElementById('edit-nome').value = data.nome;
            document.getElementById('edit-telefone').value = data.telefone || '';
            
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
        console.error("Erro editor:", error);
        alert("Erro ao carregar dados.");
        fecharModal();
    }
}

window.fecharModal = function() {
    document.getElementById('modal-editar').style.display = 'none';
}

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
        
        const dadosAtualizados = {
            nome: document.getElementById('edit-nome').value,
            telefone: document.getElementById('edit-telefone').value
        };

        if (role === 'psi') {
            dadosAtualizados.crp = document.getElementById('edit-crp').value;
            dadosAtualizados.abordagem = document.getElementById('edit-abordagem').value;
        }

        try {
            const docRef = doc(db, "users", uid);
            await updateDoc(docRef, dadosAtualizados);
            alert("Dados atualizados com sucesso!");
            fecharModal();
        } catch (error) {
            console.error("Erro atualizar:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            btn.innerText = txtOriginal;
            btn.disabled = false;
        }
    });
}

// --- 9. AGENDA & FULLCALENDAR ---
function inicializarAgenda() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'pt-br',
        editable: true,
        selectable: true,
        
        dateClick: function(info) {
            abrirModalAgenda(null, info.dateStr);
        },

        eventClick: function(info) {
            abrirModalAgenda(info.event);
        },

        events: async function(info, successCallback, failureCallback) {
            try {
                const q = query(collection(db, "agendamentos"));
                onSnapshot(q, (snapshot) => {
                    const eventos = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            title: `${data.paciente} (${data.psiNome})`,
                            start: `${data.data}T${data.hora}`,
                            backgroundColor: definirCorPorTipo(data.tipo),
                            extendedProps: { ...data }
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
    carregarSelectPsis();
}

function definirCorPorTipo(tipo) {
    if (tipo === 'Avaliação') return '#f39c12';
    if (tipo === 'Online') return '#9b59b6';
    return '#1F4E5F';
}

// Funções do Modal da Agenda
window.abrirModalAgenda = function(evento, dataClicada) {
    const modal = document.getElementById('modal-agenda');
    const form = document.getElementById('form-agenda');
    const btnExcluir = document.getElementById('btn-excluir-evento');
    
    form.reset();
    modal.style.display = 'flex';

    if (evento) {
        const props = evento.extendedProps;
        document.getElementById('event-id').value = evento.id;
        document.getElementById('evt-data').value = props.data;
        document.getElementById('evt-hora').value = props.hora;
        document.getElementById('evt-psi').value = props.psiId;
        document.getElementById('evt-paciente').value = props.paciente;
        document.getElementById('evt-tipo').value = props.tipo;
        btnExcluir.style.display = 'block';
    } else {
        document.getElementById('event-id').value = "";
        document.getElementById('evt-data').value = dataClicada || new Date().toISOString().split('T')[0];
        document.getElementById('evt-hora').value = "08:00";
        btnExcluir.style.display = 'none';
    }
}

window.fecharModalAgenda = function() {
    document.getElementById('modal-agenda').style.display = 'none';
}

async function carregarSelectPsis() {
    const select = document.getElementById('evt-psi');
    const q = query(collection(db, "users"), where("role", "==", "psi"));
    
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
            await updateDoc(doc(db, "agendamentos", id), dados);
        } else {
            const novoRef = doc(collection(db, "agendamentos")); 
            await setDoc(novoRef, dados);
        }
        fecharModalAgenda();
        if(calendar) calendar.refetchEvents();
        alert("Agendamento salvo!");
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "Salvar Agendamento";
    }
});

window.excluirAgendamento = async function() {
    const id = document.getElementById('event-id').value;
    if (confirm("Cancelar este agendamento?")) {
        await deleteDoc(doc(db, "agendamentos", id));
        fecharModalAgenda();
        if(calendar) calendar.refetchEvents();
    }
}

// --- 10. INICIALIZAÇÃO UNIFICADA ---
document.addEventListener("DOMContentLoaded", () => {
    carregarEquipe();
    renderizarSalas();
    inicializarAgenda();
});
