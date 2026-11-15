import "dotenv/config";
import pg from "pg";

// Local maintenance command only; no public endpoint can grant administrator access.
const email = process.argv[2]?.trim().toLowerCase();
if (!email || email === "--help") {
  console.log("Usage : npm run admin:promote -- adresse@example.com\nInscrivez d’abord le compte via le site. Cette commande conserve son mot de passe.");
  process.exit(email ? 0 : 1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  console.error("Adresse e-mail invalide."); process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const result = await pool.query('SELECT id, "isActif" FROM "User" WHERE lower(email) = $1', [email]);
  if (result.rows.length !== 1 || !result.rows[0].isActif) throw new Error("Un compte actif unique doit exister pour cette adresse. Inscrivez-le d’abord sur le site.");
  const updated = await pool.query('UPDATE "User" SET role = \'ADMIN\', "updatedAt" = NOW() WHERE id = $1 AND "isActif" = true RETURNING id', [result.rows[0].id]);
  if (!updated.rowCount) throw new Error("Le compte a été désactivé entre-temps.");
  console.log("Rôle administrateur attribué. Connectez-vous avec les identifiants de ce compte.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Impossible de préparer le compte administrateur.");
  process.exitCode = 1;
} finally { await pool.end(); }
