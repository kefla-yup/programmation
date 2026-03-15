
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'poulet_db')
BEGIN
    CREATE DATABASE poulet_db;
END
GO

USE poulet_db;
GO

-- ============================================================
-- TRUNCATE ALL TABLES (empty the database)
-- ============================================================
BEGIN TRY
    DISABLE TRIGGER ALL ON transformation;
    DISABLE TRIGGER ALL ON mortalite;
    DISABLE TRIGGER ALL ON oeuf;
    DISABLE TRIGGER ALL ON lot;
    DISABLE TRIGGER ALL ON config_prix;
    DISABLE TRIGGER ALL ON config_poids;
    DISABLE TRIGGER ALL ON race;

    TRUNCATE TABLE transformation;
    TRUNCATE TABLE mortalite;
    TRUNCATE TABLE oeuf;
    TRUNCATE TABLE lot;
    TRUNCATE TABLE config_prix;
    TRUNCATE TABLE config_poids;
    TRUNCATE TABLE race;

    ENABLE TRIGGER ALL ON race;
    ENABLE TRIGGER ALL ON config_poids;
    ENABLE TRIGGER ALL ON config_prix;
    ENABLE TRIGGER ALL ON lot;
    ENABLE TRIGGER ALL ON oeuf;
    ENABLE TRIGGER ALL ON mortalite;
    ENABLE TRIGGER ALL ON transformation;

    PRINT 'Tables tronquées avec succès';
END TRY
BEGIN CATCH
    PRINT 'Les tables n''existent pas encore - création en cours...';
END CATCH
GO

-- ============================================================
-- TABLE: race
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='race' AND xtype='U')
BEGIN
    CREATE TABLE race (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nom NVARCHAR(50) NOT NULL UNIQUE,
        taux_perte_oeufs DECIMAL(5,2) NOT NULL DEFAULT 30,
        ratio_male_femelle DECIMAL(5,2) NOT NULL DEFAULT 30,
        capacite_ponte INT NULL
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
        prix_achat_tete DECIMAL(10,2) NOT NULL,
        prix_vente_gramme DECIMAL(10,2) NOT NULL,
        prix_oeuf DECIMAL(10,2) NOT NULL DEFAULT 0,
        prix_nourriture_gramme DECIMAL(10,2) NOT NULL DEFAULT 0,
        nb_jour_eclosion INT NOT NULL DEFAULT 21,
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
        source NVARCHAR(50) NULL DEFAULT 'direct',
        sexe NVARCHAR(10) NOT NULL DEFAULT 'femelle',
        nombre_femelles INT NOT NULL DEFAULT 0,
        nombre_males INT NOT NULL DEFAULT 0,
        FOREIGN KEY (race_id) REFERENCES race(id)
    );
END
GO

-- Add missing columns if table already exists
IF EXISTS (SELECT * FROM sysobjects WHERE name='lot' AND xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='lot' AND COLUMN_NAME='nombre_femelles')
    BEGIN
        ALTER TABLE lot ADD nombre_femelles INT NOT NULL DEFAULT 0;
    END
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='lot' AND COLUMN_NAME='nombre_males')
    BEGIN
        ALTER TABLE lot ADD nombre_males INT NOT NULL DEFAULT 0;
    END
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
        nombre_morts_males INT NOT NULL DEFAULT 0,
        nombre_morts_femelles INT NOT NULL DEFAULT 0,
        FOREIGN KEY (lot_id) REFERENCES lot(id)
    );
END
GO

-- Add missing columns if table already exists
IF EXISTS (SELECT * FROM sysobjects WHERE name='mortalite' AND xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='mortalite' AND COLUMN_NAME='nombre_morts_males')
    BEGIN
        ALTER TABLE mortalite ADD nombre_morts_males INT NOT NULL DEFAULT 0;
    END
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='mortalite' AND COLUMN_NAME='nombre_morts_femelles')
    BEGIN
        ALTER TABLE mortalite ADD nombre_morts_femelles INT NOT NULL DEFAULT 0;
    END
END
GO

-- ============================================================
-- TABLE: oeuf (entree d'oeufs)
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
-- TABLE: transformation (oeuf -> poulet)
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
        oeufs_pourris INT NOT NULL DEFAULT 0,
        FOREIGN KEY (race_id) REFERENCES race(id),
        FOREIGN KEY (lot_id) REFERENCES lot(id)
    );
END
GO

-- ============================================================
-- DONNEES INITIALES: races
-- ============================================================
IF NOT EXISTS (SELECT * FROM race WHERE nom = 'Borbonèze')
BEGIN
    INSERT INTO race (nom, taux_perte_oeufs, ratio_male_femelle) VALUES ('Borbonèze', 0, 30);
END
GO

-- ============================================================
-- DONNEES INITIALES: config_poids pour Borboneze
-- ============================================================
DECLARE @borbo_id INT = (SELECT id FROM race WHERE nom = 'Borbonèze');

IF NOT EXISTS (SELECT * FROM config_poids WHERE race_id = @borbo_id AND semaine = 0)
BEGIN
    INSERT INTO config_poids (race_id, semaine, poids_cumule, variation, nourriture_jour) VALUES
    (@borbo_id, 0,  50,  NULL, 0),
    (@borbo_id, 1,  20,  75,   10.71),
    (@borbo_id, 2,  25,  80,   11.43),
    (@borbo_id, 3,  30,  100,  14.29),
    (@borbo_id, 4,  40,  150,  21.43),
    (@borbo_id, 5,  80,  170,  24.29),
    (@borbo_id, 6,  85,  190,  27.14),
    (@borbo_id, 7,  100, 200,  28.57),
    (@borbo_id, 8,  100, 250,  35.71),
    (@borbo_id, 9,  90,  270,  38.57),
    (@borbo_id, 10, 140, 290,  41.43),
    (@borbo_id, 11, 200, 300,  42.86),
    (@borbo_id, 12, 220, 370,  52.86),
    (@borbo_id, 13, 265, 390,  55.71),
    (@borbo_id, 14, 285, 350,  50.00),
    (@borbo_id, 15, 300, 300,  42.86),
    (@borbo_id, 16, 350, 450,  64.29),
    (@borbo_id, 17, 400, 500,  71.43),
    (@borbo_id, 18, 420, 400,  57.14),
    (@borbo_id, 19, 430, 500,  71.43),
    (@borbo_id, 20, 500, 500,  71.43),
    (@borbo_id, 21, 530, 650,  92.86),
    (@borbo_id, 22, 600, 600,  85.71),
    (@borbo_id, 23, 400, 750,  107.14),
    (@borbo_id, 24, 100, 750,  107.14),
    (@borbo_id, 25, 0,   600,  85.71);
END
GO

-- ============================================================
-- DONNEES INITIALES: config_prix pour Borboneze
-- ============================================================
DECLARE @borbo_prix INT = (SELECT id FROM race WHERE nom = 'Borbonèze');

IF NOT EXISTS (SELECT * FROM config_prix WHERE race_id = @borbo_prix)
BEGIN
    INSERT INTO config_prix (race_id, prix_achat_tete, prix_vente_gramme, prix_oeuf, prix_nourriture_gramme, nb_jour_eclosion)
    VALUES (@borbo_prix, 500, 15, 500, 5, 30);
END
GO

-- ============================================================
-- DONNEES INITIALES: lots
-- ============================================================
DECLARE @borbo_lot INT = (SELECT id FROM race WHERE nom = 'Borbonèze');

IF NOT EXISTS (SELECT * FROM lot WHERE nom = 'Lot 1')
BEGIN
    INSERT INTO lot (nom, date_entree, nombre, race_id, age_entree_semaine, poids_initial, source, sexe)
    VALUES ('Lot 1', '2026-01-01', 500, @borbo_lot, 0, 50.00, 'direct', 'femelle');
END
GO

-- ============================================================
-- DONNEES INITIALES: mortalite
-- ============================================================
DECLARE @lot1_id INT = (SELECT id FROM lot WHERE nom = 'Lot 1');

IF NOT EXISTS (SELECT * FROM mortalite WHERE lot_id = @lot1_id AND date_mortalite = '2026-02-01')
BEGIN
    INSERT INTO mortalite (lot_id, date_mortalite, nombre)
    VALUES (@lot1_id, '2026-02-01', 15);
END
GO

-- ============================================================
-- DONNEES INITIALES: oeufs
-- ============================================================
DECLARE @borbo_oeuf INT = (SELECT id FROM race WHERE nom = 'Borbonèze');

IF NOT EXISTS (SELECT * FROM oeuf WHERE date_reception = '2026-02-02' AND race_id = @borbo_oeuf)
BEGIN
    INSERT INTO oeuf (date_reception, race_id, nombre)
    VALUES ('2026-02-02', @borbo_oeuf, 100);
END

IF NOT EXISTS (SELECT * FROM oeuf WHERE date_reception = '2026-02-15' AND race_id = @borbo_oeuf)
BEGIN
    INSERT INTO oeuf (date_reception, race_id, nombre)
    VALUES ('2026-02-15', @borbo_oeuf, 150);
END
GO

PRINT 'Base de données poulet_db initialisée avec succès !';
GO
