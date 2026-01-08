// Gestion de la page Home avec données PowerSpace

let dailyChart = null;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 heures en millisecondes
const CACHE_KEY = 'home_data_cache';

// Charger les données au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    await loadHomeData();
});

// Vérifier si le cache est valide
function isCacheValid() {
    const cache = localStorage.getItem(CACHE_KEY);
    if (!cache) return false;
    
    try {
        const { timestamp } = JSON.parse(cache);
        const now = Date.now();
        const age = now - timestamp;
        
        if (age < CACHE_DURATION) {
            console.log(`✅ Cache valide (${Math.round(age / 1000 / 60)} minutes)`);
            return true;
        } else {
            console.log('⏰ Cache expiré');
            localStorage.removeItem(CACHE_KEY);
            return false;
        }
    } catch (error) {
        console.error('Erreur lecture cache:', error);
        localStorage.removeItem(CACHE_KEY);
        return false;
    }
}

// Récupérer les données du cache
function getCachedData() {
    const cache = localStorage.getItem(CACHE_KEY);
    if (!cache) return null;
    
    try {
        const { data } = JSON.parse(cache);
        return data;
    } catch (error) {
        console.error('Erreur parsing cache:', error);
        return null;
    }
}

// Sauvegarder les données dans le cache
function setCachedData(data) {
    try {
        const cache = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        console.log('💾 Données mises en cache');
    } catch (error) {
        console.error('Erreur sauvegarde cache:', error);
    }
}

// Charger toutes les données de la home
async function loadHomeData(forceRefresh = false) {
    // Vérifier si on peut utiliser le cache
    if (!forceRefresh && isCacheValid()) {
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('📦 Utilisation des données en cache');
            displayStats(cachedData.stats);
            displayChart(cachedData.stats);
            displayActivityFeed(cachedData.activities);
            
            // Afficher un indicateur de cache
            showCacheIndicator();
            return;
        }
    }
    
    // Afficher les loaders
    showLoaders();
    
    try {
        console.log('🔄 Chargement des données depuis l\'API...');
        
        // Charger les données en parallèle
        const [statsData, activityData] = await Promise.all([
            loadDailyStats(),
            loadActivityFeed()
        ]);
        
        // Sauvegarder dans le cache
        setCachedData({
            stats: statsData,
            activities: activityData
        });
        
        // Afficher les statistiques
        displayStats(statsData);
        
        // Afficher le graphique
        displayChart(statsData);
        
        // Afficher la timeline
        displayActivityFeed(activityData);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError(error.message);
    }
}

// Afficher les loaders
function showLoaders() {
    document.getElementById('stats-container').innerHTML = `
        <div class="col-span-3 flex items-center justify-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    `;
    
    document.getElementById('chart-container').innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    `;
    
    document.getElementById('activity-container').innerHTML = `
        <div class="flex items-center justify-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    `;
}

// Charger les statistiques du jour (hier)
async function loadDailyStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    try {
        const response = await fetch('/api/powerspace/publisher-cost-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Envoie automatiquement le cookie
            body: JSON.stringify({
                startDate: yesterdayStr,
                endDate: yesterdayStr
            })
        });
        
        // Vérifier que la réponse est bien du JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('La réponse du serveur n\'est pas au format JSON');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Erreur lors du chargement des statistiques');
        }
        
        return result.data.total;
    } catch (error) {
        console.error('Erreur loadDailyStats:', error);
        throw error;
    }
}

// Charger l'activity feed
async function loadActivityFeed() {
    try {
        const response = await fetch('/api/powerspace/activity-feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Envoie automatiquement le cookie
            body: JSON.stringify({ 
                limit: 15, 
                offset: 0
            })
        });
        
        // Vérifier que la réponse est bien du JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('La réponse du serveur n\'est pas au format JSON');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Erreur lors du chargement des activités');
        }
        
        return result.data;
    } catch (error) {
        console.error('Erreur loadActivityFeed:', error);
        throw error;
    }
}

// Afficher les statistiques
function displayStats(stats) {
    const container = document.getElementById('stats-container');
    
    container.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div class="text-3xl font-bold text-gray-900 dark:text-white mb-2">${formatNumber(stats.displays)}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Displays (hier)</div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div class="text-3xl font-bold text-gray-900 dark:text-white mb-2">${formatNumber(stats.impressions)}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Impressions (hier)</div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <div class="text-3xl font-bold text-gray-900 dark:text-white mb-2">${formatCurrency(stats.commissions)}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Commissions (hier)</div>
        </div>
    `;
}

// Afficher le graphique des 7 derniers jours
async function displayChart(todayStats) {
    const container = document.getElementById('chart-container');
    
    // Calculer les 7 derniers jours
    const dates = [];
    const displays = [];
    const commissions = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i - 1); // -1 pour hier
        const dateStr = date.toISOString().split('T')[0];
        dates.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
        
        try {
            const response = await fetch('/api/powerspace/publisher-cost-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Envoie automatiquement le cookie
                body: JSON.stringify({
                    startDate: dateStr,
                    endDate: dateStr
                })
            });
            
            // Vérifier le content-type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                if (result.success) {
                    displays.push(result.data.total.displays || 0);
                    commissions.push(result.data.total.commissions || 0);
                } else {
                    displays.push(0);
                    commissions.push(0);
                }
            } else {
                displays.push(0);
                commissions.push(0);
            }
        } catch (error) {
            console.warn('Erreur pour la date', dateStr, ':', error.message);
            displays.push(0);
            commissions.push(0);
        }
    }
    
    container.innerHTML = '<canvas id="daily-chart"></canvas>';
    
    const ctx = document.getElementById('daily-chart').getContext('2d');
    
    // Détruire l'ancien graphique s'il existe
    if (dailyChart) {
        dailyChart.destroy();
    }
    
    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Displays',
                    data: displays,
                    borderColor: 'rgb(107, 114, 128)',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Commissions (€)',
                    data: commissions,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.yAxisID === 'y1') {
                                label += formatCurrency(context.parsed.y);
                            } else {
                                label += formatNumber(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Afficher la timeline d'activité
function displayActivityFeed(activities) {
    const container = document.getElementById('activity-container');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-info-circle text-blue-600 dark:text-blue-400"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Aucune activité récente</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    activities.slice(0, 10).forEach(activity => {
        const icon = getActivityIcon(activity.entityType, activity.activityType);
        const color = getActivityColor(activity.newValue);
        const timeAgo = formatTimeAgo(activity.createdAt);
        const description = getActivityDescription(activity);
        
        html += `
            <div class="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                <div class="w-10 h-10 ${color} rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="${icon} text-white"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">${description}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ${activity.user.firstName} ${activity.user.lastName} • ${activity.company.name}
                    </p>
                </div>
                <span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">${timeAgo}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Utilitaires
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(num || 0));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

function getActivityIcon(entityType, activityType) {
    if (activityType === 'Create') return 'fas fa-plus';
    if (activityType === 'Delete') return 'fas fa-trash';
    if (entityType === 'AdCopy') return 'fas fa-ad';
    if (entityType === 'Campaign') return 'fas fa-bullhorn';
    return 'fas fa-edit';
}

function getActivityColor(newValue) {
    if (newValue === 'active' || newValue === 'processing') return 'bg-gray-700 dark:bg-gray-600';
    if (newValue === 'pending') return 'bg-gray-500 dark:bg-gray-500';
    if (newValue === 'inactive' || newValue === 'rejected') return 'bg-gray-400 dark:bg-gray-600';
    return 'bg-gray-600 dark:bg-gray-600';
}

function getActivityDescription(activity) {
    const entity = activity.entityType === 'AdCopy' ? 'Créative' : activity.entityType;
    
    if (activity.property === 'status') {
        const statusMap = {
            'active': 'activé',
            'inactive': 'désactivé',
            'pending': 'en attente',
            'processing': 'en traitement',
            'rejected': 'rejeté'
        };
        return `${entity} ${statusMap[activity.newValue] || activity.newValue}`;
    }
    
    return `${entity} ${activity.activityType === 'Update' ? 'modifié' : activity.activityType}`;
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)}j`;
    
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// Afficher un indicateur de cache
function showCacheIndicator() {
    const header = document.querySelector('h1');
    if (!header) return;
    
    // Vérifier si l'indicateur n'existe pas déjà
    if (document.getElementById('cache-indicator')) return;
    
    const indicator = document.createElement('span');
    indicator.id = 'cache-indicator';
    indicator.className = 'ml-3 text-sm font-normal text-gray-500 dark:text-gray-400';
    indicator.innerHTML = `
        <i class="fas fa-database mr-1"></i>
        Données en cache
        <button onclick="loadHomeData(true)" class="ml-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            Actualiser
        </button>
    `;
    
    header.appendChild(indicator);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        indicator.remove();
    }, 5000);
}

function showError(message) {
    const statsContainer = document.getElementById('stats-container');
    const chartContainer = document.getElementById('chart-container');
    const activityContainer = document.getElementById('activity-container');
    
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="col-span-3 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div class="flex items-start gap-3">
                    <i class="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
                    <div>
                        <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Erreur de chargement</h3>
                        <p class="text-sm text-red-700 dark:text-red-300">${message}</p>
                        <button onclick="loadHomeData(true)" class="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium">
                            <i class="fas fa-redo mr-2"></i>Réessayer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <i class="fas fa-chart-line text-3xl mb-2"></i>
                <p class="text-sm">Impossible de charger le graphique</p>
            </div>
        `;
    }
    
    if (activityContainer) {
        activityContainer.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <i class="fas fa-list text-3xl mb-2"></i>
                <p class="text-sm">Impossible de charger les activités</p>
            </div>
        `;
    }
}
