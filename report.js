// Gestion de la page de rapport détaillé

let reportData = [];

// Configuration des colonnes
let columnsConfig = [
    { id: 'date', label: 'Date', visible: true, format: 'date' },
    { id: 'adCopyTitle', label: 'Ad Copy', visible: true, format: 'text' },
    { id: 'adGroupName', label: 'Ad Group', visible: true, format: 'text' },
    { id: 'impressions', label: 'Impressions', visible: true, format: 'number' },
    { id: 'clicks', label: 'Clicks', visible: true, format: 'number' },
    { id: 'ctr', label: 'CTR', visible: true, format: 'percent' },
    { id: 'cpc', label: 'CPC', visible: true, format: 'currency' },
    { id: 'cpm', label: 'CPM', visible: true, format: 'currency' },
    { id: 'costs', label: 'Costs', visible: true, format: 'currency' }
];

// État du drag & drop
let draggedElement = null;

// Charger les données au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    loadColumnsConfig();
    renderColumnsMenu();
    await loadReportData();
});

// Fonction pour récupérer les paramètres URL
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const adGroupIds = params.get('adGroups');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    
    return {
        adGroupIds: adGroupIds ? adGroupIds.split(',') : [],
        startDate: startDate || '',
        endDate: endDate || ''
    };
}

// Fonction pour générer les dates entre deux dates
function generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        dates.push(new Date(current).toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

// Fonction pour charger les données
async function loadReportData() {
    const loader = document.getElementById('loader');
    const reportContainer = document.getElementById('report-container');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    try {
        const params = getURLParams();
        
        if (params.adGroupIds.length === 0 || !params.startDate || !params.endDate) {
            throw new Error('Paramètres manquants. Veuillez sélectionner des ad groups et une période depuis la page Insights.');
        }
        
        // Générer toutes les dates de la période
        const dates = generateDateRange(params.startDate, params.endDate);
        
        console.log(`📊 Chargement des stats pour ${params.adGroupIds.length} ad group(s) sur ${dates.length} jour(s)`);
        
        reportData = [];
        
        // Pour chaque ad group et chaque jour, récupérer les stats
        for (const adGroupId of params.adGroupIds) {
            for (const date of dates) {
                try {
                    const response = await fetch('/api/powerspace/adgroup-stats', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            adGroupId: adGroupId,
                            startDate: date,
                            endDate: date
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success && result.data) {
                        const adGroup = result.data;
                        
                        // Pour chaque ad copy de cet ad group
                        if (adGroup.adCopies && adGroup.adCopies.length > 0) {
                            adGroup.adCopies.forEach(adCopy => {
                                const stats = adCopy.costDetails.total;
                                
                                // Ajouter seulement si il y a des impressions
                                if (stats.impressions > 0) {
                                    reportData.push({
                                        date: date,
                                        adGroupName: adGroup.name,
                                        adCopyId: adCopy.id,
                                        adCopyName: adCopy.name,
                                        adCopyTitle: adCopy.title,
                                        impressions: stats.impressions,
                                        clicks: stats.clicks,
                                        ctr: stats.ctr,
                                        cpc: stats.cpc,
                                        cpm: stats.cpm,
                                        costs: stats.costs
                                    });
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Erreur pour ad group ${adGroupId} le ${date}:`, error.message);
                }
            }
        }
        
        if (reportData.length === 0) {
            throw new Error('Aucune donnée trouvée pour la période et les ad groups sélectionnés');
        }
        
        // Trier par date puis par ad copy
        reportData.sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date); // Plus récent en premier
            }
            return a.adCopyName.localeCompare(b.adCopyName);
        });
        
        // Afficher les données
        displayReport();
        
        loader.classList.add('hidden');
        reportContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('Erreur lors du chargement du rapport:', error);
        errorMessage.textContent = error.message;
        loader.classList.add('hidden');
        errorContainer.classList.remove('hidden');
    }
}

// Fonction pour formater les nombres
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num || 0);
}

// Fonction pour formater les pourcentages
function formatPercent(num) {
    return `${(num || 0).toFixed(2)} %`;
}

// Fonction pour formater la monnaie
function formatCurrency(num) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(num || 0);
}

// Fonction pour formater la date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Fonction pour obtenir la valeur formatée d'une cellule
function getCellValue(row, columnId, format) {
    const value = row[columnId];
    
    switch (format) {
        case 'date':
            return formatDate(value);
        case 'number':
            return formatNumber(value);
        case 'percent':
            return formatPercent(value);
        case 'currency':
            return formatCurrency(value);
        case 'text':
        default:
            return value || '';
    }
}

// Fonction pour afficher le rapport
function displayReport() {
    const thead = document.querySelector('#report-table thead tr');
    const tbody = document.getElementById('report-tbody');
    
    // Construire le header avec les colonnes visibles
    const visibleColumns = columnsConfig.filter(col => col.visible);
    
    let headerHtml = '';
    visibleColumns.forEach((col, index) => {
        const isFirst = index === 0;
        const isNumeric = ['number', 'percent', 'currency'].includes(col.format);
        const alignment = isNumeric ? 'text-right' : 'text-left';
        const stickyClass = isFirst ? 'sticky left-0 bg-gray-50 dark:bg-gray-700' : '';
        
        headerHtml += `
            <th class="px-6 py-3 ${alignment} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${stickyClass}">
                ${col.label}
            </th>
        `;
    });
    
    thead.innerHTML = headerHtml;
    
    // Construire le body
    let bodyHtml = '';
    
    reportData.forEach(row => {
        bodyHtml += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">';
        
        visibleColumns.forEach((col, index) => {
            const isFirst = index === 0;
            const isNumeric = ['number', 'percent', 'currency'].includes(col.format);
            const alignment = isNumeric ? 'text-right' : 'text-left';
            const stickyClass = isFirst ? 'sticky left-0 bg-white dark:bg-gray-800' : '';
            const fontWeight = col.id === 'costs' ? 'font-medium' : '';
            
            let cellContent = getCellValue(row, col.id, col.format);
            
            // Cas spécial pour adCopyTitle (afficher le nom aussi)
            if (col.id === 'adCopyTitle') {
                cellContent = `
                    <div class="max-w-md">
                        <div class="font-medium">${row.adCopyTitle || row.adCopyName}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${row.adCopyName}</div>
                    </div>
                `;
            }
            
            bodyHtml += `
                <td class="px-6 py-4 ${col.id === 'date' || isNumeric ? 'whitespace-nowrap' : ''} ${alignment} text-sm ${fontWeight} text-gray-900 dark:text-gray-100 ${stickyClass}">
                    ${cellContent}
                </td>
            `;
        });
        
        bodyHtml += '</tr>';
    });
    
    tbody.innerHTML = bodyHtml;
    
    // Mettre à jour le sous-titre
    const params = getURLParams();
    const subtitle = document.getElementById('report-subtitle');
    subtitle.textContent = `${reportData.length} lignes • ${params.adGroupIds.length} ad group(s) • ${formatDate(params.startDate)} - ${formatDate(params.endDate)}`;
}

// Sauvegarder la configuration des colonnes
function saveColumnsConfig() {
    localStorage.setItem('report_columns_config', JSON.stringify(columnsConfig));
}

// Charger la configuration des colonnes
function loadColumnsConfig() {
    const saved = localStorage.getItem('report_columns_config');
    if (saved) {
        try {
            const savedConfig = JSON.parse(saved);
            // Fusionner avec la config par défaut pour gérer les nouvelles colonnes
            columnsConfig = columnsConfig.map(col => {
                const savedCol = savedConfig.find(c => c.id === col.id);
                return savedCol ? { ...col, visible: savedCol.visible } : col;
            });
            // Réordonner selon la config sauvegardée
            const orderedConfig = [];
            savedConfig.forEach(savedCol => {
                const col = columnsConfig.find(c => c.id === savedCol.id);
                if (col) orderedConfig.push(col);
            });
            // Ajouter les nouvelles colonnes à la fin
            columnsConfig.forEach(col => {
                if (!orderedConfig.find(c => c.id === col.id)) {
                    orderedConfig.push(col);
                }
            });
            columnsConfig = orderedConfig;
        } catch (e) {
            console.error('Erreur lors du chargement de la config des colonnes:', e);
        }
    }
}

// Afficher le menu des colonnes
function toggleColumnsMenu() {
    const menu = document.getElementById('columns-menu');
    menu.classList.toggle('hidden');
}

// Rendu du menu des colonnes
function renderColumnsMenu() {
    const list = document.getElementById('columns-list');
    
    list.innerHTML = columnsConfig.map((col, index) => `
        <div 
            draggable="true" 
            data-column-id="${col.id}"
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            ondragstart="handleDragStart(event)"
            ondragover="handleDragOver(event)"
            ondrop="handleDrop(event)"
            ondragend="handleDragEnd(event)">
            <i class="fas fa-grip-vertical text-gray-400"></i>
            <label class="flex items-center gap-2 flex-1 cursor-pointer">
                <input 
                    type="checkbox" 
                    ${col.visible ? 'checked' : ''}
                    onchange="toggleColumnVisibility('${col.id}')"
                    class="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
                >
                <span class="text-sm text-gray-900 dark:text-gray-100">${col.label}</span>
            </label>
        </div>
    `).join('');
}

// Gestion du drag & drop
function handleDragStart(e) {
    draggedElement = e.target;
    e.target.style.opacity = '0.4';
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    
    if (draggedElement !== e.currentTarget) {
        const draggedId = draggedElement.getAttribute('data-column-id');
        const targetId = e.currentTarget.getAttribute('data-column-id');
        
        const draggedIndex = columnsConfig.findIndex(c => c.id === draggedId);
        const targetIndex = columnsConfig.findIndex(c => c.id === targetId);
        
        // Réorganiser le tableau
        const [removed] = columnsConfig.splice(draggedIndex, 1);
        columnsConfig.splice(targetIndex, 0, removed);
        
        saveColumnsConfig();
        renderColumnsMenu();
        displayReport();
    }
    
    return false;
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
}

// Toggle visibilité d'une colonne
function toggleColumnVisibility(columnId) {
    const col = columnsConfig.find(c => c.id === columnId);
    if (col) {
        col.visible = !col.visible;
        saveColumnsConfig();
        displayReport();
    }
}

// Copier dans le clipboard
async function copyToClipboard() {
    if (reportData.length === 0) {
        alert('Aucune donnée à copier');
        return;
    }
    
    const visibleColumns = columnsConfig.filter(col => col.visible);
    
    // Créer le header
    const headers = visibleColumns.map(col => col.label);
    
    // Créer les lignes
    const rows = reportData.map(row => 
        visibleColumns.map(col => {
            let value = row[col.id];
            
            // Formater selon le type
            switch (col.format) {
                case 'number':
                    return value || 0;
                case 'percent':
                    return (value || 0).toFixed(2);
                case 'currency':
                    return (value || 0).toFixed(2);
                default:
                    return value || '';
            }
        })
    );
    
    // Assembler en TSV (pour Excel)
    const tsvContent = [headers, ...rows]
        .map(row => row.join('\t'))
        .join('\n');
    
    try {
        await navigator.clipboard.writeText(tsvContent);
        
        // Feedback visuel
        const btn = document.getElementById('copy-btn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('bg-green-600', 'hover:bg-green-700');
            btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }, 2000);
        
        console.log('✅ Copie dans le clipboard réussie');
    } catch (error) {
        console.error('Erreur lors de la copie:', error);
        alert('Erreur lors de la copie dans le clipboard');
    }
}

// Fonction pour exporter en CSV
function exportToCSV() {
    if (reportData.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    const visibleColumns = columnsConfig.filter(col => col.visible);
    
    // Créer le header CSV
    const headers = visibleColumns.map(col => col.label);
    
    // Créer les lignes CSV
    const rows = reportData.map(row => 
        visibleColumns.map(col => {
            let value = row[col.id];
            
            // Formater selon le type
            switch (col.format) {
                case 'number':
                    return value || 0;
                case 'percent':
                    return (value || 0).toFixed(2);
                case 'currency':
                    return (value || 0).toFixed(2);
                default:
                    // Échapper les guillemets pour CSV
                    return `"${(value || '').toString().replace(/"/g, '""')}"`;
            }
        })
    );
    
    // Assembler le CSV
    const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    // Créer le blob et télécharger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const params = getURLParams();
    const filename = `report_${params.startDate}_${params.endDate}_${Date.now()}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Export CSV réussi');
}
