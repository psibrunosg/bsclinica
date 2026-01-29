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
async function improveTextIA(elementId, promptType) {
    const textarea = document.getElementById(elementId);
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("Configure a IA primeiro!");

    const btn = textarea.nextElementSibling;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
