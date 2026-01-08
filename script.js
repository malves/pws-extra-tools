// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Dark Mode Management
function initDarkMode() {
    // Vérifier la préférence sauvegardée
    const isDark = localStorage.getItem('darkMode') === 'true';
    
    if (isDark) {
        document.documentElement.classList.add('dark');
        updateDarkModeToggle(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateDarkModeToggle(false);
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
        // Passer en mode clair
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
        updateDarkModeToggle(false);
    } else {
        // Passer en mode sombre
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
        updateDarkModeToggle(true);
    }
}

// Mettre à jour l'apparence du toggle
function updateDarkModeToggle(isDark) {
    const toggle = document.querySelector('#dark-mode-toggle');
    const span = toggle?.querySelector('span');
    
    if (!toggle || !span) return;
    
    if (isDark) {
        span.classList.remove('translate-x-1');
        span.classList.add('translate-x-6');
        toggle.classList.remove('bg-gray-200');
        toggle.classList.add('bg-indigo-600');
    } else {
        span.classList.remove('translate-x-6');
        span.classList.add('translate-x-1');
        toggle.classList.remove('bg-indigo-600');
        toggle.classList.add('bg-gray-200');
    }
}

// Initialiser le dark mode au chargement
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
});

// Toggle contact dropdown
function toggleContactDropdown() {
    // Placeholder for dropdown functionality
    console.log('Contact dropdown toggled');
}

// Sidebar navigation
document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', function(e) {
        // Ne pas empêcher la navigation par défaut, juste gérer les classes
        if (!this.querySelector('.fa-chevron-down')) {
            document.querySelectorAll('.sidebar-item').forEach(i => {
                if (!i.querySelector('.fa-chevron-down')) {
                    i.classList.remove('active');
                }
            });
            this.classList.add('active');
        }
    });
});
