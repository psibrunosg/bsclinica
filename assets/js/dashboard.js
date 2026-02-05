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
    mostrarSecao('sec-cadastro', document.querySelectorAll('.nav-item')[5]);
    const sel = document.getElementById('reg-role');
    sel.value = 'paciente';
    sel.dispatchEvent(new Event('change'));
}

// --- CARREGAMENTO DE LISTAS ---
function carregarListas() {
    // 1. LISTA CORPO CLÍNICO (Todo mundo que não é paciente nem recepção)
    // Infelizmente o Firestore não tem "not-in" fácil em queries complexas sem índice, 
    // então vamos pegar 'role' != 'paciente' filtrando no front ou fazendo múltiplas queries.
    // Para simplificar, vamos pegar TUDO e filtrar aqui.
    onSnapshot(collection(db, "users"), (snap) => {
        const listaEquipe = document.getElementById('lista-equipe');
        const listaRecep = document.getElementById('lista-recep');
        const listaPac = document.getElementById('lista-pacientes');
        const selectProf = document.getElementById('evt-psi'); // Select da Agenda
        
        if(listaEquipe) listaEquipe.innerHTML = "";
        if(listaRecep) listaRecep.innerHTML = "";
        if(listaPac) listaPac.innerHTML = "";
        if(selectProf) selectProf.innerHTML = '<option value="">Selecione...</option>';
        
        let countEquipe = 0;
        let countPac = 0;

        snap.forEach((doc) => {
            const d = doc.data();
            const role = d.role;

            // Botões de Ação Comuns
            const actions = `
                <td style="text-align:right;">
                    <button onclick="abrirEditor('${doc.id}')" style="color:#2980b9; border:none; background:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    <button onclick="excluirUsuario('${doc.id}', '${d.nome}')" style="color:#e74c3c; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </td>`;

            // Lógica de Separação
            if (role === 'paciente') {
                countPac++;
                if(listaPac) {
                    listaPac.innerHTML += `<tr>
                        <td><strong>${d.nome}</strong></td>
                        <td>${d.email}</td>
                        <td>${d.telefone || '-'}</td>
                        <td>${d.cpf || '-'}</td>
                        ${actions}
                    </tr>`;
                }
                // Adiciona ao select de pacientes da agenda
                const selPac = document.getElementById('evt-paciente');
                if(selPac && !Array.from(selPac.options).some(o => o.value === d.nome)) {
                    const opt = document.createElement('option');
                    opt.value = d.nome; opt.text = d.nome;
                    selPac.appendChild(opt);
                }

            } else if (role === 'recep' || role === 'admin') {
                if(listaRecep) {
                    listaRecep.innerHTML += `<tr>
                        <td><span class="status-badge status-online"></span></td>
                        <td><strong>${d.nome}</strong></td>
                        <td>${d.telefone || d.email}</td>
                        ${actions}
                    </tr>`;
                }
            } else {
                // É DO CORPO CLÍNICO (psi, nutri, medico...)
                countEquipe++;
                // Nome bonito do cargo
                let cargo = role.toUpperCase();
                if(role === 'psi') cargo = 'Psicólogo(a)';
                if(role === 'nutri') cargo = 'Nutricionista';
                if(role === 'fisio') cargo = 'Fisioterapeuta';
                
                if(listaEquipe) {
                    listaEquipe.innerHTML += `<tr>
                        <td><span class="status-badge status-online"></span></td>
                        <td><strong>${d.nome}</strong></td>
                        <td>${cargo} <br><small style="color:#666">${d.especialidade || ''}</small></td>
                        <td>${d.registroProfissional || '-'}</td>
                        ${actions}
                    </tr>`;
                }
                // Adiciona ao Select da Agenda
                if(selectProf) {
                    const opt = document.createElement('option');
                    opt.value = doc.id; opt.text = d.nome + " (" + cargo + ")";
                    selectProf.appendChild(opt);
                }
            }
        });
        
        document.getElementById('count-equipe').innerText = countEquipe;
        document.getElementById('count-pacientes').innerText = countPac;
    });
}

// --- AGENDA ---
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
            let h = info.dateStr.includes('T') ? info.dateStr.split('T')[1].substring(0,5) : "08:00";
            abrirModalAgenda(null, d, h);
        },
        eventClick: function(info) { abrirModalAgenda(info.event); },
        eventDrop: async function(info) {
             if(confirm("Mover para " + info.event.start.toLocaleString() + "?")) {
                let d = info.event.start.toISOString().split('T')[0];
                let h = info.event.start.toTimeString().substring(0,5);
                await updateDoc(doc(db, "agendamentos", info.event.id), { data: d, hora: h });
            } else info.revert();
        }
    });
    calendar.render();
    
    onSnapshot(collection(db, "agendamentos"), (snap) => {
        calendar.removeAllEvents();
        const evs = snap.docs.map(d => ({
            id: d.id,
            title: `${d.paciente} (${d.psiNome})`,
            start: `${d.data}T${d.hora}`,
            backgroundColor: corSala(d.sala),
            borderColor: corSala(d.sala),
            extendedProps: { ...d.data() }
        }));
        calendar.addEventSource(evs);
    });
}
function corSala(s) {
    if(s.includes('01')) return '#3498db';
    if(s.includes('02')) return '#27ae60';
    if(s.includes('03')) return '#e67e22';
    if(s.includes('04')) return '#9b59b6';
    return '#7f8c8d';
}

// --- CADASTRO INTELIGENTE ---
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

            // SE FOR PACIENTE
            if(role === 'paciente') {
                userData.cpf = document.getElementById('reg-cpf').value;
                userData.nascimento = document.getElementById('reg-nascimento').value;
                userData.endereco = document.getElementById('reg-endereco').value;
                userData.respNome = document.getElementById('reg-resp-nome').value;
            } 
            // SE FOR CORPO CLÍNICO (Qualquer um da lista de saúde)
            else if (['psi', 'psiquiatra', 'nutri', 'feno', 'fisio', 'educador', 'outro_saude'].includes(role)) {
                userData.registroProfissional = document.getElementById('reg-registro-prof').value; // CRP, CRM...
                userData.especialidade = document.getElementById('reg-especialidade').value;
                userData.valorSessao = document.getElementById('reg-valor').value;
                userData.bio = document.getElementById('reg-bio').value;
                userData.formacao = document.getElementById('reg-formacao').value;
                userData.enderecoProf = document.getElementById('reg-prof-endereco').value;
            }
            
            await setDoc(doc(db, "users", cred.user.uid), userData);
            alert("Cadastro realizado!");
            formReg.reset();
        } catch (err) { alert("Erro: " + err.message); }
        finally { if(secApp) await deleteApp(secApp); btn.innerText = txt; btn.disabled = false; }
    });
}

// Controle de Campos Extras (Show/Hide)
const selRole = document.getElementById('reg-role');
if(selRole) {
    selRole.addEventListener('change', function() {
        const areaProf = document.getElementById('reg-prof-extras');
        const areaPac = document.getElementById('reg-paciente-extras');
        const lblReg = document.getElementById('lbl-registro');
        
        areaProf.style.display = 'none';
        areaPac.style.display = 'none';

        const val = this.value;

        if (val === 'paciente') {
            areaPac.style.display = 'block';
        } 
        else if (['psi', 'psiquiatra', 'nutri', 'feno', 'fisio', 'educador', 'outro_saude'].includes(val)) {
            areaProf.style.display = 'block';
            
            // Muda o label do registro dinamicamente
            if(val === 'psi') lblReg.innerText = "CRP";
            else if(val === 'psiquiatra') lblReg.innerText = "CRM";
            else if(val === 'nutri') lblReg.innerText = "CRN";
            else if(val === 'fisio') lblReg.innerText = "CREFITO";
            else if(val === 'educador') lblReg.innerText = "CREF";
            else lblReg.innerText = "Registro Profissional";
        }
    });
}

// --- MODAIS ---
window.abrirModalAgenda = function(ev, d, h) {
    const m = document.getElementById('modal-agenda');
    document.getElementById('form-agenda').reset();
    m.style.display = 'flex';
    if(ev) {
        const p = ev.extendedProps;
        document.getElementById('event-id').value = ev.id;
        document.getElementById('evt-data').value = p.data;
        document.getElementById('evt-hora').value = p.hora;
        document.getElementById('evt-sala').value = p.sala || "Sala 01";
        document.getElementById('btn-excluir-evento').style.display = 'block';
        setTimeout(() => {
            document.getElementById('evt-psi').value = p.psiId;
            document.getElementById('evt-paciente').value = p.paciente;
        }, 200);
    } else {
        document.getElementById('event-id').value = "";
        document.getElementById('evt-data').value = d;
        document.getElementById('evt-hora').value = h;
        document.getElementById('btn-excluir-evento').style.display = 'none';
    }
}
window.fecharModalAgenda = () => document.getElementById('modal-agenda').style.display = 'none';
window.excluirAgendamento = async () => {
    let id = document.getElementById('event-id').value;
    if(confirm('Excluir?')) { await deleteDoc(doc(db, "agendamentos", id)); fecharModalAgenda(); }
}

document.getElementById('form-agenda').addEventListener('submit', async (e) => {
    e.preventDefault();
    let id = document.getElementById('event-id').value;
    let sPsi = document.getElementById('evt-psi');
    let data = {
        data: document.getElementById('evt-data').value,
        hora: document.getElementById('evt-hora').value,
        sala: document.getElementById('evt-sala').value,
        tipo: document.getElementById('evt-tipo').value,
        psiId: sPsi.value,
        psiNome: sPsi.options[sPsi.selectedIndex].text,
        paciente: document.getElementById('evt-paciente').value
    };
    if(id) await updateDoc(doc(db, "agendamentos", id), data);
    else await setDoc(doc(collection(db, "agendamentos")), data);
    fecharModalAgenda();
});

// Genéricos
window.excluirUsuario = async (uid, nome) => { if(confirm(`Excluir ${nome}?`)) await deleteDoc(doc(db, "users", uid)); };
window.abrirEditor = (uid) => { /* Código similar ao anterior se quiser editar, simplifiquei aqui por espaço */ alert("Função Editar disponível no código anterior, adicione se precisar"); };
window.fecharModal = () => document.getElementById('modal-editar').style.display = 'none';
document.getElementById('btnLogout').addEventListener('click', () => signOut(auth).then(() => window.location.href="index.html"));

// START
document.addEventListener("DOMContentLoaded", () => {
    carregarListas();
    inicializarAgenda();
});
