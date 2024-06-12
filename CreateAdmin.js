const mysql = require('mysql');
const bcrypt = require('bcrypt');

// Configuration de la connexion MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'adhm',
  password: 'Adhm229@',
  database: 'unpaidfinance',
  socketPath: "/opt/lampp/var/mysql/mysql.sock"
});

// Connexion à la base de données
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('MySQL Connected...');

  // Hacher le mot de passe de l'administrateur
  const adminPassword = 'Hegnon@200714';
  bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Erreur lors du hachage du mot de passe:', err);
      return;
    }

    // Définir les détails de l'administrateur
    const adminDetails = {
      nom: null,
      prenom: null,
      email: 'unpaidfinancial@gmail.com',
      telephone: null,
      montantDemande: null,
      projetDescription: null,
      pays: null,
      ville: null,
      devise: null,
      mdp: hashedPassword,
      role: 'admin',
      idcard: null,
      homeproof: null
    };

    // Insérer l'administrateur dans la base de données
    const query = 'INSERT INTO demandes SET ?';
    db.query(query, adminDetails, (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'insertion de l\'administrateur:', err);
        return;
      }
      console.log('Administrateur créé avec succès');
      db.end();
    });
  });
});
