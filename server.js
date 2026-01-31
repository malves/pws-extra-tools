const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');

// Modules locaux
const mappingsStore = require('./mappings-store');
const fileParser = require('./file-parser');

const app = express();
const PORT = 3000;

const GRAPHQL_URL = 'https://gql.powerspace.com/graphql';

// Configuration de multer pour l'upload en mémoire
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non supporté. Utilisez CSV ou XLSX.'));
        }
    }
});

// Middleware
app.use(express.json());
app.use(cookieParser());

// Initialiser le fichier de mappings au démarrage
mappingsStore.initMappings();

// Fonction pour faire une requête GraphQL
async function gqlRequest({ token, operationName, query, variables }) {
    const headers = {
        accept: "*/*",
        "accept-language": "fr,en-US;q=0.9,en;q=0.8,pt-PT;q=0.7,pt;q=0.6",
        "content-type": "application/json",
        "origin": "https://platform.powerspace.com",
        "referer": "https://platform.powerspace.com/",
        "sec-ch-ua": '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    };

    if (token && String(token).trim().length > 0) {
        headers.authorization = token;
    }

    const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ operationName, query, variables }),
    });

    const text = await res.text();
    let json = null;
    try {
        json = JSON.parse(text);
    } catch {
        // pas JSON
    }

    if (!res.ok) {
        throw new Error(`GraphQL HTTP ${res.status} - body: ${text.slice(0, 500)}`);
    }

    return json;
}

// Middleware d'authentification
function authenticateToken(req, res, next) {
    const token = req.cookies.pws_token;
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Non authentifié - token manquant' 
        });
    }
    
    req.token = token;
    next();
}

// Route d'authentification
app.post('/api/auth/login', async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const rememberMe = req.body.rememberMe || false;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email et mot de passe requis' 
            });
        }

        console.log(`🔐 Tentative d'authentification pour ${email}...`);

        const query = `mutation login($email: String!, $password: String!, $rememberMe: Boolean) {
            login(email: $email, password: $password, rememberMe: $rememberMe) {
                token
                slug
                __typename
            }
        }`;

        const response = await gqlRequest({
            token: '',
            operationName: 'login',
            query,
            variables: {
                email,
                password,
                rememberMe
            }
        });

        if (!response?.data?.login?.token) {
            console.error("❌ Authentification échouée pour", email);
            
            // Vérifier si c'est une erreur de credentials
            if (response?.errors) {
                const errorMessage = response.errors[0]?.message || 'Email ou mot de passe incorrect';
                return res.status(401).json({ 
                    success: false, 
                    error: errorMessage
                });
            }
            
            return res.status(401).json({ 
                success: false, 
                error: 'Email ou mot de passe incorrect' 
            });
        }

        console.log("✅ Authentification réussie pour", email);
        
        const loginData = response.data.login;
        
        // Stocker le token dans un cookie HTTP-only sécurisé
        res.cookie('pws_token', loginData.token, {
            httpOnly: true,      // Inaccessible via JavaScript - protection XSS
            secure: false,       // À true en production avec HTTPS
            sameSite: 'strict',  // Protection CSRF
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
        });
        
        // Récupérer les infos utilisateur avec le token
        let userData = null;
        try {
            const userQuery = `query me {
                me {
                    id
                    firstName
                    lastName
                    email
                    company {
                        id
                        name
                        slug
                        type
                    }
                }
            }`;
            
            const userResponse = await gqlRequest({
                token: loginData.token,
                operationName: 'me',
                query: userQuery,
                variables: {}
            });
            
            if (userResponse?.data?.me) {
                userData = userResponse.data.me;
            }
        } catch (userError) {
            console.warn('⚠️ Impossible de récupérer les infos utilisateur:', userError.message);
        }
        
        // Renvoyer uniquement les données non-sensibles (pas le token)
        res.json({ 
            success: true, 
            slug: loginData.slug,
            email: email,
            user: userData
        });

    } catch (error) {
        console.error("❌ Erreur d'authentification:", error.message);
        
        // Si l'erreur contient "401" ou "credentials", c'est un problème d'identifiants
        if (error.message.includes('401') || error.message.includes('credentials')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Email ou mot de passe incorrect' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur lors de l\'authentification' 
        });
    }
});

// Route pour récupérer l'activity feed
app.post('/api/powerspace/activity-feed', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.body;
        const token = req.token; // Token récupéré depuis le cookie

        console.log(`📋 Récupération de l'activity feed PowerSpace`);

        // Récupérer l'activity feed
        const activityQuery = `query activityFeed($companyId: PwsID, $pagination: Pagination, $userId: PwsID, $entityType: EntityType) {
            searchActivityFeed(
                companyId: $companyId
                userId: $userId
                entityType: $entityType
                pagination: $pagination
            ) {
                ...ActivityFeedParts
                __typename
            }
        }

        fragment ActivityFeedParts on ActivityFeed {
            entityId
            user {
                id
                firstName
                lastName
                company {
                    ...PartialCompanyParts
                    __typename
                }
                __typename
            }
            company {
                ...PartialCompanyParts
                __typename
            }
            createdAt
            property
            oldValue
            newValue
            activityType
            entityType
            __typename
        }

        fragment PartialCompanyParts on PartialCompany {
            id
            name
            slug
            type
            __typename
        }`;

        const activityResponse = await gqlRequest({
            token,
            operationName: 'activityFeed',
            query: activityQuery,
            variables: {
                pagination: { limit, offset },
                userId: null,
                entityType: null,
                companyId: null
            }
        });

        if (!activityResponse?.data?.searchActivityFeed) {
            return res.status(500).json({
                success: false,
                error: 'Aucune activité retournée par PowerSpace'
            });
        }

        console.log('✅ Activity feed récupéré avec succès');

        res.json({
            success: true,
            data: activityResponse.data.searchActivityFeed
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'activity feed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour récupérer les données PowerSpace
app.post('/api/powerspace/publisher-cost-details', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, slug = 'powerspace' } = req.body;
        const token = req.token; // Token récupéré depuis le cookie

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Les dates de début et de fin sont requises'
            });
        }

        console.log(`📊 Récupération des données PowerSpace pour ${startDate} - ${endDate}`);

        // Récupérer les données
        const dataQuery = `query resellerPublisherCostDetails($endDate: DateTime!, $startDate: DateTime!, $resellerId: PwsID, $slug: String, $filters: [CostDetailsFilter!]) {
            reseller(id: $resellerId, slug: $slug) {
                id
                publisherCostDetails(
                    endDate: $endDate
                    startDate: $startDate
                    filters: $filters
                ) {
                    total {
                        ...PublisherCostDetailsParts
                        __typename
                    }
                    resellers {
                        name
                        total {
                            ...PublisherCostDetailsParts
                            __typename
                        }
                        advertisers {
                            name
                            total {
                                ...PublisherCostDetailsParts
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                __typename
            }
        }

        fragment PublisherCostDetailsParts on PublisherCostDetails {
            displays
            impressions
            clicks
            commissions
            ctr
            cpc
            cpm
            rpm
            leads
            __typename
        }`;

        const dataResponse = await gqlRequest({
            token,
            operationName: 'resellerPublisherCostDetails',
            query: dataQuery,
            variables: {
                slug,
                startDate,
                endDate,
                filters: [
                    { dimension: 'Channel', values: [] },
                    { dimension: 'Network', values: [] },
                    { dimension: 'Market', values: [] },
                    { dimension: 'DemandSource', values: [] }
                ]
            }
        });

        if (!dataResponse?.data?.reseller?.publisherCostDetails) {
            return res.status(500).json({
                success: false,
                error: 'Aucune donnée retournée par PowerSpace'
            });
        }

        console.log('✅ Données PowerSpace récupérées avec succès');

        res.json({
            success: true,
            data: dataResponse.data.reseller.publisherCostDetails
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des données:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour rechercher un annonceur par nom et obtenir son ID
app.post('/api/powerspace/search-company', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const token = req.token;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Le nom de l\'annonceur est requis'
            });
        }

        console.log(`🔍 Recherche de l'annonceur: ${name}`);

        const searchQuery = `query companies($pagination: Pagination!, $searchQuery: CompanySearchQuery!) {
            searchCompanies(pagination: $pagination, searchQuery: $searchQuery) {
                id
                slug
                name
                genericName
                agency {
                    id
                    name
                    __typename
                }
                reseller {
                    id
                    name
                    __typename
                }
                type
                status
                __typename
            }
        }`;

        const searchResponse = await gqlRequest({
            token,
            operationName: 'companies',
            query: searchQuery,
            variables: {
                searchQuery: {
                    name: name,
                    status: ['Active', 'Inactive']
                },
                pagination: {
                    limit: 50,
                    offset: 0
                }
            }
        });

        if (!searchResponse?.data?.searchCompanies) {
            return res.status(404).json({
                success: false,
                error: 'Annonceur non trouvé'
            });
        }

        const companies = searchResponse.data.searchCompanies;
        
        // Trouver l'annonceur exact (match parfait du nom)
        const advertiser = companies.find(c => 
            c.name === name || c.name.toLowerCase() === name.toLowerCase()
        );

        if (!advertiser) {
            // Si pas de match exact, retourner le premier résultat
            if (companies.length > 0) {
                console.log(`✅ Annonceur trouvé (approximatif): ${companies[0].name} (ID: ${companies[0].id})`);
                return res.json({
                    success: true,
                    data: companies[0]
                });
            }
            
            return res.status(404).json({
                success: false,
                error: 'Annonceur non trouvé'
            });
        }

        console.log(`✅ Annonceur trouvé: ${advertiser.name} (ID: ${advertiser.id})`);

        res.json({
            success: true,
            data: advertiser
        });

    } catch (error) {
        console.error('❌ Erreur lors de la recherche de l\'annonceur:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour récupérer les campagnes d'un annonceur
app.post('/api/powerspace/advertiser-campaigns', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.body;
        const token = req.token;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'L\'ID de l\'annonceur est requis'
            });
        }

        console.log(`📊 Récupération des campagnes pour l'annonceur ${companyId}`);

        const campaignsQuery = `query sidebarAdvertiser($companyId: PwsID!, $campaignStatus: [Status!], $adGroupStatus: [AdGroupStatus!]) {
            searchCampaigns(
                searchQuery: {companyId: $companyId, status: $campaignStatus}
                pagination: {limit: 0, offset: 0}
            ) {
                id
                name
                status
                subItems: adGroups(status: $adGroupStatus) {
                    id
                    name
                    status
                    __typename
                }
                __typename
            }
        }`;

        const campaignsResponse = await gqlRequest({
            token,
            operationName: 'sidebarAdvertiser',
            query: campaignsQuery,
            variables: {
                companyId: companyId,
                campaignStatus: ['Active', 'Inactive'],
                adGroupStatus: ['Active', 'Ended', 'Inactive', 'NoBudgetLeft', 'StartSoon']
            }
        });

        if (!campaignsResponse?.data?.searchCampaigns) {
            return res.status(500).json({
                success: false,
                error: 'Aucune campagne retournée par PowerSpace'
            });
        }

        console.log('✅ Campagnes récupérées avec succès');

        res.json({
            success: true,
            data: campaignsResponse.data.searchCampaigns
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des campagnes:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour récupérer les statistiques détaillées d'un ad group par jour
app.post('/api/powerspace/adgroup-stats', authenticateToken, async (req, res) => {
    try {
        const { adGroupId, startDate, endDate } = req.body;
        const token = req.token;

        if (!adGroupId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'adGroupId, startDate et endDate sont requis'
            });
        }

        console.log(`📊 Récupération des stats pour l'ad group ${adGroupId} du ${startDate} au ${endDate}`);

        const statsQuery = `query adGroupCostDetails($endDate: DateTime!, $startDate: DateTime!, $adGroupId: PwsID!, $filters: [CostDetailsFilter!]) {
            adGroup(id: $adGroupId) {
                id
                name
                costDetails(endDate: $endDate, startDate: $startDate, filters: $filters) {
                    total {
                        ...AdvertiserCostDetailsParts
                        __typename
                    }
                    __typename
                }
                adCopies(pagination: {limit: 200, offset: 0}) {
                    id
                    name
                    title
                    description
                    callToAction
                    advertiserName
                    image
                    status
                    costDetails(endDate: $endDate, startDate: $startDate) {
                        total {
                            ...AdvertiserCostDetailsParts
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                __typename
            }
        }

        fragment AdvertiserCostDetailsParts on AdvertiserCostDetails {
            impressions
            leads
            orders
            costs
            clicks
            ctr
            cpc
            cpm
            lr
            or
            cpo
            cpl
            pageViews
            sessions
            engagedSessions
            totalUsers
            newUsers
            roi
            revenue
            bounceRate
            engagementRate
            cpv
            __typename
        }`;

        const statsResponse = await gqlRequest({
            token,
            operationName: 'adGroupCostDetails',
            query: statsQuery,
            variables: {
                adGroupId: adGroupId,
                startDate: startDate,
                endDate: endDate,
                filters: [
                    { dimension: 'Channel', values: [] }
                ]
            }
        });

        if (!statsResponse?.data?.adGroup) {
            return res.status(500).json({
                success: false,
                error: 'Aucune donnée retournée par PowerSpace'
            });
        }

        console.log('✅ Stats ad group récupérées avec succès');

        res.json({
            success: true,
            data: statsResponse.data.adGroup
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des stats:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ROUTES UPLOAD ET PARSING DE FICHIERS
// ============================================

// Route pour uploader et prévisualiser un fichier (lignes brutes)
app.post('/api/upload/preview', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Erreur Multer (taille de fichier, etc.)
            console.error('❌ Erreur Multer:', err.message);
            return res.status(400).json({
                success: false,
                error: err.code === 'LIMIT_FILE_SIZE' 
                    ? 'Fichier trop volumineux (max 50 MB)' 
                    : err.message
            });
        } else if (err) {
            // Autre erreur
            console.error('❌ Erreur upload:', err.message);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }
        
        // Pas d'erreur, traiter le fichier
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Aucun fichier fourni'
                });
            }

            console.log(`📁 Upload reçu: ${req.file.originalname} (${req.file.size} bytes)`);

            // Sauvegarder le fichier temporairement
            const fileId = fileParser.saveTempFile(req.file.buffer, req.file.originalname);

            // Prévisualiser les premières lignes
            const preview = fileParser.previewFile(fileId, 30);

            // Détecter le séparateur
            const separator = fileParser.detectSeparator(preview.lines);

            res.json({
                success: true,
                data: {
                    fileId: fileId,
                    originalName: req.file.originalname,
                    lines: preview.lines,
                    totalLines: preview.totalLines,
                    isExcel: preview.isExcel,
                    detectedSeparator: separator,
                    sheetNames: preview.sheetNames || null
                }
            });

        } catch (error) {
            console.error('❌ Erreur lors de la prévisualisation:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
});

// Route pour parser un fichier à partir d'une ligne donnée
app.post('/api/upload/parse', (req, res) => {
    try {
        const { fileId, startLine, separator } = req.body;

        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'fileId est requis'
            });
        }

        console.log(`📊 Parsing du fichier ${fileId} à partir de la ligne ${startLine || 0}`);

        // Parser le fichier
        const result = fileParser.parseFile(fileId, startLine || 0, separator || 'auto');

        res.json({
            success: true,
            data: {
                columns: result.columns,
                data: result.data,
                separator: result.separator,
                rowCount: result.rowCount,
                preview: result.data.slice(0, 10) // 10 premières lignes pour aperçu
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors du parsing:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour supprimer un fichier temporaire
app.delete('/api/upload/:fileId', (req, res) => {
    try {
        const { fileId } = req.params;
        const deleted = fileParser.deleteTempFile(fileId);

        res.json({
            success: true,
            deleted: deleted
        });

    } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ROUTES MAPPINGS ADCOPY
// ============================================

// Route pour récupérer tous les mappings
app.get('/api/mappings', (req, res) => {
    try {
        const mappings = mappingsStore.getAllMappings();

        res.json({
            success: true,
            data: mappings
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des mappings:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour récupérer les mappings pour des valeurs spécifiques
app.post('/api/mappings/lookup', (req, res) => {
    try {
        const { externalValues } = req.body;

        if (!externalValues || !Array.isArray(externalValues)) {
            return res.status(400).json({
                success: false,
                error: 'externalValues doit être un tableau'
            });
        }

        const mappings = mappingsStore.getMappingsByExternalValues(externalValues);

        // Créer un objet pour un accès rapide
        const mappingsMap = {};
        mappings.forEach(m => {
            mappingsMap[m.external_value] = m.adcopy_name;
        });

        res.json({
            success: true,
            data: {
                mappings: mappingsMap,
                found: mappings.length,
                total: externalValues.length
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la recherche des mappings:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour sauvegarder des mappings (batch)
app.post('/api/mappings', (req, res) => {
    try {
        const { mappings } = req.body;

        if (!mappings || !Array.isArray(mappings)) {
            return res.status(400).json({
                success: false,
                error: 'mappings doit être un tableau'
            });
        }

        console.log(`💾 Sauvegarde de ${mappings.length} mapping(s)`);

        const count = mappingsStore.upsertMappings(mappings);

        res.json({
            success: true,
            saved: count
        });

    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des mappings:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour supprimer un mapping par ID
app.delete('/api/mappings/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const deleted = mappingsStore.deleteMapping(id);

        res.json({
            success: true,
            deleted: deleted
        });

    } catch (error) {
        console.error('❌ Erreur lors de la suppression du mapping:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route de déconnexion
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('pws_token');
    res.json({ success: true });
});

// Route pour vérifier l'authentification
app.get('/api/auth/check', (req, res) => {
    const token = req.cookies.pws_token;
    res.json({ authenticated: !!token });
});

// ============================================
// SERVIR LES FICHIERS STATIQUES (APRÈS LES ROUTES API)
// ============================================

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname)));

// Routes de l'application
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/insights', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'insights.html'));
});

app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'report.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`✨ Serveur PET Dashboard démarré sur http://localhost:${PORT}`);
});
