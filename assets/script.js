/* ==========================================================================
   1. INICIALIZAÇÃO GLOBAL (Roda em todas as páginas)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Aplica o Modo Noturno salvo
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Inicializa Animações AOS (se a biblioteca for carregada no HTML)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }

    // Se estivermos na página de conceitualização, ativa o autosave
    if (document.getElementById('form-conceitualizacao')) {
        setupAutoSave();
    }
});

/* ==========================================================================
   2. FUNÇÕES DE INTERFACE (Temas, Chips, Dark Mode)
   ========================================================================== */

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function definirTema(nomeTema) {
    document.body.classList.remove('tema-psicologia', 'tema-tdah', 'tema-tcc');
    document.body.classList.add('tema-' + nomeTema);
}

function toggleChip(el) { 
    el.classList.toggle('active'); 
}

function imprimirRelatorio() {
    window.print();
}

/* ==========================================================================
   3. SISTEMA DE IA (GEMINI)
   ========================================================================== */

function configureIA() {
    const key = prompt("Insira sua Gemini API Key:");
    if (key) {
        localStorage.setItem('gemini_api_key', key.trim());
        location.reload();
    }
}

async function improveTextIA(elementId, contextType) {
    const textarea = document.getElementById(elementId);
    const originalText = textarea.value;
    const apiKey = localStorage.getItem('gemini_api_key');
    const btn = textarea.nextElementSibling; 
    
    const nome = document.getElementById('pacienteNome')?.value || "o paciente";
    const idade = document.getElementById('pacienteIdade')?.value || "";

    if (!originalText) { alert("Escreva um rascunho primeiro!"); return; }
    if (!apiKey) { 
        alert("Configure a IA primeiro!"); 
        configureIA();
        return; 
    }

    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    let instructions = "Refine o texto tecnicamente.";
    if (contextType === 'DIAG') instructions = "Refine a descrição clínica usando terminologia DSM-5.";
    if (contextType === 'TCC') instructions = "Aprimore a formulação cognitiva seguindo o modelo de Judith Beck.";
    if (contextType === 'TE') {
        const activeChips = Array.from(document.querySelectorAll('.chip.active')).map(c => c.innerText).join(', ');
        instructions = `Descreva os Esquemas (${activeChips}) usando a terminologia de Jeffrey Young.`;
    }
    if (contextType === 'PLANO') instructions = "Organize um plano terapêutico integrativo combinando TCC e TE.";

    const promptText = `Atue como Supervisor Clínico Sênior. Paciente: ${nome} (${idade}). Tarefa: ${instructions} Texto: "${originalText}". Retorne apenas o resultado final.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        textarea.value = data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        alert("Erro na IA: " + error.message);
    } finally {
        btn.innerHTML = originalIcon;
        btn.disabled = false;
    }
}

/* ==========================================================================
   4. UTILITÁRIOS (AutoSave e Gráficos)
   ========================================================================== */

function setupAutoSave() {
    const textareas = document.querySelectorAll('textarea, input[type="text"]');
    textareas.forEach(el => {
        const savedValue = localStorage.getItem('autosave_' + el.id);
        if (savedValue) el.value = savedValue;
        el.addEventListener('input', () => {
            localStorage.setItem('autosave_' + el.id, el.value);
        });
    });
}

function criarGraficoBarras(canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors, borderRadius: 10 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 9 } }
        }
    });
}
