// Arquivo: assets/js/dashboard.js

// 1. IMPORTAÇÕES
import { auth, db } from '../firebase.js'; 
import { signOut, onAuthStateChanged, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { initializeApp, getApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";

let calendar; 

// 2. AUTH GUARD
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            document.getElementById('adminName').innerText = docSnap.data().nome || "Líder";
        }
    } catch (e) { console.warn(e); }
});

// 3. NAVEGAÇÃO
window.mostrarSecao = function(idSecao, elementoMenu) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(idSecao).classList.add('active');
    if(elementoMenu) elementoMenu.classList.add('active');
    
    if (idSecao === 'sec-agenda' && calendar) {
        setTimeout(() => { calendar.render(); }, 100); 
    }
}

window.abrirCadastroPaciente = function() {
    mostrarSecao('sec-cadastro', document.querySelectorAll('.nav-item')[5]); 
    const roleSelect = document.getElementById('reg-role');
    roleSelect.value = 'paciente';
    roleSelect.dispatchEvent(new Event('change')); 
}

// 4. CARREGAMENTO DE DADOS
function carregarListas() {
    // Lista de Psis
    const qPsi = query(collection(db, "users"), where("role", "==", "psi"));
    onSnapshot(qPsi, (snap) => {
        const listaPsi = document.getElementById('lista-psi');
        const selectPsi = document.getElementById('evt-psi');
        if(listaPsi) listaPsi.innerHTML = "";
        if(selectPsi) selectPsi.innerHTML = '<option value="">Selecione...</option>';

        snap.forEach((doc) => {
            const d = doc.data();
            if(listaPsi) {
                listaPsi.innerHTML += `
                    <tr>
                        <td><span class="status-badge status-online"></span></td>
                        <td><strong>${d.nome}</strong></td>
                        <td>${d.crp || '-'}</td>
                        <td>${d.abordagem || '-'}</td>
                        <td style="text-align:right;">
                            <button onclick="abrirEditor('${doc.id}')" style="color:#2980b9; border:none; background:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                            <button onclick="excluirUsuario('${doc.id}', '${d.nome}')" style="color:#e74c3c; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
            }
            if(selectPsi) {
                const opt = document.createElement('option');
                opt.value = doc.id; opt.text = d.nome;
                selectPsi.appendChild(opt);
            }
        });
        document.getElementById('count-psi').innerText = snap.size;
    });

    // Lista de Pacientes
    const qPacientes = query(collection(db, "users"), where("role", "==", "paciente"));
    onSnapshot(qPacientes, (snap) => {
        const listaPac = document.getElementById('lista-pacientes');
        const selectPac = document.getElementById('evt-paciente');
        if(listaPac) listaPac.innerHTML = "";
        if(selectPac) selectPac.innerHTML = '<option value="">Selecione...</option>';

        snap.forEach((doc) => {
            const d = doc.data();
            if(listaPac) {
                listaPac.innerHTML += `
                    <tr>
                        <td><strong>${d.nome}</strong></td>
                        <td>${d.email}</td>
                        <td>${d.telefone || '-'}</td>
                        <td>${d.cpf || '-'}</td>
                        <td style="text-align:right;">
                             <button onclick="abrirEditor('${doc.id}')" style="color:#2980b9; border:none; background:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                             <button onclick="excluirUsuario('${doc.id}', '${d.nome}')" style="color:#e74c3c; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
            }
            if(selectPac) {
                const opt = document.createElement('option');
                opt.value = d.nome; opt.text = d.nome;
                selectPac.appendChild(opt);
            }
        });
        document.getElementById('count-pacientes').innerText = snap.size;
    });
}

// 5. AGENDA
function inicializarAgenda() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        locale: 'pt-br', slotMinTime: "07:00:00", slotMaxTime: "22:00:00", allDaySlot: false,
        selectable: true, editable: true,

        dateClick: function(info) {
            let dataStr = info.dateStr.split('T')[0];
            let horaStr = info.dateStr.includes('T') ? info.dateStr.split('T')[1].substring(0,5) : "08:00";
            abrirModalAgenda(null, dataStr, horaStr);
        },
        eventClick: function(info) { abrirModalAgenda(info.event); },
        eventDrop: async function(info) {
            if(confirm("Mover para " + info.event.start.toLocaleString() + "?")) {
                const novaData = info.event.start.toISOString().split('T')[0];
                const novaHora = info.event.start.toTimeString().substring(0,5);
                await updateDoc(doc(db, "agendamentos", info.event.id), { data: novaData, hora: novaHora });
            } else { info.revert(); }
        }
    });

    calendar.render();

    onSnapshot(query(collection(db, "agendamentos")), (snapshot) => {
        calendar.removeAllEvents();
        const eventos = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                title: `${d.paciente} (${d.psiNome})`,
                start: `${d.data}T${d.hora}`,
                backgroundColor: definirCorPorSala(d.sala),
                borderColor: definirCorPorSala(d.sala),
                extendedProps: { ...d }
            };
        });
        calendar.addEventSource(eventos);
    });
}

function definirCorPorSala(sala) {
    switch (sala) {
        case 'Sala 01': return '#3498db'; 
        case 'Sala 02': return '#27ae60'; 
        case 'Sala 03': return '#e67e22'; 
        case 'Sala 04': return '#9b59b6'; 
        default: return '#7f8c8d'; 
    }
}

// 6. MODAL AGENDA
window.abrirModalAgenda = function(evento, dataStr, horaStr) {
    const modal = document.getElementById('modal-agenda');
    const form = document.getElementById('form-agenda');
    form.reset();
    modal.style.display = 'flex';

    if(evento) {
        const props = evento.extendedProps;
        document.getElementById('event-id').value = evento.id;
        document.getElementById('evt-data').value = props.data;
        document.getElementById('evt-hora').value = props.hora;
        document.getElementById('evt-sala').value = props.sala || "Sala 01";
        document.getElementById('evt-tipo').value = props.tipo;
        setTimeout(() => {
            document.getElementById('evt-psi').value = props.psiId;
            document.getElementById('evt-paciente').value = props.paciente; 
        }, 100);
        document.getElementById('btn-excluir-evento').style.display = 'block';
    } else {
        document.getElementById('event-id').value = "";
        document.getElementById('evt-data').value = dataStr;
        document.getElementById('evt-hora').value = horaStr;
        document.getElementById('btn-excluir-evento').style.display = 'none';
    }
}

window.fecharModalAgenda = function() { document.getElementById('modal-agenda').style.display = 'none'; }

document.getElementById('form-agenda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = "Salvando...";
    const id = document.getElementById('event-id').value;
    const selectPsi = document.getElementById('evt-psi');
    const dados = {
        data: document.getElementById('evt-data').value,
        hora: document.getElementById('evt-hora').value,
        sala: document.getElementById('evt-sala').value,
        tipo: document.getElementById('evt-tipo').value,
        psiId: selectPsi.value,
        psiNome: selectPsi.options[selectPsi.selectedIndex].text,
        paciente: document.getElementById('evt-paciente').value
    };
    try {
        if(id) await updateDoc(doc(db, "agendamentos", id), dados);
        else await setDoc(doc(collection(db, "agendamentos")), dados);
        fecharModalAgenda();
    } catch (err) { alert("Erro: " + err.message); } 
    finally { btn.innerText = "Confirmar"; }
});

window.excluirAgendamento = async function() {
    const id = document.getElementById('event-id').value;
    if(confirm("Excluir?")) {
        await deleteDoc(doc(db, "agendamentos", id));
        fecharModalAgenda();
    }
}

// 7. FUNÇÕES CADASTRO E EDIÇÃO
window.excluirUsuario = async function(uid, nome) {
    if(confirm(`Remover ${nome}?`)) await deleteDoc(doc(db, "users", uid));
}

const formCadastro = document.getElementById('internalRegisterForm');
if(formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formCadastro.querySelector('button');
        const txtOriginal = btn.innerText;
        btn.innerText = "Salvando..."; btn.disabled = true;

        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const role = document.getElementById('reg-role').value;
        
        let secondaryApp = null;
        try {
            const config = getApp().options;
            secondaryApp = initializeApp(config, "RegistradorTemporario");
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            
            // DADOS BÁSICOS
            const userData = {
                uid: userCredential.user.uid,
                nome: document.getElementById('reg-name').value,
                email: email,
                role: role,
                telefone: document.getElementById('reg-phone').value,
                criadoEm: serverTimestamp()
            };

            // DADOS ESPECÍFICOS (PSI)
            if(role === 'psi') {
                userData.crp = document.getElementById('reg-crp').value;
                userData.abordagem = document.getElementById('reg-abordagem').value;
            } 
            // DADOS ESPECÍFICOS (PACIENTE - CAMPOS DO PDF)
            else if (role === 'paciente') {
                userData.cpf = document.getElementById('reg-cpf').value;
                userData.rg = document.getElementById('reg-rg').value;
                userData.nascimento = document.getElementById('reg-nascimento').value;
                userData.genero = document.getElementById('reg-genero').value;
                userData.naturalidade = document.getElementById('reg-naturalidade').value;
                userData.profissao = document.getElementById('reg-profissao').value;
                userData.escolaridade = document.getElementById('reg-escolaridade').value;
                userData.nomeSocial = document.getElementById('reg-nome-social').value;
                
                // Endereço
                userData.cep = document.getElementById('reg-cep').value;
                userData.endereco = document.getElementById('reg-endereco').value;
                userData.numero = document.getElementById('reg-numero').value;
                userData.bairro = document.getElementById('reg-bairro').value;
                userData.cidade = document.getElementById('reg-cidade').value;
                
                // Responsável
                userData.respNome = document.getElementById('reg-resp-nome').value;
                userData.respParentesco = document.getElementById('reg-resp-parentesco').value;
                userData.respTel = document.getElementById('reg-resp-tel').value;
                userData.respCpf = document.getElementById('reg-resp-cpf').value;
                
                userData.obs = document.getElementById('reg-obs').value;
            }

            await setDoc(doc(db, "users", userCredential.user.uid), userData);
            alert("Cadastro realizado!");
            formCadastro.reset();
        } catch (err) { alert("Erro: " + err.message); } 
        finally { if(secondaryApp) await deleteApp(secondaryApp); btn.innerText = txtOriginal; btn.disabled = false; }
    });
}

// Controle UI Cadastro (Esconde/Mostra Campos)
const selectRole = document.getElementById('reg-role');
if(selectRole) {
    selectRole.addEventListener('change', function() {
        const areaPsi = document.getElementById('reg-psi-extras');
        const areaPac = document.getElementById('reg-paciente-extras');
        
        areaPsi.style.display = 'none';
        areaPac.style.display = 'none';

        if(this.value === 'psi') areaPsi.style.display = 'block';
        if(this.value === 'paciente') areaPac.style.display = 'block';
    });
    // Inicia mostrando o correto (normalmente paciente está selecionado por padrão)
    selectRole.dispatchEvent(new Event('change'));
}

// LOGOUT
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
});

// EDITOR (MODAL)
window.abrirEditor = async function(uid) {
    document.getElementById('modal-editar').style.display = 'flex';
    const docSnap = await getDoc(doc(db, "users", uid));
    if(docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById('edit-uid').value = uid;
        document.getElementById('edit-role').value = d.role;
        document.getElementById('edit-nome').value = d.nome;
        document.getElementById('edit-telefone').value = d.telefone || '';
        
        // Esconde todos extras primeiro
        document.getElementById('edit-extras-psi').style.display = 'none';
        document.getElementById('edit-extras-paciente').style.display = 'none';

        if(d.role === 'psi') {
            document.getElementById('edit-extras-psi').style.display = 'block';
            document.getElementById('edit-crp').value = d.crp || '';
        } else if (d.role === 'paciente') {
            document.getElementById('edit-extras-paciente').style.display = 'block';
            document.getElementById('edit-cpf').value = d.cpf || '';
        }
    }
}
window.fecharModal = function() { document.getElementById('modal-editar').style.display = 'none'; }

document.getElementById('form-editar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('edit-uid').value;
    const role = document.getElementById('edit-role').value;
    const dados = {
        nome: document.getElementById('edit-nome').value,
        telefone: document.getElementById('edit-telefone').value
    };
    if(role === 'psi') {
        dados.crp = document.getElementById('edit-crp').value;
    } else if (role === 'paciente') {
        dados.cpf = document.getElementById('edit-cpf').value;
    }
    await updateDoc(doc(db, "users", uid), dados);
    alert("Atualizado!");
    fecharModal();
});

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    carregarListas();
    inicializarAgenda();
});
