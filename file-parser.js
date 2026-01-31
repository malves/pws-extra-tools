// Gestion du parsing des fichiers CSV et XLSX

const Papa = require('papaparse');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dossier pour le stockage temporaire des fichiers
const TEMP_DIR = path.join(__dirname, 'data', 'temp');

// Durée de vie des fichiers temporaires (10 minutes)
const TEMP_FILE_TTL = 10 * 60 * 1000;

// Map pour stocker les métadonnées des fichiers temporaires
const tempFiles = new Map();

// Initialiser le dossier temporaire
function initTempDir() {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}

// Nettoyer les fichiers temporaires expirés
function cleanupTempFiles() {
    const now = Date.now();
    
    for (const [fileId, metadata] of tempFiles.entries()) {
        if (now - metadata.createdAt > TEMP_FILE_TTL) {
            try {
                if (fs.existsSync(metadata.path)) {
                    fs.unlinkSync(metadata.path);
                }
                tempFiles.delete(fileId);
                console.log(`🗑️ Fichier temporaire supprimé: ${fileId}`);
            } catch (error) {
                console.error(`Erreur lors de la suppression du fichier ${fileId}:`, error);
            }
        }
    }
}

// Démarrer le nettoyage périodique
setInterval(cleanupTempFiles, 60000); // Toutes les minutes

// Générer un ID unique pour un fichier
function generateFileId() {
    return crypto.randomBytes(16).toString('hex');
}

// Sauvegarder un fichier temporairement et retourner son ID
function saveTempFile(buffer, originalName) {
    initTempDir();
    
    const fileId = generateFileId();
    const ext = path.extname(originalName).toLowerCase();
    const tempPath = path.join(TEMP_DIR, `${fileId}${ext}`);
    
    fs.writeFileSync(tempPath, buffer);
    
    tempFiles.set(fileId, {
        path: tempPath,
        originalName: originalName,
        extension: ext,
        createdAt: Date.now()
    });
    
    console.log(`📁 Fichier temporaire sauvegardé: ${fileId} (${originalName})`);
    
    return fileId;
}

// Récupérer les métadonnées d'un fichier temporaire
function getTempFileMetadata(fileId) {
    return tempFiles.get(fileId);
}

// Lire les N premières lignes d'un fichier (texte brut)
function previewFile(fileId, maxLines = 30) {
    const metadata = tempFiles.get(fileId);
    
    if (!metadata) {
        throw new Error('Fichier non trouvé ou expiré');
    }
    
    const ext = metadata.extension;
    
    if (ext === '.xlsx' || ext === '.xls') {
        return previewExcelFile(metadata.path, maxLines);
    } else {
        return previewTextFile(metadata.path, maxLines);
    }
}

// Prévisualiser un fichier texte (CSV, etc.)
function previewTextFile(filePath, maxLines) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    return {
        lines: lines.slice(0, maxLines),
        totalLines: lines.length,
        isExcel: false
    };
}

// Prévisualiser un fichier Excel
function previewExcelFile(filePath, maxLines) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en CSV pour la prévisualisation
    const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
    const lines = csvContent.split(/\r?\n/);
    
    return {
        lines: lines.slice(0, maxLines),
        totalLines: lines.length,
        isExcel: true,
        sheetNames: workbook.SheetNames
    };
}

// Détecter le séparateur d'un fichier CSV
function detectSeparator(lines) {
    const separators = [';', ',', '\t', '|'];
    const scores = {};
    
    // Analyser les premières lignes non vides
    const sampleLines = lines.filter(line => line.trim().length > 0).slice(0, 5);
    
    for (const sep of separators) {
        const counts = sampleLines.map(line => (line.match(new RegExp(`\\${sep}`, 'g')) || []).length);
        
        // Score basé sur la cohérence du nombre de séparateurs
        if (counts.length > 0 && counts[0] > 0) {
            const isConsistent = counts.every(c => c === counts[0]);
            scores[sep] = isConsistent ? counts[0] * 10 : counts[0];
        } else {
            scores[sep] = 0;
        }
    }
    
    // Retourner le séparateur avec le meilleur score
    const bestSeparator = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])[0];
    
    return bestSeparator && bestSeparator[1] > 0 ? bestSeparator[0] : ';';
}

// Parser un fichier à partir d'une ligne donnée
function parseFile(fileId, startLine = 0, separator = 'auto') {
    const metadata = tempFiles.get(fileId);
    
    if (!metadata) {
        throw new Error('Fichier non trouvé ou expiré');
    }
    
    const ext = metadata.extension;
    
    if (ext === '.xlsx' || ext === '.xls') {
        return parseExcelFile(metadata.path, startLine);
    } else {
        return parseCSVFile(metadata.path, startLine, separator);
    }
}

// Parser un fichier CSV
function parseCSVFile(filePath, startLine, separator) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    // Extraire les lignes à partir de startLine
    const relevantLines = lines.slice(startLine);
    const relevantContent = relevantLines.join('\n');
    
    // Détecter le séparateur si auto
    if (separator === 'auto') {
        separator = detectSeparator(relevantLines);
    }
    
    // Parser avec PapaParse
    const result = Papa.parse(relevantContent, {
        delimiter: separator,
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
    });
    
    if (result.errors.length > 0) {
        console.warn('⚠️ Erreurs de parsing CSV:', result.errors.slice(0, 5));
    }
    
    return {
        columns: result.meta.fields || [],
        data: result.data,
        separator: separator,
        rowCount: result.data.length
    };
}

// Parser un fichier Excel
function parseExcelFile(filePath, startLine) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON avec la première ligne comme header
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: startLine, // Commencer à partir de startLine
        defval: ''
    });
    
    // Récupérer les colonnes
    const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    
    return {
        columns: columns,
        data: jsonData,
        separator: null,
        rowCount: jsonData.length,
        isExcel: true
    };
}

// Supprimer un fichier temporaire
function deleteTempFile(fileId) {
    const metadata = tempFiles.get(fileId);
    
    if (metadata) {
        try {
            if (fs.existsSync(metadata.path)) {
                fs.unlinkSync(metadata.path);
            }
            tempFiles.delete(fileId);
            return true;
        } catch (error) {
            console.error(`Erreur lors de la suppression du fichier ${fileId}:`, error);
            return false;
        }
    }
    
    return false;
}

// Exporter les fonctions
module.exports = {
    saveTempFile,
    getTempFileMetadata,
    previewFile,
    parseFile,
    detectSeparator,
    deleteTempFile,
    cleanupTempFiles
};
