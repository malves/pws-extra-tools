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
            
            // Séparer les colonnes de base des colonnes externes sauvegardées
            const baseConfig = columnsConfig.filter(c => baseColumnIds.includes(c.id));
            const savedExternalCols = savedConfig.filter(c => c.isExternal);
            
            // Fusionner les colonnes de base avec la config sauvegardée
            let mergedConfig = baseConfig.map(col => {
                const savedCol = savedConfig.find(c => c.id === col.id);
                return savedCol ? { ...col, visible: savedCol.visible } : col;
            });
            
            // Ajouter les colonnes externes sauvegardées
            savedExternalCols.forEach(extCol => {
                if (!mergedConfig.find(c => c.id === extCol.id)) {
                    mergedConfig.push(extCol);
                }
            });
            
            // Réordonner selon la config sauvegardée
            const orderedConfig = [];
            savedConfig.forEach(savedCol => {
                const col = mergedConfig.find(c => c.id === savedCol.id);
                if (col) orderedConfig.push(col);
            });
            
            // Ajouter les nouvelles colonnes à la fin
            mergedConfig.forEach(col => {
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
            ondragstart="handleColumnDragStart(event)"
            ondragover="handleColumnDragOver(event)"
            ondrop="handleColumnDrop(event)"
            ondragend="handleColumnDragEnd(event)">
            <i class="fas fa-grip-vertical text-gray-400"></i>
            <label class="flex items-center gap-2 flex-1 cursor-pointer">
                <input 
                    type="checkbox" 
                    ${col.visible ? 'checked' : ''}
                    onchange="toggleColumnVisibility('${col.id}')"
                    class="w-4 h-4 text-indigo-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
                >
                <span class="text-sm text-gray-900 dark:text-gray-100">${col.label}</span>
                ${col.isExternal ? '<span class="external-column-badge"><i class="fas fa-file-import text-[8px]"></i> Importé</span>' : ''}
            </label>
        </div>
    `).join('');
}

// Gestion du drag & drop des colonnes
function handleColumnDragStart(e) {
    draggedElement = e.target;
    e.target.style.opacity = '0.4';
}

function handleColumnDragOver(e) {
    e.preventDefault();
    return false;
}

function handleColumnDrop(e) {
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

function handleColumnDragEnd(e) {
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

// ============================================
// IMPORT DE DONNÉES EXTERNES
// ============================================

// État de l'import
let importState = {
    currentStep: 1,
    fileId: null,
    originalName: null,
    rawLines: [],
    totalLines: 0,
    isExcel: false,
    startLine: 0,
    detectedSeparator: ';',
    selectedSeparator: 'auto',
    parsedData: null,
    columns: [],
    selectedAdcopyColumn: null,
    uniqueExternalValues: [],
    existingMappings: {},
    currentMappings: {},
    externalData: []
};

// Colonnes de base (non-externes)
const baseColumnIds = ['date', 'adCopyTitle', 'adGroupName', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'costs'];

// Ouvrir la modal d'import
function openImportModal() {
    resetImportState();
    document.getElementById('import-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    updateStepIndicators();
}

// Fermer la modal d'import
function closeImportModal() {
    document.getElementById('import-modal').classList.add('hidden');
    document.body.style.overflow = '';
    
    // Supprimer le fichier temporaire si présent
    if (importState.fileId) {
        fetch(`/api/upload/${importState.fileId}`, { method: 'DELETE' }).catch(() => {});
    }
    
    resetImportState();
}

// Réinitialiser l'état de l'import
function resetImportState() {
    importState = {
        currentStep: 1,
        fileId: null,
        originalName: null,
        rawLines: [],
        totalLines: 0,
        isExcel: false,
        startLine: 0,
        detectedSeparator: ';',
        selectedSeparator: 'auto',
        parsedData: null,
        columns: [],
        selectedAdcopyColumn: null,
        uniqueExternalValues: [],
        existingMappings: {},
        currentMappings: {},
        externalData: []
    };
    
    // Reset UI
    document.getElementById('file-input').value = '';
    document.getElementById('selected-file-info').classList.add('hidden');
    document.getElementById('drop-zone').classList.remove('hidden');
}

// Mettre à jour les indicateurs d'étapes
function updateStepIndicators() {
    const stepTitles = [
        'Étape 1 sur 5 - Sélection du fichier',
        'Étape 2 sur 5 - Ligne de départ',
        'Étape 3 sur 5 - Colonne AdCopy',
        'Étape 4 sur 5 - Mapping des valeurs',
        'Étape 5 sur 5 - Confirmation'
    ];
    
    document.getElementById('import-step-indicator').textContent = stepTitles[importState.currentStep - 1];
    
    // Mettre à jour les indicateurs visuels
    for (let i = 1; i <= 5; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        const circle = indicator.querySelector('div');
        
        if (i < importState.currentStep) {
            // Étape complétée
            indicator.classList.remove('opacity-40');
            circle.className = 'w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-medium';
            circle.innerHTML = '<i class="fas fa-check"></i>';
        } else if (i === importState.currentStep) {
            // Étape actuelle
            indicator.classList.remove('opacity-40');
            circle.className = 'w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-medium';
            circle.textContent = i;
        } else {
            // Étape future
            indicator.classList.add('opacity-40');
            circle.className = 'w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 flex items-center justify-center text-sm font-medium';
            circle.textContent = i;
        }
    }
    
    // Mettre à jour les barres de progression
    for (let i = 1; i < 5; i++) {
        const progress = document.getElementById(`progress-${i}-${i+1}`);
        progress.style.width = importState.currentStep > i ? '100%' : '0%';
    }
    
    // Afficher/masquer les étapes
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`import-step-${i}`);
        if (i === importState.currentStep) {
            step.classList.remove('hidden');
        } else {
            step.classList.add('hidden');
        }
    }
    
    // Bouton retour
    const backBtn = document.getElementById('import-back-btn');
    if (importState.currentStep > 1) {
        backBtn.classList.remove('hidden');
    } else {
        backBtn.classList.add('hidden');
    }
    
    // Bouton suivant
    const nextBtn = document.getElementById('import-next-btn');
    if (importState.currentStep === 5) {
        nextBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Fusionner les données';
    } else {
        nextBtn.innerHTML = 'Continuer <i class="fas fa-arrow-right ml-2"></i>';
    }
    
    updateNextButtonState();
}

// Mettre à jour l'état du bouton suivant
function updateNextButtonState() {
    const nextBtn = document.getElementById('import-next-btn');
    let enabled = false;
    
    switch (importState.currentStep) {
        case 1:
            enabled = importState.fileId !== null;
            break;
        case 2:
            enabled = importState.startLine >= 0;
            break;
        case 3:
            enabled = importState.selectedAdcopyColumn !== null;
            break;
        case 4:
            // Au moins un mapping doit être fait
            enabled = Object.keys(importState.currentMappings).length > 0;
            break;
        case 5:
            enabled = true;
            break;
    }
    
    nextBtn.disabled = !enabled;
}

// Aller à l'étape suivante
async function goToNextStep() {
    if (importState.currentStep === 5) {
        // Fusion finale
        await performDataMerge();
        return;
    }
    
    // Actions spécifiques avant de passer à l'étape suivante
    if (importState.currentStep === 1) {
        // Charger les lignes brutes
        await loadRawLines();
    } else if (importState.currentStep === 2) {
        // Parser le fichier
        await parseFileFromSelectedLine();
    } else if (importState.currentStep === 3) {
        // Charger l'interface de mapping
        await loadMappingInterface();
    } else if (importState.currentStep === 4) {
        // Préparer le résumé
        prepareSummary();
    }
    
    importState.currentStep++;
    updateStepIndicators();
}

// Aller à l'étape précédente
function goToPreviousStep() {
    if (importState.currentStep > 1) {
        importState.currentStep--;
        updateStepIndicators();
    }
}

// ============================================
// ÉTAPE 1: UPLOAD DE FICHIER
// ============================================

// Gestion du drag & drop
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('drop-zone').classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('drop-zone').classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('drop-zone').classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processSelectedFile(files[0]);
    }
}

// Sélection de fichier via input
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processSelectedFile(files[0]);
    }
}

// Traiter le fichier sélectionné
async function processSelectedFile(file) {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
        alert('Format de fichier non supporté. Utilisez CSV ou XLSX.');
        return;
    }
    
    // Afficher les infos du fichier
    document.getElementById('selected-file-name').textContent = file.name;
    document.getElementById('selected-file-size').textContent = formatFileSize(file.size);
    document.getElementById('selected-file-info').classList.remove('hidden');
    
    // Upload vers le serveur
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload/preview', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Erreur lors de l\'upload');
        }
        
        // Stocker les infos
        importState.fileId = result.data.fileId;
        importState.originalName = result.data.originalName;
        importState.rawLines = result.data.lines;
        importState.totalLines = result.data.totalLines;
        importState.isExcel = result.data.isExcel;
        importState.detectedSeparator = result.data.detectedSeparator;
        
        console.log(`✅ Fichier uploadé: ${file.name} (${result.data.totalLines} lignes)`);
        
        updateNextButtonState();
        
    } catch (error) {
        console.error('Erreur upload:', error);
        alert('Erreur lors de l\'upload du fichier: ' + error.message);
        clearSelectedFile();
    }
}

// Effacer le fichier sélectionné
function clearSelectedFile() {
    if (importState.fileId) {
        fetch(`/api/upload/${importState.fileId}`, { method: 'DELETE' }).catch(() => {});
    }
    
    importState.fileId = null;
    importState.originalName = null;
    importState.rawLines = [];
    
    document.getElementById('file-input').value = '';
    document.getElementById('selected-file-info').classList.add('hidden');
    
    updateNextButtonState();
}

// Formater la taille du fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// ÉTAPE 2: SÉLECTION DE LA LIGNE DE DÉPART
// ============================================

// Charger et afficher les lignes brutes
function loadRawLines() {
    const container = document.getElementById('raw-lines-container');
    
    // Mettre à jour le sélecteur de séparateur
    const separatorSelect = document.getElementById('separator-select');
    separatorSelect.value = 'auto';
    
    // Générer le HTML des lignes
    let html = '';
    importState.rawLines.forEach((line, index) => {
        const isSelected = index === importState.startLine;
        html += `
            <div class="raw-line ${isSelected ? 'selected' : ''}" onclick="selectStartLine(${index})" data-line="${index}">
                <div class="raw-line-number">${index + 1}</div>
                <div class="raw-line-content">${escapeHtml(line) || '(ligne vide)'}</div>
            </div>
        `;
    });
    
    if (importState.totalLines > importState.rawLines.length) {
        html += `
            <div class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                ... et ${importState.totalLines - importState.rawLines.length} lignes supplémentaires
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Sélectionner la ligne de départ
function selectStartLine(lineIndex) {
    importState.startLine = lineIndex;
    
    // Mettre à jour l'affichage
    document.querySelectorAll('.raw-line').forEach((el, i) => {
        if (i === lineIndex) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
    
    updateNextButtonState();
}

// Mettre à jour la prévisualisation avec le séparateur
function updateSeparatorPreview() {
    importState.selectedSeparator = document.getElementById('separator-select').value;
}

// Échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// ÉTAPE 3: SÉLECTION DE LA COLONNE ADCOPY
// ============================================

// Parser le fichier à partir de la ligne sélectionnée
async function parseFileFromSelectedLine() {
    try {
        const response = await fetch('/api/upload/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileId: importState.fileId,
                startLine: importState.startLine,
                separator: importState.selectedSeparator
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Erreur lors du parsing');
        }
        
        importState.columns = result.data.columns;
        importState.parsedData = result.data.data;
        importState.externalData = result.data.data;
        
        console.log(`✅ Fichier parsé: ${result.data.rowCount} lignes, ${result.data.columns.length} colonnes`);
        
        // Mettre à jour le sélecteur de colonnes
        const select = document.getElementById('adcopy-column-select');
        select.innerHTML = '<option value="">-- Sélectionnez une colonne --</option>';
        importState.columns.forEach(col => {
            select.innerHTML += `<option value="${escapeHtml(col)}">${escapeHtml(col)}</option>`;
        });
        
        // Afficher l'aperçu du tableau
        displayColumnPreview();
        
    } catch (error) {
        console.error('Erreur parsing:', error);
        alert('Erreur lors du parsing du fichier: ' + error.message);
    }
}

// Afficher l'aperçu des colonnes
function displayColumnPreview() {
    const container = document.getElementById('column-preview-container');
    const preview = importState.parsedData.slice(0, 10);
    
    let html = '<table class="column-preview-table"><thead><tr>';
    
    importState.columns.forEach(col => {
        const isSelected = col === importState.selectedAdcopyColumn;
        html += `<th class="${isSelected ? 'selected-column' : ''}">${escapeHtml(col)}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    preview.forEach(row => {
        html += '<tr>';
        importState.columns.forEach(col => {
            const isSelected = col === importState.selectedAdcopyColumn;
            html += `<td class="${isSelected ? 'selected-column' : ''}">${escapeHtml(row[col] || '')}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    if (importState.parsedData.length > 10) {
        html += `<div class="text-center py-3 text-gray-500 dark:text-gray-400 text-sm">
            ... et ${importState.parsedData.length - 10} lignes supplémentaires
        </div>`;
    }
    
    container.innerHTML = html;
}

// Prévisualiser la sélection de colonne
function previewColumnSelection() {
    const select = document.getElementById('adcopy-column-select');
    importState.selectedAdcopyColumn = select.value || null;
    
    displayColumnPreview();
    updateNextButtonState();
}

// ============================================
// ÉTAPE 4: MAPPING
// ============================================

// Charger l'interface de mapping
async function loadMappingInterface() {
    // Extraire les valeurs uniques de la colonne sélectionnée
    const uniqueValues = [...new Set(
        importState.parsedData
            .map(row => row[importState.selectedAdcopyColumn])
            .filter(v => v && v.toString().trim() !== '')
    )].sort();
    
    importState.uniqueExternalValues = uniqueValues;
    
    // Récupérer les mappings existants
    try {
        const response = await fetch('/api/mappings/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ externalValues: uniqueValues })
        });
        
        const result = await response.json();
        
        if (result.success) {
            importState.existingMappings = result.data.mappings;
            importState.currentMappings = { ...result.data.mappings };
        }
    } catch (error) {
        console.warn('Erreur lors de la récupération des mappings:', error);
    }
    
    // Obtenir les adcopy uniques du rapport avec titre ET nom
    const reportAdcopiesMap = new Map();
    reportData.forEach(r => {
        const key = r.adCopyTitle || r.adCopyName;
        if (!reportAdcopiesMap.has(key)) {
            reportAdcopiesMap.set(key, {
                title: r.adCopyTitle || r.adCopyName,
                name: r.adCopyName
            });
        }
    });
    const reportAdcopies = Array.from(reportAdcopiesMap.values()).sort((a, b) => 
        a.title.localeCompare(b.title)
    );
    
    // Afficher l'interface de mapping
    displayMappingInterface(uniqueValues, reportAdcopies);
}

// Afficher l'interface de mapping
function displayMappingInterface(externalValues, reportAdcopies) {
    const container = document.getElementById('mapping-container');
    
    let html = '';
    let mappedCount = 0;
    let unmappedCount = 0;
    
    externalValues.forEach((extValue, index) => {
        const existingMapping = importState.currentMappings[extValue];
        const isMapped = !!existingMapping;
        
        if (isMapped) mappedCount++;
        else unmappedCount++;
        
        html += `
            <div class="mapping-row ${isMapped ? 'mapped' : 'unmapped'}" id="mapping-row-${index}">
                <div class="mapping-status ${isMapped ? 'mapped' : 'unmapped'}">
                    <i class="fas ${isMapped ? 'fa-check' : 'fa-question'} text-xs"></i>
                </div>
                <div class="mapping-external-value" title="${escapeHtml(extValue)}">${escapeHtml(extValue)}</div>
                <div class="mapping-arrow">
                    <i class="fas fa-arrow-right"></i>
                </div>
                <div class="mapping-select-container">
                    <select class="mapping-select" onchange="updateMapping(${index}, '${escapeHtml(extValue).replace(/'/g, "\\'")}', this.value)">
                        <option value="">-- Non mappé --</option>
                        ${reportAdcopies.map(adcopy => {
                            const displayText = adcopy.name && adcopy.name !== adcopy.title 
                                ? `${adcopy.title}\n${adcopy.name}` 
                                : adcopy.title;
                            const value = adcopy.title;
                            return `
                                <option value="${escapeHtml(value)}" ${existingMapping === value ? 'selected' : ''}>
                                    ${escapeHtml(adcopy.title)} — ${escapeHtml(adcopy.name)}
                                </option>
                            `;
                        }).join('')}
                    </select>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Mettre à jour les compteurs
    document.getElementById('mapped-count').textContent = mappedCount;
    document.getElementById('unmapped-count').textContent = unmappedCount;
    
    updateNextButtonState();
}

// Mettre à jour un mapping
function updateMapping(index, externalValue, adcopyValue) {
    const row = document.getElementById(`mapping-row-${index}`);
    const status = row.querySelector('.mapping-status');
    
    if (adcopyValue) {
        importState.currentMappings[externalValue] = adcopyValue;
        row.classList.remove('unmapped');
        row.classList.add('mapped');
        status.classList.remove('unmapped');
        status.classList.add('mapped');
        status.innerHTML = '<i class="fas fa-check text-xs"></i>';
    } else {
        delete importState.currentMappings[externalValue];
        row.classList.remove('mapped');
        row.classList.add('unmapped');
        status.classList.remove('mapped');
        status.classList.add('unmapped');
        status.innerHTML = '<i class="fas fa-question text-xs"></i>';
    }
    
    // Mettre à jour les compteurs
    const mappedCount = Object.keys(importState.currentMappings).length;
    const unmappedCount = importState.uniqueExternalValues.length - mappedCount;
    document.getElementById('mapped-count').textContent = mappedCount;
    document.getElementById('unmapped-count').textContent = unmappedCount;
    
    updateNextButtonState();
}

// ============================================
// ÉTAPE 5: CONFIRMATION ET FUSION
// ============================================

// Préparer le résumé
function prepareSummary() {
    // Nom du fichier
    document.getElementById('summary-filename').textContent = importState.originalName;
    
    // Nombre de lignes
    document.getElementById('summary-rows').textContent = importState.parsedData.length;
    
    // Colonnes à ajouter (toutes sauf la colonne de jointure)
    const newColumns = importState.columns.filter(c => c !== importState.selectedAdcopyColumn);
    document.getElementById('summary-columns').textContent = newColumns.length + ' (' + newColumns.join(', ') + ')';
    
    // Mappings utilisés
    const mappingCount = Object.keys(importState.currentMappings).length;
    document.getElementById('summary-mappings').textContent = mappingCount + ' / ' + importState.uniqueExternalValues.length;
    
    // Calculer le nombre de lignes qui seront matchées
    const matchedRows = calculateMatchedRows();
    document.getElementById('summary-matched').textContent = matchedRows + ' / ' + reportData.length + ' lignes';
    
    // Avertissements
    const warnings = [];
    if (mappingCount < importState.uniqueExternalValues.length) {
        warnings.push(`${importState.uniqueExternalValues.length - mappingCount} valeur(s) du fichier ne sont pas mappées et seront ignorées.`);
    }
    if (matchedRows < reportData.length) {
        warnings.push(`${reportData.length - matchedRows} ligne(s) du rapport n'ont pas de correspondance dans le fichier importé.`);
    }
    
    const warningsContainer = document.getElementById('summary-warnings');
    if (warnings.length > 0) {
        document.getElementById('summary-warning-text').textContent = warnings.join(' ');
        warningsContainer.classList.remove('hidden');
    } else {
        warningsContainer.classList.add('hidden');
    }
}

// Calculer le nombre de lignes matchées
function calculateMatchedRows() {
    const mappedAdcopies = new Set(Object.values(importState.currentMappings));
    return reportData.filter(row => mappedAdcopies.has(row.adCopyTitle) || mappedAdcopies.has(row.adCopyName)).length;
}

// Effectuer la fusion des données
async function performDataMerge() {
    try {
        // Sauvegarder les nouveaux mappings
        const mappingsToSave = Object.entries(importState.currentMappings)
            .filter(([ext, adcopy]) => importState.existingMappings[ext] !== adcopy)
            .map(([ext, adcopy]) => ({ externalValue: ext, adcopyName: adcopy }));
        
        if (mappingsToSave.length > 0) {
            await fetch('/api/mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mappings: mappingsToSave })
            });
            console.log(`✅ ${mappingsToSave.length} mapping(s) sauvegardé(s)`);
        }
        
        // Créer un index inversé des mappings (adcopy -> external values)
        const adcopyToExternals = {};
        Object.entries(importState.currentMappings).forEach(([ext, adcopy]) => {
            if (!adcopyToExternals[adcopy]) {
                adcopyToExternals[adcopy] = [];
            }
            adcopyToExternals[adcopy].push(ext);
        });
        
        // Créer un index des données externes par valeur de jointure
        const externalDataIndex = {};
        importState.parsedData.forEach(row => {
            const key = row[importState.selectedAdcopyColumn];
            if (key) {
                externalDataIndex[key] = row;
            }
        });
        
        // Colonnes à ajouter
        const newColumns = importState.columns.filter(c => c !== importState.selectedAdcopyColumn);
        
        // Ajouter les colonnes à la configuration
        newColumns.forEach(col => {
            const colId = 'ext_' + col.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            
            // Vérifier si la colonne existe déjà
            if (!columnsConfig.find(c => c.id === colId)) {
                columnsConfig.push({
                    id: colId,
                    label: col,
                    visible: true,
                    format: detectColumnFormat(col),
                    isExternal: true
                });
            }
        });
        
        // Fusionner les données
        reportData = reportData.map(row => {
            const adcopyKey = row.adCopyTitle || row.adCopyName;
            const externalKeys = adcopyToExternals[adcopyKey] || [];
            
            // Chercher les données externes correspondantes
            let externalRow = null;
            for (const extKey of externalKeys) {
                if (externalDataIndex[extKey]) {
                    externalRow = externalDataIndex[extKey];
                    break;
                }
            }
            
            // Ajouter les colonnes externes
            const newRow = { ...row };
            newColumns.forEach(col => {
                const colId = 'ext_' + col.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                newRow[colId] = externalRow ? externalRow[col] : null;
            });
            
            return newRow;
        });
        
        // Sauvegarder la config et rafraîchir l'affichage
        saveColumnsConfig();
        renderColumnsMenu();
        displayReport();
        
        console.log('✅ Fusion des données terminée');
        
        // Fermer la modal
        closeImportModal();
        
        // Notification de succès
        showNotification('Données importées avec succès !', 'success');
        
    } catch (error) {
        console.error('Erreur lors de la fusion:', error);
        alert('Erreur lors de la fusion des données: ' + error.message);
    }
}

// Détecter le format d'une colonne
function detectColumnFormat(columnName) {
    const name = columnName.toLowerCase();
    
    if (name.includes('date') || name.includes('jour')) {
        return 'text'; // On garde en texte car le format peut varier
    }
    if (name.includes('€') || name.includes('eur') || name.includes('cost') || name.includes('prix') || name.includes('montant')) {
        return 'currency';
    }
    if (name.includes('%') || name.includes('taux') || name.includes('rate')) {
        return 'percent';
    }
    
    return 'text';
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0 opacity-100`;
    
    if (type === 'success') {
        notification.classList.add('bg-emerald-600', 'text-white');
    } else if (type === 'error') {
        notification.classList.add('bg-red-600', 'text-white');
    } else {
        notification.classList.add('bg-gray-800', 'text-white');
    }
    
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animer la disparition
    setTimeout(() => {
        notification.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
