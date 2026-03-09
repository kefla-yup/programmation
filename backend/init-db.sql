
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'poulet_db')
BEGIN
    CREATE DATABASE poulet_db;
END
GO

USE poulet_db;
GO

-- ============================================================
-- TABLE: race
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='race' AND xtype='U')
BEGIN
    CREATE TABLE race (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nom NVARCHAR(50) NOT NULL UNIQUE
    );
END
GO

-- ============================================================
-- TABLE: config_poids (configuration poids par semaine par race)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='config_poids' AND xtype='U')
BEGIN
    CREATE TABLE config_poids (
        id INT IDENTITY(1,1) PRIMARY KEY,
        race_id INT NOT NULL,
        semaine INT NOT NULL,
        poids_cumule DECIMAL(10,2) NOT NULL,
        variation DECIMAL(10,2) NULL,
        nourriture_jour DECIMAL(10,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (race_id) REFERENCES race(id),
        UNIQUE(race_id, semaine)
    );
END
GO

-- ============================================================
-- TABLE: config_prix (configuration prix par race)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='config_prix' AND xtype='U')
BEGIN
    CREATE TABLE config_prix (
        id INT IDENTITY(1,1) PRIMARY KEY,
        race_id INT NOT NULL UNIQUE,
        prix_achat_gramme DECIMAL(10,2) NOT NULL,
        prix_vente_gramme DECIMAL(10,2) NOT NULL,
        prix_nourriture_gramme DECIMAL(10,2) NOT NULL DEFAULT 0,
        prix_oeuf DECIMAL(10,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (race_id) REFERENCES race(id)
    );
END
GO

-- ============================================================
-- TABLE: lot (lots de poulets)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lot' AND xtype='U')
BEGIN
    CREATE TABLE lot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nom NVARCHAR(100) NOT NULL,
        date_entree DATE NOT NULL,
        nombre INT NOT NULL,
        race_id INT NOT NULL,
        age_entree_semaine INT NOT NULL DEFAULT 0,
        poids_initial DECIMAL(10,2) NOT NULL DEFAULT 0,
        source NVARCHAR(50) DEFAULT 'direct',
        FOREIGN KEY (race_id) REFERENCES race(id)
    );
END
GO

-- ============================================================
-- TABLE: mortalite (suivi des morts par lot)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='mortalite' AND xtype='U')
BEGIN
    CREATE TABLE mortalite (
        id INT IDENTITY(1,1) PRIMARY KEY,
        lot_id INT NOT NULL,
        date_mortalite DATE NOT NULL,
        nombre INT NOT NULL,
        FOREIGN KEY (lot_id) REFERENCES lot(id)
    );
END
GO

-- ============================================================
-- TABLE: oeuf (entrée d'oeufs)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='oeuf' AND xtype='U')
BEGIN
    CREATE TABLE oeuf (
        id INT IDENTITY(1,1) PRIMARY KEY,
        date_reception DATE NOT NULL,
        race_id INT NOT NULL,
        nombre INT NOT NULL,
        FOREIGN KEY (race_id) REFERENCES race(id)
    );
END
GO

-- ============================================================
-- TABLE: transformation (oeuf → poulet)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='transformation' AND xtype='U')
BEGIN
    CREATE TABLE transformation (
        id INT IDENTITY(1,1) PRIMARY KEY,
        date_transformation DATE NOT NULL,
        race_id INT NOT NULL,
        oeufs_transformes INT NOT NULL,
        nouveaux_poussins INT NOT NULL,
        lot_id INT NULL,
        FOREIGN KEY (race_id) REFERENCES race(id),
        FOREIGN KEY (lot_id) REFERENCES lot(id)
    );
END
GO

-- ============================================================
-- DONNÉES INITIALES: races
-- ============================================================
IF NOT EXISTS (SELECT * FROM race WHERE nom = 'R1')
BEGIN
    SET IDENTITY_INSERT race ON;
    INSERT INTO race (id, nom) VALUES (1, 'R1');
    SET IDENTITY_INSERT race OFF;
END
IF NOT EXISTS (SELECT * FROM race WHERE nom = 'R2')
BEGIN
    SET IDENTITY_INSERT race ON;
    INSERT INTO race (id, nom) VALUES (2, 'R2');
    SET IDENTITY_INSERT race OFF;
END
IF NOT EXISTS (SELECT * FROM race WHERE nom = 'Voay')
BEGIN
    SET IDENTITY_INSERT race ON;
    INSERT INTO race (id, nom) VALUES (1002, 'Voay');
    SET IDENTITY_INSERT race OFF;
END
IF NOT EXISTS (SELECT * FROM race WHERE nom = 'BA')
BEGIN
    SET IDENTITY_INSERT race ON;
    INSERT INTO race (id, nom) VALUES (2002, 'BA');
    SET IDENTITY_INSERT race OFF;
END
GO

-- ============================================================
-- DONNÉES INITIALES: config_poids pour BA
-- ============================================================
DECLARE @ba_id INT = (SELECT id FROM race WHERE nom = 'BA');

IF NOT EXISTS (SELECT * FROM config_poids WHERE race_id = @ba_id AND semaine = 0)
BEGIN
    INSERT INTO config_poids (race_id, semaine, poids_cumule, variation, nourriture_jour) VALUES
    (@ba_id, 0, 150, NULL, 0),
    (@ba_id, 1, 10, 70, 1.43),
    (@ba_id, 2, 20, 70, 2.86),
    (@ba_id, 3, 30, 70, 4.29);
END
GO

-- ============================================================
-- DONNÉES INITIALES: config_prix pour BA
-- ============================================================
DECLARE @ba INT = (SELECT id FROM race WHERE nom = 'BA');

IF NOT EXISTS (SELECT * FROM config_prix WHERE race_id = @ba)
BEGIN
    INSERT INTO config_prix (race_id, prix_achat_gramme, prix_vente_gramme, prix_nourriture_gramme, prix_oeuf)
    VALUES (@ba, 100, 120, 100, 500);
END
GO

-- ============================================================
-- DONNÉES INITIALES: lots
-- ============================================================
DECLARE @ba_race INT = (SELECT id FROM race WHERE nom = 'BA');

IF NOT EXISTS (SELECT * FROM lot WHERE nom = 'Lot 2')
BEGIN
    INSERT INTO lot (nom, date_entree, nombre, race_id, age_entree_semaine, poids_initial, source)
    VALUES ('Lot 2', '2023-03-01', 100, @ba_race, 0, 150.00, 'direct');
END

IF NOT EXISTS (SELECT * FROM lot WHERE nom = 'Lot-Transfo-BA-2023-03-09')
BEGIN
    INSERT INTO lot (nom, date_entree, nombre, race_id, age_entree_semaine, poids_initial, source)
    VALUES ('Lot-Transfo-BA-2023-03-09', '2023-03-09', 30, @ba_race, 0, 150.00, 'transformation');
END
GO

-- ============================================================
-- DONNÉES INITIALES: mortalite
-- ============================================================
DECLARE @lot2_id INT = (SELECT id FROM lot WHERE nom = 'Lot 2');

IF NOT EXISTS (SELECT * FROM mortalite WHERE lot_id = @lot2_id AND date_mortalite = '2023-03-10')
BEGIN
    INSERT INTO mortalite (lot_id, date_mortalite, nombre)
    VALUES (@lot2_id, '2023-03-10', 20);
END

IF NOT EXISTS (SELECT * FROM mortalite WHERE lot_id = @lot2_id AND date_mortalite = '2023-03-18')
BEGIN
    INSERT INTO mortalite (lot_id, date_mortalite, nombre)
    VALUES (@lot2_id, '2023-03-18', 10);
END
GO

-- ============================================================
-- DONNÉES INITIALES: oeufs
-- ============================================================
DECLARE @ba_oeuf INT = (SELECT id FROM race WHERE nom = 'BA');

IF NOT EXISTS (SELECT * FROM oeuf WHERE date_reception = '2023-03-09' AND race_id = @ba_oeuf)
BEGIN
    INSERT INTO oeuf (date_reception, race_id, nombre)
    VALUES ('2023-03-09', @ba_oeuf, 50);
END
GO

-- ============================================================
-- DONNÉES INITIALES: transformation
-- ============================================================
DECLARE @ba_transfo INT = (SELECT id FROM race WHERE nom = 'BA');
DECLARE @lot_transfo INT = (SELECT id FROM lot WHERE nom = 'Lot-Transfo-BA-2023-03-09');

IF NOT EXISTS (SELECT * FROM transformation WHERE date_transformation = '2023-03-09' AND race_id = @ba_transfo)
BEGIN
    INSERT INTO transformation (date_transformation, race_id, oeufs_transformes, nouveaux_poussins, lot_id)
    VALUES ('2023-03-09', @ba_transfo, 30, 30, @lot_transfo);
END
GO

PRINT 'Base de données poulet_db initialisée avec succès !';
GO
