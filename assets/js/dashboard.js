// Arquivo: assets/js/dashboard.js

import { auth, db } from '../firebase.js'; 
import { signOut, onAuthStateChanged, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { initializeApp, getApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";

let calendar; 

// --- AUTH & NAVEGAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    try {
        const d = await getDoc(doc(db, "users", user.uid));
        if (d.exists()) document.getElementById('adminName').innerText = d.data().nome || "Líder";
    } catch (e) {}
});

window.mostrarSecao = function(id, el) {
    document.querySelectorAll('.content-section').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    if (id === 'sec-agenda' && calendar) setTimeout(() => calendar.render(), 100);
}

window.abrirCadastroPaciente = function() {
    fecharModalAgenda();
    mostrarSecao('sec-cadastro', document.querySelectorAll('.nav-item')[5]);
    const sel = document.getElementById('reg-role');
    sel.value = 'paciente';
    sel.dispatchEvent(new Event('change'));
}

// --- CARREGAMENTO DE LISTAS ---
function carregarListas() {
    onSnapshot(collection(db, "users"), (snap) => {
        const listaEquipe = document.getElementById('lista-equipe');
        const listaRecep = document.getElementById('lista-recep');
        const listaPac = document.getElementById('lista-pacientes');
        const selectPac = document.getElementById('evt-paciente');
        
        if(listaEquipe) listaEquipe.innerHTML = "";
        if(listaRecep) listaRecep.innerHTML = "";
        if(listaPac) listaPac.innerHTML = "";
        if(selectPac) selectPac.innerHTML = '<option value="">-- Selecione --</option>';
        
        let countEquipe = 0;
        let countPac = 0;

        snap.forEach((doc) => {
            const d = doc.data();
            const role = d.role;
            const actions = `
                <td style="text-align:right;">
                    <button onclick="abrirEditor('${doc.id}')" style="color:#2980b9; border:none; background:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    <button onclick="excluirUsuario('${doc.id}', '${d.nome}')" style="color:#e74c3c; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </td>`;

            if (role === 'paciente') {
                countPac++;
                if(listaPac) listaPac.innerHTML += `<tr><td><strong>${d.nome}</strong></td><td>${d.email}</td><td>${d.telefone||'-'}</td><td>${d.cpf||'-'}</td>${actions}</tr>`;
                if(selectPac) {
                    const opt = document.createElement('option');
                    opt.value = d.nome; opt.text = d.nome;
                    selectPac.appendChild(opt);
                }
            } else if (role === 'recep' || role === 'admin') {
                if(listaRecep) listaRecep.innerHTML += `<tr><td><span class="status-badge status-online"></span></td><td><strong>${d.nome}</strong></td><td>${d.telefone||d.email}</td>${actions}</tr>`;
            } else {
                countEquipe++;
                let cargo = role.toUpperCase();
                if(role === 'psi') cargo = 'Psicólogo';
                if(listaEquipe) listaEquipe.innerHTML += `<tr><td><span class="status-badge status-online"></span></td><td><strong>${d.nome}</strong></td><td>${cargo}</td><td>${d.registroProfissional||'-'}</td>${actions}</tr>`;
            }
        });
        document.getElementById('count-equipe').innerText = countEquipe;
        document.getElementById('count-pacientes').innerText = countPac;
    });
}

// --- EDIÇÃO RESTAURADA (AGORA SIM!) ---
window.abrirEditor = async function(uid) {
    const modal = document.getElementById('modal-editar');
    modal.style.display = 'flex';
    
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if(docSnap.exists()) {
            const d = docSnap.data();
            
            // Campos Comuns
            document.getElementById('edit-uid').value = uid;
            document.getElementById('edit-role').value = d.role;
            document.getElementById('edit-nome').value = d.nome;
            document.getElementById('edit-telefone').value = d.telefone || '';

            // Esconde áreas específicas
            document.getElementById('edit-extras-paciente').style.display = 'none';
            document.getElementById('edit-extras-prof').style.display = 'none';

            // Preenche Paciente
            if (d.role === 'paciente') {
                document.getElementById('edit-extras-paciente').style.display = 'block';
                document.getElementById('edit-cpf').value = d.cpf || '';
                document.getElementById('edit-nascimento').value = d.nascimento || '';
                document.getElementById('edit-endereco').value = d.endereco || '';
                document.getElementById('edit-cidade').value = d.cidade || '';
            } 
            // Preenche Profissional
            else if (['psi', 'psiquiatra', 'nutri', 'feno', 'fisio', 'educador', 'outro_saude'].includes(d.role)) {
                document.getElementById('edit-extras-prof').style.display = 'block';
                document.getElementById('edit-registro').value = d.registroProfissional || '';
                document.getElementById('edit-especialidade').value = d.especialidade || '';
                document.getElementById('edit-bio').value = d.bio || '';
            }
        }
    } catch (e) { console.error(e); alert("Erro ao carregar"); }
}

window.fecharModal = () => document.getElementById('modal-editar').style.display = 'none';

document.getElementById('form-editar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('edit-uid').value;
    const role = document.getElementById('edit-role').value;
    
    const dados = {
        nome: document.getElementById('edit-nome').value,
        telefone: document.getElementById('edit-telefone').value
    };

    if (role === 'paciente') {
        dados.cpf = document.getElementById('edit-cpf').value;
        dados.nascimento = document.getElementById('edit-nascimento').value;
        dados.endereco = document.getElementById('edit-endereco').value;
        dados.cidade = document.getElementById('edit-cidade').value;
    } 
    else if (['psi', 'psiquiatra', 'nutri', 'feno', 'fisio', 'educador', 'outro_saude'].includes(role)) {
        dados.registroProfissional = document.getElementById('edit-registro').value;
        dados.especialidade = document.getElementById('edit-especialidade').value;
        dados.bio = document.getElementById('edit-bio').value;
    }

    await updateDoc(doc(db, "users", uid), dados);
    alert("Dados atualizados!");
    fecharModal();
});

// --- AGENDA & CALENDÁRIO ---
function inicializarAgenda() {
    const el = document.getElementById('calendar');
    if (!el) return;
    calendar = new FullCalendar.Calendar(el, {
        initialView: 'timeGridWeek',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        locale: 'pt-br', slotMinTime: "07:00:00", slotMaxTime: "22:00:00", allDaySlot: false,
        selectable: true, editable: true,
        
        dateClick: function(info) {
            let d = info.dateStr.split('T')[0];
            let hInicio = info.dateStr.includes('T') ? info.dateStr.split('T')[1].substring(0,5) : "08:00";
            let hFim = calcularHoraFim(hInicio);
            abrirModalAgenda(null, d, hInicio, hFim);
        },
        eventClick: function(info) { abrirPopoverEvento(info.event, info.jsEvent); },
        eventDrop: async function(info) {
             if(confirm("Mover para " + info.event.start.toLocaleString() + "?")) {
                let d = info.event.start.toISOString().split('T')[0];
                let hStart = info.event.start.toTimeString().substring(0,5);
                let hEnd = info.event.end ? info.event.end.toTimeString().substring(0,5) : calcularHoraFim(hStart);
                await updateDoc(doc(db, "agendamentos", info.event.id), { data: d, horaInicio: hStart, horaFim: hEnd });
            } else info.revert();
        }
    });
    calendar.render();
    
    onSnapshot(collection(db, "agendamentos"), (snap) => {
        calendar.removeAllEvents();
        const evs = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                title: data.paciente,
                start: `${data.data}T${data.horaInicio}`,
                end: `${data.data}T${data.horaFim}`,
                backgroundColor: corSala(data.sala),
                borderColor: corSala(data.sala),
                extendedProps: { ...data }
            };
        });
        calendar.addEventSource(evs);
    });
}

function corSala(s) {
    if(s && s.includes('01')) return '#3498db';
    if(s && s.includes('02')) return '#27ae60';
    if(s && s.includes('03')) return '#e67e22';
    if(s && s.includes('04')) return '#9b59b6';
    return '#7f8c8d';
}

function calcularHoraFim(inicio) {
    let [h, m] = inicio.split(':').map(Number);
    let date = new Date(); date.setHours(h); date.setMinutes(m + 30);
    return date.toTimeString().substring(0,5);
}

// --- POPOVER ---
window.abrirPopoverEvento = function(evento, jsEvent) {
    const pop = document.getElementById('event-popover');
    const p = evento.extendedProps;
    document.getElementById('pop-event-id').value = evento.id;
    document.getElementById('pop-color').style.backgroundColor = evento.backgroundColor;
    document.getElementById('pop-paciente').innerText = p.paciente;
    document.getElementById('pop-tipo').innerText = p.servico || "Sessão";
    document.getElementById('pop-modo').innerText = p.modalidade || "Presencial";
    
    let dataObj = new Date(p.data + 'T00:00:00');
    document.getElementById('pop-data').innerText = dataObj.toLocaleDateString('pt-BR', {weekday: 'long', day:'numeric', month:'numeric'});
    document.getElementById('pop-hora').innerText = `${p.horaInicio} às ${p.horaFim}`;
    document.getElementById('pop-status').value = p.status || "Agendado";
    
    let left = jsEvent.pageX + 20;
    let top = jsEvent.pageY - 50;
    if (jsEvent.pageX > window.innerWidth - 350) left = jsEvent.pageX - 340;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.style.display = 'block';
}

window.fecharPopover = () => document.getElementById('event-popover').style.display = 'none';

window.atualizarStatusAgenda = async function(novoStatus) {
    const id = document.getElementById('pop-event-id').value;
    await updateDoc(doc(db, "agendamentos", id), { status: novoStatus });
}

window.acaoPopover = function(acao) {
    const id = document.getElementById('pop-event-id').value;
    if (acao === 'excluir') {
        if(confirm("Excluir este agendamento?")) {
            deleteDoc(doc(db, "agendamentos", id));
            fecharPopover();
        }
    } else if (acao === 'editar') {
        const evento = calendar.getEventById(id);
        if(evento) {
            fecharPopover();
            const p = evento.extendedProps;
            abrirModalAgenda(evento, p.data, p.horaInicio, p.horaFim);
        }
    }
}

// --- MODAL AGENDA ---
window.setTipoEvento = function(tipo, btn) {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('evt-categoria').value = tipo;
}

window.abrirModalAgenda = function(evento, dataStr, horaInicio, horaFim) {
    const modal = document.getElementById('modal-agenda');
    const form = document.getElementById('form-agenda');
    form.reset();
    setTipoEvento('Individual', document.querySelector('.toggle-btn')); 

    if(evento) {
        const p = evento.extendedProps;
        document.getElementById('event-id').value = evento.id;
        document.getElementById('evt-data').value = p.data;
        document.getElementById('evt-hora-inicio').value = p.horaInicio;
        document.getElementById('evt-hora-fim').value = p.horaFim;
        document.getElementById('evt-sala').value = p.sala || "Sala 01";
        document.getElementById('evt-servico').value = p.servico || "Terapia Individual";
        setTimeout(() => { document.getElementById('evt-paciente').value = p.paciente; }, 100);
    } else {
        document.getElementById('event-id').value = "";
        document.getElementById('evt-data').value = dataStr;
        document.getElementById('evt-hora-inicio').value = horaInicio;
        document.getElementById('evt-hora-fim').value = horaFim;
    }
    modal.style.display = 'flex';
}

window.fecharModalAgenda = () => document.getElementById('modal-agenda').style.display = 'none';

document.getElementById('form-agenda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('event-id').value;
    const dados = {
        categoria: document.getElementById('evt-categoria').value,
        paciente: document.getElementById('evt-paciente').value,
        data: document.getElementById('evt-data').value,
        horaInicio: document.getElementById('evt-hora-inicio').value,
        horaFim: document.getElementById('evt-hora-fim').value,
        sala: document.getElementById('evt-sala').value,
        servico: document.getElementById('evt-servico').value,
        status: "Agendado",
        psiNome: document.getElementById('adminName').innerText
    };
    try {
        if(id) await updateDoc(doc(db, "agendamentos", id), dados);
        else await setDoc(doc(collection(db, "agendamentos")), dados);
        fecharModalAgenda();
    } catch (err) { alert("Erro: " + err.message); } 
});

// --- CADASTRO (TURBINADO) ---
const formReg = document.getElementById('internalRegisterForm');
if(formReg) {
    formReg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formReg.querySelector('button');
        const txt = btn.innerText;
        btn.innerText = "Salvando..."; btn.disabled = true;

        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const role = document.getElementById('reg-role').value;
        
        let secApp = null;
        try {
            const config = getApp().options;
            secApp = initializeApp(config, "TempApp");
            const secAuth = getAuth(secApp);
            const cred = await createUserWithEmailAndPassword(secAuth, email, pass);
            
            const userData = {
                uid: cred.user.uid,
                nome: document.getElementById('reg-name').value,
                email: email,
                role: role,
                telefone: document.getElementById('reg-phone').value,
                criadoEm: serverTimestamp()
            };

            if(role === 'paciente') {
                userData.cpf = document.getElementById('reg-cpf').value;
                userData.nascimento = document.getElementById('reg-nascimento').value;
                userData.endereco = document.getElementById('reg-endereco').value;
                userData.cidade = document.getElementById('reg-cidade').value;
                userData.respNome = document.getElementById('reg-resp-nome').value;
                userData.respTel = document.getElementById('reg-resp-tel').value;
            } 
            else if (['psi', 'psiquiatra', 'nutri', 'feno', 'fisio', 'educador', 'outro_saude'].includes(role)) {
                userData.registroProfissional = document.getElementById('reg-registro-prof').value;
                userData.especialidade = document.getElementById('reg-especialidade').value;
                userData.valorSessao = document.getElementById('reg-valor').value;
                userData.bio = document.getElementById('reg-bio').value;
                userData.formacao = document.getElementById('reg-formacao').value;
            }
            
            await setDoc(doc(db, "users", cred.user.uid), userData);
            alert("Cadastro realizado!");
            formReg.reset();
        } catch (err) { alert("Erro: " + err.message); }
        finally { if(secApp) await deleteApp(secApp); btn.innerText = txt; btn.disabled = false; }
    });
}

// UI Helpers
const selRole = document.getElementById('reg-role');
if(selRole) {
    selRole.addEventListener('change', function() {
        document.getElementById('reg-prof-extras').style.display = 'none';
        document.getElementById('reg-paciente-extras').style.display = 'none';
        if (this.value === 'paciente') document.getElementById('reg-paciente-extras').style.display = 'block';
        else if (['psi', 'psiquiatra', 'nutri', 'feno', 'fisio', 'educador', 'outro_saude'].includes(this.value)) {
            document.getElementById('reg-prof-extras').style.display = 'block';
        }
    });
}

window.excluirUsuario = async (uid, nome) => { if(confirm(`Excluir ${nome}?`)) await deleteDoc(doc(db, "users", uid)); };
document.getElementById('btnLogout').addEventListener('click', () => signOut(auth).then(() => window.location.href="index.html"));

// START
document.addEventListener("DOMContentLoaded", () => {
    carregarListas();
    inicializarAgenda();
});
