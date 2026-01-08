// Gestion de l'authentification PowerSpace
class PowerSpaceAuth {
    constructor() {
        this.authenticated = false;
    }

    updateBadge(connected, errorMessage = null) {
        const badge = document.getElementById('pws-connection-badge');
        if (!badge) return;

        if (connected) {
            badge.innerHTML = `
                <div class="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span class="text-xs font-medium text-green-700 dark:text-green-300">PowerSpace</span>
                </div>
            `;
        } else {
            badge.innerHTML = `
                <div class="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer" 
                     onclick="window.location.href='/login'" 
                     title="${errorMessage || 'Cliquez pour reconnecter'}">
                    <span class="relative flex h-2 w-2">
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span class="text-xs font-medium text-red-700 dark:text-red-300">Déconnecté</span>
                </div>
            `;
        }
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/api/auth/check', {
                credentials: 'include'
            });
            const data = await response.json();
            this.authenticated = data.authenticated;
            return this.authenticated;
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error);
            this.authenticated = false;
            return false;
        }
    }

    isAuthenticated() {
        return this.authenticated;
    }
}

// Instance globale
const pwsAuth = new PowerSpaceAuth();

// Vérifier l'authentification au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Vérification de l\'authentification PowerSpace...');
    
    // Vérifier via le serveur (qui lit le cookie HTTP-only)
    const isAuth = await pwsAuth.checkAuthentication();
    
    if (isAuth) {
        pwsAuth.updateBadge(true);
        console.log('✅ Authentifié via cookie sécurisé');
    } else {
        pwsAuth.updateBadge(false);
        console.log('⚠️ Non authentifié');
    }
});
