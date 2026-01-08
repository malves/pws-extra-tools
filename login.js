// Gestion de la page de login

// Vérifier si déjà connecté au chargement
document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier l'authentification via le cookie (côté serveur)
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include' // Important : envoie les cookies
        });
        const data = await response.json();
        
        if (data.authenticated) {
            window.location.href = '/dashboard';
        }
    } catch (error) {
        console.log('Non authentifié');
    }
});

// Gestion du formulaire de connexion
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Désactiver le bouton et afficher le loader
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('button-text');
    const buttonIcon = document.getElementById('button-icon');
    
    submitButton.disabled = true;
    submitButton.classList.add('opacity-75', 'cursor-not-allowed');
    buttonText.textContent = 'Connexion en cours...';
    buttonIcon.className = 'fas fa-spinner fa-spin';
    
    // Cacher le message d'erreur
    document.getElementById('error-message').classList.add('hidden');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, rememberMe })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Le token est maintenant dans un cookie HTTP-only sécurisé
            // On stocke uniquement les données non-sensibles
            localStorage.setItem('pws_slug', data.slug);
            if (data.user) {
                localStorage.setItem('pws_user', JSON.stringify(data.user));
            }
            
            // Afficher succès
            buttonText.textContent = 'Connecté !';
            buttonIcon.className = 'fas fa-check';
            submitButton.classList.remove('bg-indigo-950', 'hover:bg-indigo-900');
            submitButton.classList.add('bg-green-600');
            
            // Rediriger après un court délai
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);
            
        } else {
            throw new Error(data.error || 'Erreur de connexion');
        }
        
    } catch (error) {
        console.error('Erreur de connexion:', error);
        
        // Afficher le message d'erreur
        document.getElementById('error-text').textContent = error.message;
        document.getElementById('error-message').classList.remove('hidden');
        
        // Réactiver le bouton
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-75', 'cursor-not-allowed');
        buttonText.textContent = 'Se connecter';
        buttonIcon.className = 'fas fa-arrow-right';
    }
});

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('password-toggle-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}
