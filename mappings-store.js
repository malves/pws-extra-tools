// Gestion des mappings adcopy avec un fichier JSON

const fs = require('fs');
const path = require('path');

// Chemin du fichier JSON
const MAPPINGS_FILE = path.join(__dirname, 'data', 'mappings.json');

// Initialiser le fichier de mappings
function initMappings() {
    const dataDir = path.join(__dirname, 'data');
    
    // Créer le dossier data s'il n'existe pas
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Créer le fichier s'il n'existe pas
    if (!fs.existsSync(MAPPINGS_FILE)) {
        fs.writeFileSync(MAPPINGS_FILE, JSON.stringify({ mappings: [] }, null, 2));
        console.log('✅ Fichier de mappings JSON créé');
    } else {
        console.log('✅ Fichier de mappings JSON chargé');
    }
}

// Lire tous les mappings
function readMappingsFile() {
    try {
        const data = fs.readFileSync(MAPPINGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lecture mappings:', error);
        return { mappings: [] };
    }
}

// Écrire les mappings
function writeMappingsFile(data) {
    try {
        fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erreur écriture mappings:', error);
    }
}

// Récupérer tous les mappings
function getAllMappings() {
    const data = readMappingsFile();
    return data.mappings || [];
}

// Récupérer un mapping par valeur externe
function getMappingByExternalValue(externalValue) {
    const mappings = getAllMappings();
    return mappings.find(m => m.external_value === externalValue);
}

// Récupérer plusieurs mappings par valeurs externes
function getMappingsByExternalValues(externalValues) {
    if (!externalValues || externalValues.length === 0) {
        return [];
    }
    
    const mappings = getAllMappings();
    return mappings.filter(m => externalValues.includes(m.external_value));
}

// Créer ou mettre à jour un mapping
function upsertMapping(externalValue, adcopyName) {
    const data = readMappingsFile();
    const mappings = data.mappings || [];
    
    // Chercher si le mapping existe déjà
    const existingIndex = mappings.findIndex(m => m.external_value === externalValue);
    
    if (existingIndex >= 0) {
        // Mettre à jour
        mappings[existingIndex].adcopy_name = adcopyName;
        mappings[existingIndex].updated_at = new Date().toISOString();
    } else {
        // Créer
        const newId = mappings.length > 0 ? Math.max(...mappings.map(m => m.id || 0)) + 1 : 1;
        mappings.push({
            id: newId,
            external_value: externalValue,
            adcopy_name: adcopyName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    
    data.mappings = mappings;
    writeMappingsFile(data);
    
    return true;
}

// Créer ou mettre à jour plusieurs mappings en batch
function upsertMappings(mappings) {
    let count = 0;
    
    for (const mapping of mappings) {
        if (mapping.externalValue && mapping.adcopyName) {
            upsertMapping(mapping.externalValue, mapping.adcopyName);
            count++;
        }
    }
    
    return count;
}

// Supprimer un mapping par ID
function deleteMapping(id) {
    const data = readMappingsFile();
    const mappings = data.mappings || [];
    
    const initialLength = mappings.length;
    data.mappings = mappings.filter(m => m.id !== parseInt(id));
    
    if (data.mappings.length < initialLength) {
        writeMappingsFile(data);
        return true;
    }
    
    return false;
}

// Supprimer un mapping par valeur externe
function deleteMappingByExternalValue(externalValue) {
    const data = readMappingsFile();
    const mappings = data.mappings || [];
    
    const initialLength = mappings.length;
    data.mappings = mappings.filter(m => m.external_value !== externalValue);
    
    if (data.mappings.length < initialLength) {
        writeMappingsFile(data);
        return true;
    }
    
    return false;
}

// Exporter les fonctions
module.exports = {
    initMappings,
    getAllMappings,
    getMappingByExternalValue,
    getMappingsByExternalValues,
    upsertMapping,
    upsertMappings,
    deleteMapping,
    deleteMappingByExternalValue
};
