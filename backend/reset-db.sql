USE master;
GO

-- Supprimer la base si elle existe
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'poulet_db')
BEGIN
    ALTER DATABASE poulet_db SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE poulet_db;
END
GO

-- Créer une nouvelle base
CREATE DATABASE poulet_db;
GO

PRINT 'Base de données réinitialisée';
GO
