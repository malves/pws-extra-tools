// Gestion des dates pour Insights

// Définir les dates par défaut au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Par défaut : Hier
    setDateRange('yesterday');
    // Vérifier si on peut activer la dropdown
    checkDatesAndEnableDropdown();
});

// Fonction pour vérifier les dates (simplifié, plus de dropdown)
function checkDatesAndEnableDropdown() {
    // Fonction conservée pour compatibilité avec les appels existants
    // mais ne fait plus rien car on a supprimé la dropdown
}

// Fonction pour définir les plages de dates
function setDateRange(preset) {
    const today = new Date();
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    let startDate = new Date();
    let endDate = new Date();
    
    switch(preset) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
            
        case 'yesterday':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 1);
            endDate = new Date(today);
            endDate.setDate(today.getDate() - 1);
            break;
            
        case 'last7days':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = new Date(today);
            break;
            
        case 'last30days':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            endDate = new Date(today);
            break;
            
        case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
            break;
            
        case 'lastMonth':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
    }
    
    // Formater les dates en YYYY-MM-DD
    startDateInput.value = formatDateForInput(startDate);
    endDateInput.value = formatDateForInput(endDate);
    
    // Vérifier et activer la dropdown après avoir défini les dates
    checkDatesAndEnableDropdown();
}

// Formater une date pour l'input date
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Fonction pour charger les données
async function loadInsightsData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('Veuillez sélectionner une date de début et une date de fin');
        return;
    }
    
    // Vérifier que la date de début est avant la date de fin
    if (new Date(startDate) > new Date(endDate)) {
        alert('La date de début doit être antérieure à la date de fin');
        return;
    }
    
    console.log('📊 Chargement des données PowerSpace...');
    console.log('📅 Période:', startDate, 'au', endDate);
    
    // Vérifier l'authentification
    if (!pwsAuth.isAuthenticated()) {
        alert('Vous devez être connecté à PowerSpace pour charger les données');
        await pwsAuth.authenticate();
        return;
    }
    
    const container = document.getElementById('insights-data-container');
    
    // Afficher un loader
    container.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-gray-600 dark:text-gray-300 font-medium">Chargement des données...</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Période : ${formatDateFR(startDate)} au ${formatDateFR(endDate)}</p>
        </div>
    `;
    
    try {
        // Appeler l'API PowerSpace
        const response = await fetch('/api/powerspace/publisher-cost-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Envoie automatiquement le cookie
            body: JSON.stringify({
                startDate,
                endDate
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Erreur lors du chargement des données');
        }

        const data = result.data;
        
        // Afficher les données dans un tableau
        displayPowerSpaceData(data, startDate, endDate);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        container.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-8">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-exclamation-circle text-red-600 dark:text-red-400 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Erreur de chargement</h3>
                        <p class="text-sm text-red-700 dark:text-red-300">${error.message}</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Formater une date en français
function formatDateFR(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

// Formater un nombre avec séparateurs de milliers
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(num || 0));
}

// Formater un montant en EUR
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

// Formater un pourcentage
function formatPercent(value) {
    return (value || 0).toFixed(2) + '%';
}

// Afficher les données PowerSpace
function displayPowerSpaceData(data, startDate, endDate) {
    const container = document.getElementById('insights-data-container');
    
    // Résumé total
    const total = data.total;
    
    let html = `
        <!-- Résumé global -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Résumé global</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Période : ${formatDateFR(startDate)} au ${formatDateFR(endDate)}
                    </p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Displays</div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-white">${formatNumber(total.displays)}</div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Impressions</div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-white">${formatNumber(total.impressions)}</div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Clicks</div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-white">${formatNumber(total.clicks)}</div>
                </div>
                <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                    <div class="text-sm text-indigo-600 dark:text-indigo-400 mb-1">Commissions</div>
                    <div class="text-2xl font-bold text-indigo-900 dark:text-indigo-300">${formatCurrency(total.commissions)}</div>
                </div>
            </div>
        </div>
    `;
    
    // Tableau des annonceurs par reseller
    if (data.resellers && data.resellers.length > 0) {
        html += `
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Détails par annonceur</h3>
                    <button 
                        id="generate-report-btn-table"
                        onclick="generateReport()"
                        disabled
                        class="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600">
                        <i class="fas fa-file-export"></i>
                        Générer rapport
                        <span id="selected-count-table" class="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">0</span>
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Annonceur</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Displays</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Impressions</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Clicks</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Commissions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        `;
        
        // Parcourir les resellers et leurs annonceurs
        let advertiserIndex = 0;
        data.resellers.forEach(reseller => {
            if (reseller.advertisers && reseller.advertisers.length > 0) {
                reseller.advertisers.forEach(advertiser => {
                    const adv = advertiser.total;
                    // Créer un ID unique basé sur le nom de l'annonceur (encodé pour éviter les problèmes avec les caractères spéciaux)
                    const advertiserId = `adv-${advertiserIndex}`;
                    const advertiserName = advertiser.name.replace(/'/g, "\\'");
                    advertiserIndex++;
                    
                    html += `
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border-b border-gray-200 dark:border-gray-700" 
                            id="advertiser-row-${advertiserId}"
                            onclick="toggleAdvertiserCampaigns('${advertiserId}', '${advertiserName}')">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center gap-2">
                                    <i id="icon-${advertiserId}" class="fas fa-chevron-right text-gray-400 dark:text-gray-500 text-xs transition-transform"></i>
                                    <div>
                                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${advertiser.name}</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400">${reseller.name}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">${formatNumber(adv.displays)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">${formatNumber(adv.impressions)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">${formatNumber(adv.clicks)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-gray-100">${formatCurrency(adv.commissions)}</td>
                        </tr>
                        <tr id="campaigns-row-${advertiserId}" class="hidden bg-gray-50 dark:bg-gray-800/50">
                            <td colspan="5" class="px-6 py-0">
                                <div id="campaigns-${advertiserId}" class="py-4" data-advertiser-name="${advertiser.name}"></div>
                            </td>
                        </tr>
                    `;
                });
            }
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// État des annonceurs chargés
const loadedAdvertisers = new Set();

// État des sélections
const selectedAdGroups = new Set();

// Fonction pour charger et afficher les campagnes d'un annonceur
async function toggleAdvertiserCampaigns(advertiserId, advertiserName) {
    const campaignsRow = document.getElementById(`campaigns-row-${advertiserId}`);
    const campaignsDiv = document.getElementById(`campaigns-${advertiserId}`);
    const icon = document.getElementById(`icon-${advertiserId}`);
    
    // Si déjà ouvert, on ferme
    if (!campaignsRow.classList.contains('hidden')) {
        campaignsRow.classList.add('hidden');
        icon.classList.remove('rotate-90');
        return;
    }
    
    // Si déjà chargé, on affiche juste
    if (loadedAdvertisers.has(advertiserId)) {
        campaignsRow.classList.remove('hidden');
        icon.classList.add('rotate-90');
        return;
    }
    
    // Afficher le loader
    campaignsDiv.innerHTML = `
        <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2 pl-8">
            <i class="fas fa-spinner fa-spin"></i>
            <span class="text-sm">Chargement des campagnes...</span>
        </div>
    `;
    campaignsRow.classList.remove('hidden');
    icon.classList.add('rotate-90');
    
    try {
        // Étape 1: Rechercher l'ID de l'annonceur à partir de son nom
        const searchResponse = await fetch('/api/powerspace/search-company', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: advertiserName
            })
        });
        
        const searchResult = await searchResponse.json();
        
        if (!searchResult.success) {
            throw new Error(searchResult.error || 'Annonceur non trouvé');
        }
        
        const companyId = searchResult.data.id;
        
        // Étape 2: Charger les campagnes avec l'ID
        const campaignsResponse = await fetch('/api/powerspace/advertiser-campaigns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                companyId: companyId
            })
        });
        
        const campaignsResult = await campaignsResponse.json();
        
        if (!campaignsResult.success) {
            throw new Error(campaignsResult.error || 'Erreur lors du chargement des campagnes');
        }
        
        const campaigns = campaignsResult.data;
        
        // Afficher les campagnes
        if (campaigns && campaigns.length > 0) {
            let campaignsHtml = '<div class="space-y-1">';
            
            campaigns.forEach((campaign, index) => {
                const statusColor = campaign.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400';
                const statusBg = campaign.status === 'Active' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700';
                const campaignId = `${advertiserId}-campaign-${campaign.id}`;
                const hasAdGroups = campaign.subItems && campaign.subItems.length > 0;
                
                campaignsHtml += `
                    <div>
                        <div id="campaign-row-${campaignId}" class="flex items-center gap-3 pl-8 pr-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-all">
                            <label class="flex items-center cursor-pointer" onclick="event.stopPropagation()">
                                <input 
                                    type="checkbox" 
                                    id="checkbox-${campaignId}"
                                    onchange="toggleCampaignSelection('${campaignId}', ${hasAdGroups})"
                                    class="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                                >
                            </label>
                            <div class="flex items-center gap-3 flex-1 min-w-0 ${hasAdGroups ? 'cursor-pointer' : ''}" ${hasAdGroups ? `onclick="toggleCampaignAdGroups('${campaignId}', event)"` : ''}>
                                ${hasAdGroups ? 
                                    `<i id="campaign-icon-${campaignId}" class="fas fa-chevron-right text-gray-400 dark:text-gray-500 text-xs transition-transform"></i>` 
                                    : '<div class="w-3"></div>'}
                                <div class="w-2 h-2 rounded-full ${statusBg} flex-shrink-0"></div>
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm text-gray-900 dark:text-gray-100 truncate">${campaign.name}</div>
                                    <div class="text-xs ${statusColor}">${campaign.status}</div>
                                </div>
                                ${hasAdGroups ? 
                                    `<div class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${campaign.subItems.length} groupe${campaign.subItems.length > 1 ? 's' : ''}</div>` 
                                    : ''}
                            </div>
                        </div>
                        ${hasAdGroups ? `
                        <div id="adgroups-${campaignId}" class="hidden pl-16 pr-4 py-1 space-y-1">
                            ${campaign.subItems
                                .sort((a, b) => {
                                    // Trier par statut: Active en premier
                                    if (a.status === 'Active' && b.status !== 'Active') return -1;
                                    if (a.status !== 'Active' && b.status === 'Active') return 1;
                                    return 0;
                                })
                                .map(adGroup => {
                                const agStatusColor = adGroup.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500';
                                const agStatusBg = adGroup.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-50 dark:bg-gray-700/30';
                                const adGroupId = `${campaignId}-adgroup-${adGroup.id}`;
                                return `
                                    <div id="adgroup-row-${adGroupId}" class="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all">
                                        <label class="flex items-center cursor-pointer" onclick="event.stopPropagation()">
                                            <input 
                                                type="checkbox" 
                                                id="checkbox-${adGroupId}"
                                                data-campaign="${campaignId}"
                                                onchange="toggleAdGroupSelection('${adGroupId}', '${campaignId}')"
                                                class="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                                            >
                                        </label>
                                        <div class="flex-1 min-w-0">
                                            <div class="text-sm text-gray-700 dark:text-gray-300 truncate">${adGroup.name}</div>
                                        </div>
                                        <div class="text-sm ${agStatusColor} flex-shrink-0">${adGroup.status}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            
            campaignsHtml += '</div>';
            campaignsDiv.innerHTML = campaignsHtml;
        } else {
            campaignsDiv.innerHTML = `
                <div class="text-sm text-gray-500 dark:text-gray-400 py-2 pl-8">
                    <i class="fas fa-inbox mr-2"></i>
                    Aucune campagne trouvée pour cet annonceur
                </div>
            `;
        }
        
        // Marquer comme chargé
        loadedAdvertisers.add(advertiserId);
        
    } catch (error) {
        console.error('Erreur lors du chargement des campagnes:', error);
        campaignsDiv.innerHTML = `
            <div class="text-sm text-red-600 dark:text-red-400 py-2 pl-8">
                <i class="fas fa-exclamation-circle mr-2"></i>
                Erreur: ${error.message}
            </div>
        `;
    }
}

// Fonction pour afficher/masquer les ad groups d'une campagne
function toggleCampaignAdGroups(campaignId, event) {
    // Empêcher la propagation de l'événement
    if (event) {
        event.stopPropagation();
    }
    
    const adGroupsDiv = document.getElementById(`adgroups-${campaignId}`);
    const icon = document.getElementById(`campaign-icon-${campaignId}`);
    
    if (!adGroupsDiv || !icon) return;
    
    // Toggle l'affichage
    if (adGroupsDiv.classList.contains('hidden')) {
        adGroupsDiv.classList.remove('hidden');
        icon.classList.add('rotate-90');
    } else {
        adGroupsDiv.classList.add('hidden');
        icon.classList.remove('rotate-90');
    }
}

// Fonction pour mettre à jour le compteur de sélection
function updateSelectionCount() {
    const count = selectedAdGroups.size;
    const countSpan = document.getElementById('selected-count-table');
    const reportBtn = document.getElementById('generate-report-btn-table');
    
    if (countSpan) {
        countSpan.textContent = count;
    }
    
    if (reportBtn) {
        reportBtn.disabled = count === 0;
    }
}

// Fonction pour gérer la sélection d'une campagne
function toggleCampaignSelection(campaignId, hasAdGroups) {
    const checkbox = document.getElementById(`checkbox-${campaignId}`);
    const row = document.getElementById(`campaign-row-${campaignId}`);
    
    if (!checkbox || !row) return;
    
    const isChecked = checkbox.checked;
    
    // Appliquer la surbrillance
    if (isChecked) {
        row.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
    } else {
        row.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
    }
    
    // Si la campagne a des ad groups, cocher/décocher tous les ad groups
    if (hasAdGroups) {
        const adGroupsDiv = document.getElementById(`adgroups-${campaignId}`);
        if (adGroupsDiv) {
            const adGroupCheckboxes = adGroupsDiv.querySelectorAll('input[type="checkbox"]');
            adGroupCheckboxes.forEach(agCheckbox => {
                agCheckbox.checked = isChecked;
                // Déclencher l'événement de changement pour appliquer la surbrillance
                const adGroupId = agCheckbox.id.replace('checkbox-', '');
                const agRow = document.getElementById(`adgroup-row-${adGroupId}`);
                
                // Extraire l'ID réel de l'ad group (dernier segment après le dernier tiret)
                const parts = adGroupId.split('-adgroup-');
                if (parts.length === 2) {
                    const realAdGroupId = parts[1];
                    if (isChecked) {
                        selectedAdGroups.add(realAdGroupId);
                    } else {
                        selectedAdGroups.delete(realAdGroupId);
                    }
                }
                
                if (agRow) {
                    if (isChecked) {
                        agRow.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
                    } else {
                        agRow.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
                    }
                }
            });
        }
    }
    
    updateSelectionCount();
}

// Fonction pour gérer la sélection d'un ad group
function toggleAdGroupSelection(adGroupId, campaignId) {
    const checkbox = document.getElementById(`checkbox-${adGroupId}`);
    const row = document.getElementById(`adgroup-row-${adGroupId}`);
    
    if (!checkbox || !row) return;
    
    const isChecked = checkbox.checked;
    
    // Extraire l'ID réel de l'ad group (dernier segment après le dernier tiret)
    const parts = adGroupId.split('-adgroup-');
    if (parts.length === 2) {
        const realAdGroupId = parts[1];
        if (isChecked) {
            selectedAdGroups.add(realAdGroupId);
        } else {
            selectedAdGroups.delete(realAdGroupId);
        }
    }
    
    // Appliquer la surbrillance
    if (isChecked) {
        row.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
    } else {
        row.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
    }
    
    // Vérifier si tous les ad groups de cette campagne sont cochés
    const adGroupsDiv = document.getElementById(`adgroups-${campaignId}`);
    if (adGroupsDiv) {
        const allAdGroupCheckboxes = adGroupsDiv.querySelectorAll('input[type="checkbox"]');
        const allChecked = Array.from(allAdGroupCheckboxes).every(cb => cb.checked);
        const anyChecked = Array.from(allAdGroupCheckboxes).some(cb => cb.checked);
        
        const campaignCheckbox = document.getElementById(`checkbox-${campaignId}`);
        if (campaignCheckbox) {
            campaignCheckbox.checked = allChecked;
            campaignCheckbox.indeterminate = !allChecked && anyChecked;
            
            // Mettre à jour la surbrillance de la campagne
            const campaignRow = document.getElementById(`campaign-row-${campaignId}`);
            if (campaignRow) {
                if (allChecked) {
                    campaignRow.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
                } else {
                    campaignRow.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'ring-1', 'ring-indigo-200', 'dark:ring-indigo-800');
                }
            }
        }
    }
    
    updateSelectionCount();
}

// Fonction pour générer le rapport
function generateReport() {
    if (selectedAdGroups.size === 0) {
        alert('Veuillez sélectionner au moins un ad group');
        return;
    }
    
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('Veuillez sélectionner une période');
        return;
    }
    
    // Construire l'URL avec les paramètres
    const adGroupIds = Array.from(selectedAdGroups).join(',');
    const url = `/report?adGroups=${encodeURIComponent(adGroupIds)}&startDate=${startDate}&endDate=${endDate}`;
    
    // Ouvrir dans un nouvel onglet
    window.open(url, '_blank');
}
