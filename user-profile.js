// Gestion de l'affichage du profil utilisateur

function loadUserProfile() {
    try {
        // Récupérer les données de l'utilisateur depuis localStorage
        const userDataStr = localStorage.getItem('pws_user');
        const email = localStorage.getItem('pws_email');
        
        if (!userDataStr && !email) {
            console.warn('Aucune donnée utilisateur trouvée');
            return;
        }
        
        let userData = null;
        if (userDataStr) {
            try {
                userData = JSON.parse(userDataStr);
            } catch (e) {
                console.error('Erreur lors du parsing des données utilisateur:', e);
            }
        }
        
        // Éléments du DOM
        const fullnameElement = document.getElementById('user-fullname');
        const emailElement = document.getElementById('user-email');
        const initialsElement = document.getElementById('user-initials');
        
        if (!fullnameElement || !emailElement || !initialsElement) {
            console.warn('Éléments du profil utilisateur non trouvés dans le DOM');
            return;
        }
        
        // Mettre à jour le nom complet
        if (userData && userData.firstName && userData.lastName) {
            const fullName = `${userData.firstName} ${userData.lastName}`;
            fullnameElement.textContent = fullName;
            
            // Mettre à jour les initiales
            const initials = `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
            initialsElement.textContent = initials;
        } else if (email) {
            // Fallback sur l'email si pas de nom
            fullnameElement.textContent = email.split('@')[0];
            initialsElement.textContent = email.charAt(0).toUpperCase();
        }
        
        // Mettre à jour l'email
        if (userData && userData.email) {
            emailElement.textContent = userData.email;
        } else if (email) {
            emailElement.textContent = email;
        }
        
        // Informations additionnelles dans la console (utiles pour le debug)
        if (userData && userData.company) {
            console.log('✨ Utilisateur connecté:', {
                nom: `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                entreprise: userData.company.name,
                type: userData.company.type
            });
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement du profil utilisateur:', error);
    }
}

// Charger le profil au chargement de la page
document.addEventListener('DOMContentLoaded', loadUserProfile);
