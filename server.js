const express = require('express');
const mysql2 = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la conexión a MySQL en XAMPP
const db = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'biomant'
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('¡Conectado exitosamente a la base de datos de XAMPP!');
});

// Panel visual de inventario
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
const PORT = 3000;

// Campos requeridos para crear o actualizar un equipo
const CAMPOS_EQUIPO = [
    'id_equipo',
    'nombre_equipo',
    'marca',
    'modelo',
    'numero_serie',
    'nivel_riesgo',
    'ubicacion',
    'estado',
    'tipo_categoria'
];

const CAMPOS_ACTUALIZACION = CAMPOS_EQUIPO.filter((campo) => campo !== 'id_equipo');

function validarCamposRequeridos(datos, campos) {
    return campos.filter((campo) => {
        const valor = datos[campo];
        return valor === undefined || valor === null || String(valor).trim() === '';
    });
}

// Ruta para obtener todos los equipos del inventario
app.get('/api/equipos', (req, res) => {
    const query = 'SELECT * FROM equipos';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al consultar los equipos:', err);
            res.status(500).json({ error: 'Error al obtener el inventario' });
            return;
        }
        res.json(results);
    });
});

// Filtrar equipos por categoría (Biomédico o Tecnología)
// Se declara antes de /:id para evitar que "buscar" se interprete como identificador
app.get('/api/equipos/buscar/categoria/:tipo', (req, res) => {
    const { tipo } = req.params;
    const query = 'SELECT * FROM equipos WHERE tipo_categoria = ?';

    db.query(query, [tipo], (err, results) => {
        if (err) {
            console.error('Error al filtrar equipos por categoría:', err);
            res.status(500).json({ error: 'Error al buscar equipos por categoría' });
            return;
        }
        res.json(results);
    });
});

// Obtener un equipo específico por id_equipo
app.get('/api/equipos/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM equipos WHERE id_equipo = ?';

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error al consultar el equipo:', err);
            res.status(500).json({ error: 'Error al obtener el equipo' });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ error: 'Equipo no encontrado' });
            return;
        }

        res.json(results[0]);
    });
});

// Crear un nuevo equipo en el inventario
app.post('/api/equipos', (req, res) => {
    const faltantes = validarCamposRequeridos(req.body, CAMPOS_EQUIPO);

    if (faltantes.length > 0) {
        res.status(400).json({
            error: 'Faltan datos requeridos',
            campos_faltantes: faltantes
        });
        return;
    }

    const valores = CAMPOS_EQUIPO.map((campo) => req.body[campo]);
    const placeholders = CAMPOS_EQUIPO.map(() => '?').join(', ');
    const query = `INSERT INTO equipos (${CAMPOS_EQUIPO.join(', ')}) VALUES (${placeholders})`;

    db.query(query, valores, (err) => {
        if (err) {
            console.error('Error al crear el equipo:', err);
            res.status(500).json({ error: 'Error al registrar el equipo' });
            return;
        }

        res.status(201).json({
            mensaje: 'Equipo registrado correctamente',
            id_equipo: req.body.id_equipo
        });
    });
});

// Actualizar los datos de un equipo existente
app.put('/api/equipos/:id', (req, res) => {
    const { id } = req.params;
    const faltantes = validarCamposRequeridos(req.body, CAMPOS_ACTUALIZACION);

    if (faltantes.length > 0) {
        res.status(400).json({
            error: 'Faltan datos requeridos',
            campos_faltantes: faltantes
        });
        return;
    }

    const setClause = CAMPOS_ACTUALIZACION.map((campo) => `${campo} = ?`).join(', ');
    const valores = [...CAMPOS_ACTUALIZACION.map((campo) => req.body[campo]), id];
    const query = `UPDATE equipos SET ${setClause} WHERE id_equipo = ?`;

    db.query(query, valores, (err, result) => {
        if (err) {
            console.error('Error al actualizar el equipo:', err);
            res.status(500).json({ error: 'Error al actualizar el equipo' });
            return;
        }

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Equipo no encontrado' });
            return;
        }

        res.status(200).json({
            mensaje: 'Equipo actualizado correctamente',
            id_equipo: id
        });
    });
});

// Eliminar un equipo por su id_equipo
app.delete('/api/equipos/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM equipos WHERE id_equipo = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar el equipo:', err);
            res.status(500).json({ error: 'Error al eliminar el equipo' });
            return;
        }

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Equipo no encontrado' });
            return;
        }

        res.status(200).json({
            mensaje: 'Equipo eliminado correctamente',
            id_equipo: id
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});