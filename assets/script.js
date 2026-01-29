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