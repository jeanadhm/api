const jwt = require('jsonwebtoken');

// Fonction de vérification du token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization; // Récupération du token depuis l'en-tête Authorization

    if (!token) {
        return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Vérification du token avec la clé secrète
        req.user = decoded; // Ajout des données utilisateur décodées à l'objet de la requête
        next(); // Poursuivre vers la route protégée
    } catch (error) {
        return res.status(403).json({ message: 'Token invalide.' });
    }
};

module.exports = verifyToken;
