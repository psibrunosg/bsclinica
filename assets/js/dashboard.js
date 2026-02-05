// Arquivo: assets/js/dashboard.js

// 1. IMPORTAÇÕES
import { auth, db } from '../firebase.js'; 
import { signOut, onAuthStateChanged, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { initializeApp, getApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";

let calendar; // Variável global do calendário

// 2. AUTH GUARD
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
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
    
    // Se abrir a agenda, renderiza o calendário
    if (idSecao === 'sec-agenda' && calendar) {
        setTimeout(() => { calendar.render(); }, 100); 
    }
}

window.abrirCadastroPaciente = function() {
    // Abre a aba de cadastro e foca em Paciente
    mostrarSecao('sec-cadastro', document.querySelectorAll('.nav-item')[5]); // Ajuste o index se precisar
    document.getElementById('reg-role').value = 'paciente';
    document.getElementById('reg-role').dispatchEvent(new Event('change')); // Dispara o evento visual
}


// 4. CARREGAMENTO DE DADOS (Equipe e Pacientes)
function carregarListas() {
    // A) LISTA DE PSICÓLOGOS (Para Tabela e Select da Agenda)
    const qPsi = query(collection(db, "users"), where("role", "==", "psi"));
    onSnapshot(qPsi, (snap) => {
        const listaPsi = document.getElementById('lista-psi');
        const selectPsi = document.getElementById('evt-psi');
        
        if(listaPsi) listaPsi.innerHTML = "";
        if(selectPsi) selectPsi.innerHTML = '<option value="">Selecione...</option>';

        snap.forEach((doc) => {
            const d = doc.data();
            // Preenche Tabela
            if(listaPsi) {
                listaPsi.innerHTML += `
                    <tr>
                        <td><span class="status-badge status-online"></span></td>
                        <td><strong>${d.nome}</strong></td>
                        <td>${d.crp || '-'}</td>
                        <td>${d.abordagem || '-'}</td>
                        <td style="text-align:right;">
                            <button onclick="excluirUsuario('${doc.id}', '${d.nome}')" style="color:#e74c3c; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
            }
            // Preenche Select da Agenda
            if(selectPsi) {
                const opt = document.createElement('option');
                opt.value = doc.id; // Salvamos o ID do doc, não o UID as vezes
                opt.text = d.nome;
                selectPsi.appendChild(opt);
            }
        });
        document.getElementById('count-psi').innerText = snap.size;
    });

    // B) LISTA DE PACIENTES (Para Tabela Nova e Select da Agenda)
    const qPacientes = query(collection(db, "users"), where("role", "==", "paciente"));
    onSnapshot(qPacientes, (snap) => {
        const listaPac = document.getElementById('lista-pacientes');
        const selectPac = document.getElementById('evt-paciente');
        
        if(listaPac) listaPac.innerHTML = "";
        if(selectPac) selectPac.innerHTML = '<option value="">Selecione o Paciente...</option>';

        snap.forEach((doc) => {
            const d = doc.data();
            // Tabela
            if(listaPac) {
                listaPac.innerHTML += `
                    <tr>
                        <td><strong>${d.nome}</strong></td>
                        <td>${d.email}</td>
                        <td>${d.telefone || '-'}</td>
                        <td style="text-align:right;">
                             <button onclick="excluirUsuario('${doc.id}', '${d.nome}')" style="color:#e74c3c; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
            }
            // Select Agenda
            if(selectPac) {
                const opt = document.createElement('option');
                opt.value = d.nome; // Salvamos o Nome para aparecer no card, ou ID se preferir
                opt.text = d.nome;
                selectPac.appendChild(opt);
            }
        });
        document.getElementById('count-pacientes').innerText = snap.size;
    });
}


// 5. AGENDA (Lógica Corrigida)
function inicializarAgenda() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // Visão semanal é melhor para clínicas
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'pt-br',
        slotMinTime: "07:00:00",
        slotMaxTime: "22:00:00",
        allDaySlot: false,
        selectable: true,
        editable: true, // Permite arrastar

        // Ao clicar no calendário vazio
        dateClick: function(info) {
            // Se for visão de mês, data vem sem hora. Se for semana, vem com hora.
            let dataStr = info.dateStr.split('T')[0];
            let horaStr = info.dateStr.includes('T') ? info.dateStr.split('T')[1].substring(0,5) : "08:00";
            abrirModalAgenda(null, dataStr, horaStr);
        },

        // Ao clicar num evento
        eventClick: function(info) {
            abrirModalAgenda(info.event);
        },
        
        // Ao arrastar evento (Drop) -> Atualiza no banco
        eventDrop: async function(info) {
            if(!confirm("Mover agendamento para " + info.event.start.toLocaleString() + "?")) {
                info.revert();
            } else {
                // Atualiza data/hora no Firestore
                const novaData = info.event.start.toISOString().split('T')[0];
                const novaHora = info.event.start.toTimeString().substring(0,5);
                await updateDoc(doc(db, "agendamentos", info.event.id), {
                    data: novaData,
                    hora: novaHora
                });
            }
        }
    });

    calendar.render();

    // --- SINCRONIZAÇÃO EM TEMPO REAL (A CORREÇÃO DO "NÃO APARECE") ---
    // Em vez de usar 'events: function', usamos um listener externo
    const qAgenda = query(collection(db, "agendamentos"));
    onSnapshot(qAgenda, (snapshot) => {
        calendar.removeAllEvents(); // Limpa tudo
        
        const eventos = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                title: `${d.paciente} (${d.psiNome})`, // Título do Card
                start: `${d.data}T${d.hora}`, // Formato ISO
                backgroundColor: definirCorPorSala(d.sala), // COR DA SALA
                borderColor: definirCorPorSala(d.sala),
                extendedProps: { ...d } // Guarda tudo pra edição
            };
        });
        
        calendar.addEventSource(eventos); // Adiciona os novos
    });
}

// CORES POR SALA
function definirCorPorSala(sala) {
    switch (sala) {
        case 'Sala 01': return '#3498db'; // Azul
        case 'Sala 02': return '#27ae60'; // Verde
        case 'Sala 03': return '#e67e22'; // Laranja
        case 'Sala 04': return '#9b59b6'; // Roxo
        case 'Sala 05': return '#7f8c8d'; // Cinza
        default: return '#2c3e50';
    }
}


// 6. MODAL DA AGENDA
window.abrirModalAgenda = function(evento, dataStr, horaStr) {
    const modal = document.getElementById('modal-agenda');
    const form = document.getElementById('form-agenda');
    form.reset();
    modal.style.display = 'flex';

    if(evento) {
        // Edição
        const props = evento.extendedProps;
        document.getElementById('event-id').value = evento.id;
        document.getElementById('evt-data').value = props.data;
        document.getElementById('evt-hora').value = props.hora;
        document.getElementById('evt-sala').value = props.sala || "Sala 01";
        document.getElementById('evt-tipo').value = props.tipo;
        
        // Seta os Selects (delay pequeno pra garantir que carregou)
        setTimeout(() => {
            document.getElementById('evt-psi').value = props.psiId;
            document.getElementById('evt-paciente').value = props.paciente; 
        }, 100);

        document.getElementById('btn-excluir-evento').style.display = 'block';
    } else {
        // Novo
        document.getElementById('event-id').value = "";
        document.getElementById('evt-data').value = dataStr;
        document.getElementById('evt-hora').value = horaStr;
        document.getElementById('btn-excluir-evento').style.display = 'none';
    }
}

window.fecharModalAgenda = function() {
    document.getElementById('modal-agenda').style.display = 'none';
}

// Salvar Agendamento
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
        paciente: document.getElementById('evt-paciente').value // Pega o nome do select
    };

    try {
        if(id) {
            await updateDoc(doc(db, "agendamentos", id), dados);
        } else {
            await setDoc(doc(collection(db, "agendamentos")), dados);
        }
        fecharModalAgenda();
        // Não precisa alert, o calendário atualiza visualmente sozinho
    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.innerText = "Confirmar Agenda";
    }
});

window.excluirAgendamento = async function() {
    const id = document.getElementById('event-id').value;
    if(confirm("Excluir este agendamento?")) {
        await deleteDoc(doc(db, "agendamentos", id));
        fecharModalAgenda();
    }
}


// 7. FUNÇÃO DE EXCLUIR USUÁRIO (Genérica)
window.excluirUsuario = async function(uid, nome) {
    if(confirm(`Remover ${nome} do sistema?`)) {
        await deleteDoc(doc(db, "users", uid));
    }
}

// 8. CADASTRO DE USUÁRIOS (Staff e Pacientes)
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
        const crp = document.getElementById('reg-crp')?.value || "";

        let secondaryApp = null;
        try {
            const config = getApp().options;
            secondaryApp = initializeApp(config, "RegistradorTemporario");
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            
            await setDoc(doc(db, "users", userCredential.user.uid), {
                uid: userCredential.user.uid,
                nome: nome,
                email: email,
                role: role,
                telefone: phone,
                crp: role === 'psi' ? crp : null,
                criadoEm: serverTimestamp()
            });

            alert("Cadastro realizado!");
            formCadastro.reset();
        } catch (err) {
            alert("Erro: " + err.message);
        } finally {
            if(secondaryApp) await deleteApp(secondaryApp);
            btn.innerText = txtOriginal;
            btn.disabled = false;
        }
    });
}

// Controle UI do Form de Cadastro
const selectRole = document.getElementById('reg-role');
if(selectRole) {
    selectRole.addEventListener('change', function() {
        const areaPsi = document.getElementById('reg-psi-extras');
        if(areaPsi) this.value === 'psi' ? areaPsi.style.display = 'block' : areaPsi.style.display = 'none';
    });
}

// LOGOUT
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
});


// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    carregarListas();
    inicializarAgenda();
});
