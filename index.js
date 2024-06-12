const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt'); // Import bcrypt
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const port = 8000;
const jwtSecret = 'your_jwt_secret_key'; // Clé secrète pour JWT

// Configuration de body-parser pour traiter les données du formulaire
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:3000' // Remplacez par l'origine de votre frontend
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
// Configuration de la connexion MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'adhm',
  password: 'Adhm229@',
  database: 'unpaidfinance',
  socketPath: "/opt/lampp/var/mysql/mysql.sock"
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('MySQL Connected...');
});

// Ajouter un administrateur manuellement
const createAdmin = async () => {
  const email = 'unpaidfinancial@gmail.com';
  const password = 'Hegnon@200704';
  const role = 'admin';

  // Vérifiez si l'administrateur existe déjà
  const query = 'SELECT * FROM demandes WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'administrateur:', err);
      return;
    }

    if (results.length === 0) {
      // Si l'administrateur n'existe pas, créez-le
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertQuery = 'INSERT INTO demandes (email, mdp, role) VALUES (?, ?, ?)';
      const values = [email, hashedPassword, role];

      db.query(insertQuery, values, (err, result) => {
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
    const query = 'INSERT INTO demandes (nom, prenom, email, telephone, montantDemande, projetDescription, pays, ville, devise, mdp, role, idcard, homeproof) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [nom, prenom, email, telephone, montantDemande, projetDescription, pays, ville, devise, hashedPassword, role || 'client', idcard, homeproof];

    db.query(query, values, (err, result) => {
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

  const query = 'SELECT * FROM demandes WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', err);
      return res.status(500).send('Erreur du serveur');
    }

    if (results.length === 0) {
      return res.status(400).send('Email ou mot de passe incorrect');
    }

    const user = results[0];

    bcrypt.compare(mdp, user.mdp, (err, isMatch) => {
      if (err) {
        console.error('Erreur lors de la vérification du mot de passe:', err);
        return res.status(500).send('Erreur du serveur');
      }

      if (!isMatch) {
        return res.status(400).send('Email ou mot de passe incorrect');
      }

      // Générer un token JWT
      const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '1h' });

      res.status(200).send({ message: 'Connexion réussie', role: user.role, token });
    });
  });
});

app.get('/api/demandes/all', verifyToken, checkRole('admin'), (req, res) => {
  const query = 'SELECT * FROM demandes';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des demandes:', err);
      return res.status(500).send('Erreur du serveur');
    }
    
    res.status(200).send(results);
  });
});

// Route pour récupérer les informations de l'utilisateur connecté
app.get('/api/user/me', verifyToken, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT * FROM demandes WHERE id = ?';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des informations de l\'utilisateur:', err);
      return res.status(500).send('Erreur du serveur');
    }

    if (results.length === 0) {
      return res.status(404).send('Utilisateur non trouvé');
    }

    const user = results[0];
    res.status(200).send(user);
  });
});


app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
