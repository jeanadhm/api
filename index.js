const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const port = 8000;
const jwtSecret = 'your_jwt_secret_key';

// Configuration de body-parser pour traiter les données du formulaire
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: '*' // Remplacez par l'origine de votre frontend
}));

// Vérifiez et créez le répertoire de destination si nécessaire
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir);
}

// Configuration de multer pour gérer les fichiers uploadés
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  user: 'hegnon_unpaid',
  host: 'localhost',
  database: 'base_Hegnon_unpaid',
  password: 'Hegnon@200704',
  port: 5432,
});

pool.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('PostgreSQL Connected...');
});

// Ajouter un administrateur manuellement
const createAdmin = async () => {
  const email = 'unpaidfinancial@gmail.com';
  const password = 'Hegnon@200704';
  const role = 'admin';

  const query = 'SELECT * FROM demandes WHERE email = $1';
  const values = [email];

  pool.query(query, values, async (err, result) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'administrateur:', err);
      return;
    }

    if (result.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertQuery = 'INSERT INTO demandes (email, mdp, role) VALUES ($1, $2, $3)';
      const insertValues = [email, hashedPassword, role];

      pool.query(insertQuery, insertValues, (err, result) => {
        if (err) {
          console.error('Erreur lors de la création de l\'administrateur:', err);
          return;
        }
        console.log('Administrateur créé avec succès');
      });
    } else {
      console.log('Administrateur déjà existant');
    }
  });
};

// Décommentez la ligne suivante pour créer l'administrateur (faites-le une seule fois puis commentez à nouveau)
createAdmin();

// Middleware pour vérifier le token JWT et le rôle de l'utilisateur
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).send('Token non fourni');
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(500).send('Échec de l\'authentification du token');
    }
    req.user = decoded;
    next();
  });
};

// Middleware pour vérifier le rôle de l'utilisateur
const checkRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).send('Accès refusé');
  }
  next();
};

// Route pour gérer l'enregistrement du formulaire
app.post('/api/demandes', upload.fields([{ name: 'idcard' }, { name: 'homeproof' }]), async (req, res) => {
  const { nom, prenom, email, telephone, montantDemande, projetDescription, pays, ville, devise, mdp, role } = req.body;
  const idcard = req.files['idcard'][0].filename;
  const homeproof = req.files['homeproof'][0].filename;

  if (!nom || !prenom || !email || !telephone || !montantDemande || !projetDescription || !pays || !ville || !devise || !mdp) {
    return res.status(400).send('Veuillez remplir tous les champs obligatoires.');
  }

  try {
    const hashedPassword = await bcrypt.hash(mdp, 10);
    const query = 'INSERT INTO demandes (nom, prenom, email, telephone, montantDemande, projetDescription, pays, ville, devise, mdp, role, idcard, homeproof) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)';
    const values = [nom, prenom, email, telephone, montantDemande, projetDescription, pays, ville, devise, hashedPassword, role || 'client', idcard, homeproof];

    pool.query(query, values, (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'enregistrement de la demande:', err);
        return res.status(500).send('Erreur du serveur');
      }
      res.status(201).send('Demande enregistrée avec succès');
    });
  } catch (err) {
    console.error('Erreur lors du hachage du mot de passe:', err);
    return res.status(500).send('Erreur du serveur');
  }
});

// Route pour la connexion
app.post('/api/login', (req, res) => {
  const { email, mdp } = req.body;

  const query = 'SELECT * FROM demandes WHERE email = $1';
  const values = [email];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', err);
      return res.status(500).send('Erreur du serveur');
    }

    if (result.rows.length === 0) {
      return res.status(400).send('Email ou mot de passe incorrect');
    }

    const user = result.rows[0];

    bcrypt.compare(mdp, user.mdp, (err, isMatch) => {
      if (err) {
        console.error('Erreur lors de la vérification du mot de passe:', err);
        return res.status(500).send('Erreur du serveur');
      }

      if (!isMatch) {
        return res.status(400).send('Email ou mot de passe incorrect');
      }

      const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });

      res.status(200).send({ message: 'Connexion réussie', role: user.role, token });
    });
  });
});

// Route pour récupérer toutes les demandes (admin seulement)
app.get('/api/demandes/all', verifyToken, checkRole('admin'), (req, res) => {
  const query = 'SELECT * FROM demandes';
  
  pool.query(query, (err, result) => {
    if (err) {
      console.error('Erreur lors de la récupération des demandes:', err);
      return res.status(500).send('Erreur du serveur');
    }
    
    res.status(200).send(result.rows);
  });
});

// Route pour récupérer les informations de l'utilisateur connecté
app.get('/api/user/me', verifyToken, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT * FROM demandes WHERE id = $1';
  const values = [userId];
  
  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('Erreur lors de la récupération des informations de l\'utilisateur:', err);
      return res.status(500).send('Erreur du serveur');
    }

    if (result.rows.length === 0) {
      return res.status(404).send('Utilisateur non trouvé');
    }

    const user = result.rows[0];
    res.status(200).send(user);
  });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

