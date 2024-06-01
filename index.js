const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const port = process.env.PORT || 5000;
const app = express();

// Middleware pour autoriser les requêtes CORS de tous les origines
app.use(cors());

// Middleware pour parser les données du corps de la requête en JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'adhm',
    password: 'Adhm229@',
    database: 'unpaidfinance',
    socketPath: "/opt/lampp/var/mysql/mysql.sock"
});

connection.connect((err) => {
    if (err) {
        console.error("Erreur de connexion: " + err.stack);
        return;
    }
    console.log("Connexion réussie à la base de données.");
});

// Route pour enregistrer une nouvelle demande
app.post('/demande', (req, res) => {
    const formData = req.body;

    const sql = `INSERT INTO demandes (nom, prenom, email, telephone, montantDemande, projetDescription, pays, idcard, homeproof, devise, statut, username, mdp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?, ?)`;
    const values = [
        formData.nom,
        formData.prenom,
        formData.email,
        formData.telephone,
        formData.montantDemande,
        formData.projetDescription,
        formData.pays,
        formData.idcard,
        formData.homeproof,
        formData.devise,
        formData.username,
        formData.mdp
    ];

    // Exécution de la requête SQL
    connection.query(sql, values, (error, results, fields) => {
        if (error) {
            console.error('Erreur lors de l\'enregistrement de la demande:', error);
            res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la demande' });
        } else {
            console.log('Demande enregistrée avec succès:', results);
            res.status(200).json({ message: 'Demande enregistrée avec succès' });
        }
    });
});

// Route pour récupérer tous les clients ayant fait des demandes
app.get("/clients", (req, res) => {
    const sql = "SELECT nom, prenom, email, telephone, pays, montantDemande, devise, projetDescription, pays, idcard, homeproof, statut FROM demandes";
    connection.query(sql, (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération des clients :", error);
            res.status(500).json({ message: "Erreur lors de la récupération des clients" });
        } else {
            res.status(200).json(results);
        }
    });
});

app.get("/clients/:username", (req, res) => {
    const username = req.params.username;
    const sql = "SELECT nom, prenom, email, telephone, montantDemande, devise, projetDescription, pays, idcard, homeproof, statut FROM demandes WHERE username = ?";
    connection.query(sql, [username], (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération des demandes de l'utilisateur :", error);
            res.status(500).json({ message: "Erreur lors de la récupération des demandes de l'utilisateur" });
        } else {
            res.status(200).json(results);
        }
    });
});





app.post('/login', (req, res) => {
    const { username, mdp } = req.body;
  
    // Recherche de l'utilisateur dans la base de données
    const sql = 'SELECT * FROM demandes WHERE username = ? AND mdp = ?';
    const values = [username, mdp];
  
    connection.query(sql, values, (error, results) => {
      if (error) {
        console.error("Erreur lors de la vérification des coordonnées :", error);
        res.status(500).json({ message: "Erreur lors de la vérification des coordonnées" });
      } else {
        if (results.length > 0) {
          // Si l'utilisateur est trouvé avec le nom d'utilisateur et le mot de passe correspondants
          const user_id = results[0].user_id;
          if (user_id === '1000') {
            // Si l'utilisateur est un administrateur, renvoyer une réponse avec un code d'état 200 (OK)
            res.status(200).json({ message: "Connexion réussie", user_id });
          } else {
            // Si l'utilisateur n'est pas un administrateur, renvoyer une réponse avec un code d'état 401 (Non autorisé)
            res.status(200).json({ message: "Connexion réussie" });
          }
        } else {
          // Si l'utilisateur n'est pas trouvé avec le nom d'utilisateur et le mot de passe correspondants, renvoyer une réponse avec un code d'état 401 (Non autorisé)
          res.status(401).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
        }
      }
    });
  });
  


  app.post("/users", (req, res) => {
    const { username, password, role, nom, prenom, montant } = req.body;
  
    const sql = `INSERT INTO connexion (username, mot_de_passe, role, nom, prenom, montant) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [username, password, role, nom, prenom, montant];
  
    connection.query(sql, values, (error, results, fields) => {
      if (error) {
        console.error('Erreur lors de la création de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
      } else {
        console.log('Utilisateur créé avec succès');
        res.status(201).json({ message: 'Utilisateur créé avec succès' });
      }
    });
  });
  



app.listen(port, () => {
    console.log("Serveur est en ligne sur le port", port);
});
