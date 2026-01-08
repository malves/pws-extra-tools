// Vérification de l'authentification sur les pages protégées

// Liste des pages qui ne nécessitent pas d'authentification
const publicPages = ['/login', '/'];

// Vérifier si la page actuelle nécessite une authentification
async function checkAuth() {
    const currentPath = window.location.pathname;
    
    // Si on est sur une page publique, ne rien faire
    if (publicPages.includes(currentPath)) {
        return;
    }
    
    // Vérifier l'authentification via le serveur (qui lit le cookie)
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include' // Important : envoie les cookies
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            // Pas authentifié, rediriger vers la page de login
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        window.location.href = '/login';
    }
}

// Vérifier l'auth au chargement de chaque page
checkAuth();

// Fonction pour se déconnecter
async function logout() {
    try {
        // Appeler l'API de déconnexion pour supprimer le cookie
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include' // Important : envoie les cookies
        });
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
    }
    
    // Nettoyer le localStorage
    localStorage.removeItem('pws_slug');
    localStorage.removeItem('pws_user');
    localStorage.removeItem('home_data_cache');
    
    // Rediriger vers la page de login
    window.location.href = '/login';
}
