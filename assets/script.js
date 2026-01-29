// --- MODO NOTURNO ---
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// --- IMPRESSÃO ---
function imprimirRelatorio() {
    window.print();
}

// --- AUTO-SAVE (Para a página de conceitualização) ---
function setupAutoSave() {
    const textareas = document.querySelectorAll('textarea, input[type="text"]');
    textareas.forEach(el => {
        // Carrega o que foi salvo
        const savedValue = localStorage.getItem('autosave_' + el.id);
        if (savedValue) el.value = savedValue;

        // Salva enquanto digita
        el.addEventListener('input', () => {
            localStorage.setItem('autosave_' + el.id, el.value);
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    // Se estivermos na página de conceitualização, ativa o autosave
    if (document.getElementById('form-conceitualizacao')) {
        setupAutoSave();
    }
});
// 1. Alternar Chips (Usado em esquemas, sintomas, etc)
function toggleChip(el) { 
    el.classList.toggle('active'); 
}

// 2. Configuração Global da IA (Salva no navegador)
function configureIA() {
    const key = prompt("Insira sua Gemini API Key:");
    if (key) {
        localStorage.setItem('gemini_api_key', key.trim());
        location.reload();
    }
}

// 3. Função de Melhoria de Texto com IA (Universal)
async function improveTextIA(elementId, contextType) {
    const textarea = document.getElementById(elementId);
    const originalText = textarea.value;
    const apiKey = localStorage.getItem('gemini_api_key');
    const btn = textarea.nextElementSibling; // O botão mágico que vem logo após o textarea
    
    // Captura dados do paciente para dar contexto à IA (se existirem na página)
    const nome = document.getElementById('pacienteNome')?.value || "o paciente";
    const idade = document.getElementById('pacienteIdade')?.value || "";

    if (!originalText) { alert("Escreva um rascunho primeiro!"); return; }
    if (!apiKey) { 
        alert("Configure a IA primeiro!"); 
        const key = prompt("Insira sua Gemini API Key:");
        if(key) localStorage.setItem('gemini_api_key', key.trim());
        return; 
    }

    // Feedback visual de carregamento
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    // Define as instruções baseadas no contexto passado
    let instructions = "Refine o texto tecnicamente.";
    if (contextType === 'DIAG') instructions = "Refine a descrição clínica do diagnóstico e sintomas, usando terminologia DSM-5.";
    if (contextType === 'TCC') instructions = "Aprimore a formulação cognitiva (Crenças Centrais/Intermediárias) seguindo o modelo de Judith Beck.";
    if (contextType === 'TE') instructions = "Descreva os Esquemas e Modos usando a terminologia de Jeffrey Young (Terapia do Esquema).";
    if (contextType === 'CICLO') instructions = "Explique como os sintomas e os Esquemas se retroalimentam em um ciclo de manutenção.";
    if (contextType === 'PLANO') instructions = "Organize um plano terapêutico integrativo combinando TCC e Terapia do Esquema.";

    const prompt = `
        Atue como um Supervisor Clínico Sênior (Especialista em TCC e Terapia do Esquema).
        Paciente: ${nome} ${idade ? '('+idade+')' : ''}.
        Tarefa: ${instructions}
        Texto Rascunho do Terapeuta: "${originalText}"
        Retorne apenas o texto melhorado e expandido tecnicamente, sem comentários extras.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        
        // Insere o texto da IA de volta no textarea
        textarea.value = data.candidates[0].content.parts[0].text.trim();

    } catch (error) {
        console.error(error);
        alert("Erro na IA: " + error.message);
    } finally {
        btn.innerHTML = originalIcon;
        btn.disabled = false;
    }
}

// --- FUNÇÃO PARA OS CHIPS ---
function toggleChip(el) {
    el.classList.toggle('active');
}

import 'https://unpkg.com/aos@2.3.1/dist/aos.js'; // Caso use módulos, ou apenas a tag <script>
AOS.init({
    duration: 800, // Duração da animação em ms
    once: true     // Executa a animação apenas uma vez ao rolar
});

function criarGraficoBarras(canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 9 } }
        }
    });
}
