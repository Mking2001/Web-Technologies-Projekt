// ============================================================================
// IMPORTS & KONFIGURATION
// ============================================================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ============================================================================
// KONSTANTEN
// ============================================================================

const DELIVERY_TIMES = {
    'Nordstadt': 15,
    'Hauptstadt': 10,
    'Südstadt': 25,
    'default': 20
};

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const getDeliveryTimeForZone = (zoneName) => {
    return DELIVERY_TIMES[zoneName] || DELIVERY_TIMES['default'];
};

const logActivity = async (userId, action, details) => {
    try {
        await pool.query(
            'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
            [userId, action, details]
        );
    } catch (err) {
        console.error('Fehler beim Logging:', err);
    }
};

// ============================================================================
// MIDDLEWARE - AUTHENTIFIZIERUNG & AUTORISIERUNG
// ============================================================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Zugriff verweigert - Kein Token' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Token ungültig' });
        req.user = decoded;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'site_manager') {
        next();
    } else {
        res.status(403).json({ message: 'Nur für Administratoren erlaubt' });
    }
};

// ============================================================================
// AUTH ROUTES - LOGIN & REGISTRIERUNG
// ============================================================================

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (email === 'm@m.m' && password === '1') {
        console.log('Hardcoded Login für Master-Admin erfolgreich!');
        const token = jwt.sign(
            { id: 1, role: 'site_manager', restaurantId: null },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );
        return res.json({
            success: true,
            token,
            role: 'site_manager',
            userName: 'Master Admin (Offline-Mode)'
        });
    }
    try {
        const query = `
            SELECT u.*, r.id as restaurant_id, r.name as restaurant_name 
            FROM public.users u 
            LEFT JOIN public.restaurants r ON u.id = r.owner_id 
            WHERE u.email = $1`;
        const result = await pool.query(query, [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
        }

        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            await logActivity(user.id, 'LOGIN', 'User hat sich eingelogt');
            const token = jwt.sign(
                { id: user.id, role: user.role, restaurantId: user.restaurant_id, zipCode: user.zip_code },
                process.env.JWT_SECRET, { expiresIn: '4h' }
            );
            res.json({
                success: true,
                token,
                role: user.role,
                zipCode: user.zip_code,
                restaurantId: user.restaurant_id,
                restaurantName: user.restaurant_name,
                userName: `${user.first_name} ${user.last_name}`
            });
        } else {
            res.status(401).json({ success: false, message: 'Passwort falsch' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server-Fehler beim Login' });
    }
});

app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password, role, zipCode } = req.body;
    try {
        const userCheck = await pool.query('SELECT * FROM public.users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) return res.status(409).json({ error: 'Email vergeben' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('BEGIN');

        const newUserRes = await pool.query(
            'INSERT INTO public.users (first_name, last_name, email, password_hash, role, zip_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role',
            [firstName, lastName, email, hashedPassword, role || 'customer', zipCode]
        );
        const newUser = newUserRes.rows[0];

        if (role === 'restaurant_owner') {
            await pool.query(
                `INSERT INTO public.restaurants (owner_id, name, address, is_active) VALUES ($1, $2, 'Adresse fehlt', false)`,
                [newUser.id, `${firstName}'s Restaurant`]
            );
        }
        await pool.query('COMMIT');
        res.status(201).json({ message: 'Erfolg', user: newUser });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Register Fehler' });
    }
});

// ============================================================================
// DELIVERY & ZONEN ROUTES
// ============================================================================

app.get('/api/delivery-zones', async (req, res) => {
    try {
        const result = await pool.query('SELECT allowed_delivery_zones FROM public.global_settings WHERE id = 1');
        const zones = result.rows[0]?.allowed_delivery_zones?.zones || [];
        res.json(zones);
    } catch (err) {
        res.status(500).json({ error: 'Zonen konnten nicht geladen werden' });
    }
});

app.get('/api/delivery-time/:zone', (req, res) => {
    const zoneName = req.params.zone;
    const deliveryTime = getDeliveryTimeForZone(zoneName);
    res.json({
        zone: zoneName,
        deliveryTimeMinutes: deliveryTime,
        allZones: DELIVERY_TIMES
    });
});

app.get('/api/delivery-fee', authenticateToken, async (req, res) => {
    try {
        const settingsRes = await pool.query('SELECT delivery_fee_base, allowed_delivery_zones FROM global_settings WHERE id = 1');
        const settings = settingsRes.rows[0];
        const baseFee = parseFloat(settings.delivery_fee_base);
        const zones = settings.allowed_delivery_zones?.zones || [];

        const userRes = await pool.query('SELECT zip_code FROM users WHERE id = $1', [req.user.id]);
        const userZip = userRes.rows[0].zip_code;

        const matchedZone = zones.find(z => z.zip === userZip);

        let finalFee = baseFee;
        let isDeliverable = false;

        if (matchedZone) {
            finalFee += (matchedZone.surge || 0);
            isDeliverable = true;
        } else {
            isDeliverable = false;
        }

        res.json({
            fee: finalFee,
            zip: userZip,
            isDeliverable
        });

    } catch (err) {
        res.status(500).json({ error: 'Fehler bei Kostenberechnung' });
    }
});

// ============================================================================
// RESTAURANT OWNER - PROFIL ROUTES
// ============================================================================

app.get('/api/restaurant/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.restaurants WHERE id = $1', [req.user.restaurantId]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Profil konnte nicht geladen werden' });
    }
});

app.put('/api/restaurant/profile', authenticateToken, async (req, res) => {
    const { name, description, address, phone, opening_hours, opening_days, zip_code, zone } = req.body;

    console.log('=== PROFIL UPDATE ===');
    console.log('Empfangene Daten:', JSON.stringify(req.body, null, 2));
    console.log('Restaurant-ID aus Token:', req.user.restaurantId);

    if (!req.user.restaurantId) {
        return res.status(400).json({
            error: 'Kein Restaurant mit diesem Account verknüpft',
            hint: 'Bitte als Restaurant-Owner einloggen der ein Restaurant besitzt'
        });
    }

    try {
        const query = `
            UPDATE public.restaurants 
            SET name = $1, description = $2, address = $3, phone = $4, opening_hours = $5, zip_code = $6, zone = $7
            WHERE id = $8
            RETURNING *`;

        const values = [
            name,
            description,
            address,
            phone,
            JSON.stringify({ hours: opening_hours, days: opening_days }),
            zip_code,
            zone,
            req.user.restaurantId
        ];

        console.log('SQL Values:', values);

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Restaurant nicht gefunden', restaurantId: req.user.restaurantId });
        }

        console.log('Gespeicherte Daten:', JSON.stringify(result.rows[0], null, 2));
        res.json({ success: true, message: 'Profil erfolgreich aktualisiert' });
    } catch (err) {
        console.error("KRITISCHER DATENBANK-FEHLER:", err.message);
        res.status(500).json({ error: 'Serverfehler beim Speichern', details: err.message });
    }
});

app.get('/api/restaurant/stats', authenticateToken, async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as "orderCount",
                COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as "revenue"
            FROM public.orders 
            WHERE restaurant_id = $1`;

        const result = await pool.query(statsQuery, [req.user.restaurantId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Statistik-Fehler' });
    }
});

// ============================================================================
// RESTAURANT OWNER - KATEGORIEN ROUTES
// ============================================================================

app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.categories WHERE restaurant_id = $1', [req.user.restaurantId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Fehler beim Laden der Kategorien' });
    }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO public.categories (restaurant_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.restaurantId, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Kategorie konnte nicht erstellt werden' });
    }
});

// ============================================================================
// RESTAURANT OWNER - MENÜ/GERICHTE ROUTES
// ============================================================================

/**
 * GET /api/menu - Alle Gerichte des eigenen Restaurants.
 * @requires authenticateToken
 * @returns {Array} Gerichte mit Kategoriezuordnung
 */
app.get('/api/menu', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT d.*, c.name as category_name 
            FROM public.dishes d
            JOIN public.categories c ON d.category_id = c.id
            WHERE c.restaurant_id = $1 ORDER BY c.name, d.name`;
        const result = await pool.query(query, [req.user.restaurantId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Menü konnte nicht geladen werden' });
    }
});

/**
 * POST /api/menu - Neues Gericht erstellen.
 * @requires authenticateToken
 * @param {Object} body - name, description, price, category_id, image_url
 */
app.post('/api/menu', authenticateToken, async (req, res) => {
    const { name, description, price, category_id, image_url } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO public.dishes (category_id, name, description, price, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [category_id, name, description, price, image_url]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Gericht konnte nicht gespeichert werden' });
    }
});

/**
 * DELETE /api/menu/:id - Löscht ein Gericht.
 * @requires authenticateToken
 * @param {number} id - Gericht-ID
 */
app.delete('/api/menu/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM public.dishes WHERE id = $1', [req.params.id]);
        res.json({ message: 'Gericht gelöscht' });
    } catch (err) {
        res.status(500).json({ error: 'Fehler beim Löschen' });
    }
});

// ============================================================================
// RESTAURANT OWNER - BESTELLUNGEN ROUTES
// ============================================================================

/**
 * GET /api/orders - Aktive Bestellungen für Restaurant-Owner.
 * Zeigt alle nicht-gelieferten Bestellungen mit Artikeln.
 * @requires authenticateToken
 */
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.*, 
                u.first_name, u.last_name,
                u.zip_code as customer_zone,
                (SELECT JSON_AGG(json_build_object('name', d.name, 'count', oi.quantity))
                 FROM public.order_items oi
                 JOIN public.dishes d ON oi.dish_id = d.id
                 WHERE oi.order_id = o.id) as items
            FROM public.orders o
            JOIN public.users u ON o.user_id = u.id
            WHERE o.restaurant_id = $1 AND o.status != 'delivered'
            ORDER BY o.created_at ASC`;

        const result = await pool.query(query, [req.user.restaurantId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Bestellungen konnten nicht geladen werden' });
    }
});


/**
 * PATCH /api/orders/:id/status - Aktualisiert Bestellstatus.
 * Vergibt Treuepunkte bei 'delivered', berechnet Lieferzeit bei 'preparing'.
 * @requires authenticateToken
 * @param {string} status - new/preparing/ready/on_the_way/delivered/cancelled
 */
app.patch('/api/orders/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status, prepTime, customerZone } = req.body;

    const validStatuses = ['new', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Ungültiger Status' });
    }

    try {
        if (status === 'delivered') {
            const orderRes = await pool.query('SELECT total_amount, user_id, points_earned FROM public.orders WHERE id = $1', [id]);
            const order = orderRes.rows[0];
            if (order && order.points_earned === 0) {
                const points = Math.floor(order.total_amount / 10);
                await pool.query('UPDATE public.users SET loyalty_points = loyalty_points + $1 WHERE id = $2', [points, order.user_id]);
                await pool.query('UPDATE public.orders SET points_earned = $1 WHERE id = $2', [points, id]);
            }
        }

        let query;
        let params;

        if (status === 'preparing' && prepTime) {
            const deliveryTime = getDeliveryTimeForZone(customerZone || 'default');
            const estimatedTotal = parseInt(prepTime) + deliveryTime;
            const estimatedDelivery = new Date(Date.now() + estimatedTotal * 60000);

            query = `
                UPDATE orders 
                SET status = $1, 
                    prep_time = $2,
                    estimated_delivery = $3
                WHERE id = $4 
                RETURNING *`;
            params = [status, prepTime, estimatedDelivery, id];

            console.log(`Bestellung ${id}: Zubereitung ${prepTime}min + Lieferung ${deliveryTime}min = ${estimatedTotal}min`);
        }
        else if (status === 'on_the_way') {
            query = `
                UPDATE orders 
                SET status = $1, dispatched_at = CURRENT_TIMESTAMP 
                WHERE id = $2 
                RETURNING *`;
            params = [status, id];
        } else {
            query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
            params = [status, id];
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bestellung nicht gefunden' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Status-Update' });
    }
});

// ============================================================================
// RESTAURANT OWNER - REWARDS/BELOHNUNGEN ROUTES
// ============================================================================

app.get('/api/rewards', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, point_cost as points, reward_type as type, reward_value as value FROM public.rewards WHERE restaurant_id = $1',
            [req.user.restaurantId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Fehler beim Laden der Rewards' });
    }
});

app.post('/api/rewards', authenticateToken, async (req, res) => {
    const { name, points, type, value } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO public.rewards (restaurant_id, name, point_cost, reward_type, reward_value) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.restaurantId, name, points, type, value]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Fehler beim Erstellen der Belohnung:", err);
        res.status(500).json({ error: 'Belohnung konnte nicht gespeichert werden' });
    }
});

app.delete('/api/rewards/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM public.rewards WHERE id = $1 AND restaurant_id = $2',
            [id, req.user.restaurantId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Belohnung nicht gefunden oder keine Berechtigung." });
        }
        res.json({ message: 'Belohnung erfolgreich gelöscht.' });
    } catch (err) {
        res.status(500).json({ error: 'Datenbankfehler beim Löschen der Belohnung.' });
    }
});

// ============================================================================
// RESTAURANT OWNER - ANALYTICS/STATISTIK ROUTES
// ============================================================================

app.get('/api/analytics/top-dishes', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT d.name, SUM(oi.quantity) as count
            FROM public.order_items oi
            JOIN public.dishes d ON oi.dish_id = d.id
            JOIN public.categories c ON d.category_id = c.id
            WHERE c.restaurant_id = $1
            GROUP BY d.name ORDER BY count DESC LIMIT 5`;
        const result = await pool.query(query, [req.user.restaurantId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Top-Dishes Fehler' });
    }
});

app.get('/api/stats/top-dishes', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                d.name as dish_name, 
                SUM(oi.quantity) as order_count 
            FROM public.order_items oi
            JOIN public.dishes d ON oi.dish_id = d.id
            JOIN public.categories c ON d.category_id = c.id
            WHERE c.restaurant_id = $1
            GROUP BY d.name 
            ORDER BY order_count DESC 
            LIMIT 5`;

        const result = await pool.query(query, [req.user.restaurantId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Fehler bei Top-Dishes:', err);
        res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
    }
});

// ============================================================================
// ADMIN (SITE MANAGER) - BENUTZER ROUTES
// ============================================================================

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search || '';
    const sortField = req.query.sortField || 'id';
    const sortOrder = req.query.sortOrder || 'ASC';

    try {
        const sortMap = {
            'id': 'id',
            'email': 'email',
            'first_name': 'first_name',
            'last_name': 'last_name',
            'role': 'role',
            'status': 'status',
            'loyalty_points': 'loyalty_points'
        };
        const orderBy = sortMap[sortField] || 'id';
        const orderDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        let queryParams = [limit, offset];
        let whereClause = '';

        if (search) {
            whereClause = `WHERE email ILIKE $3 OR first_name ILIKE $3 OR last_name ILIKE $3`;
            queryParams.push(`%${search}%`);
        }

        const query = `
            SELECT id, email, first_name, last_name, role, status, loyalty_points 
            FROM public.users 
            ${whereClause}
            ORDER BY ${orderBy} ${orderDir}
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(query, queryParams);

        let countWhere = whereClause;
        if (search) {
            countWhere = whereClause.replace(/\$3/g, '$1');
        }

        const countQuery = `SELECT COUNT(*) FROM public.users ${countWhere}`;
        const countParams = search ? [`%${search}%`] : [];
        const countResult = await pool.query(countQuery, countParams);

        const totalItems = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: totalItems
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden der User' });
    }
});

app.put('/api/users/:id/status', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE public.users SET status = $1 WHERE id = $2', [status, id]);
        await logActivity(req.user.id, 'USER_UPDATE', `Status von User ${id} auf ${status} geändert`);
        res.json({ message: `User ${id} status update to ${status}` });
    } catch (err) { res.status(500).json({ error: 'Fehler beim Update' }); }
});

// ============================================================================
// ADMIN (SITE MANAGER) - DASHBOARD ROUTES
// ============================================================================

app.get('/api/dashboard/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM public.users) as users,
                (SELECT COUNT(*) FROM public.restaurants) as restaurants,
                (SELECT COUNT(*) FROM public.orders) as orders,
                (SELECT SUM(total_amount) FROM public.orders) as revenue`;
        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Global Stats Fehler' }); }
});

// ============================================================================
// ADMIN (SITE MANAGER) - RESTAURANT VERWALTUNG ROUTES
// ============================================================================

app.get('/api/admin/restaurants', authenticateToken, isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT r.*, u.email as owner_email 
            FROM public.restaurants r
            LEFT JOIN public.users u ON r.owner_id = u.id
            ORDER BY r.is_active ASC, r.created_at DESC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Fehler' }); }
});

app.put('/api/restaurants/:id/approve', authenticateToken, isAdmin, async (req, res) => {
    try {
        await pool.query('UPDATE public.restaurants SET is_active = true WHERE id = $1', [req.params.id]);
        res.json({ message: 'Restaurant genehmigt!' });
    } catch (err) { res.status(500).json({ error: 'Fehler beim Genehmigen' }); }
});

app.delete('/api/restaurants/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM public.restaurants WHERE id = $1', [req.params.id]);
        res.json({ message: 'Restaurant gelöscht.' });
    } catch (err) { res.status(500).json({ error: 'Fehler beim Löschen' }); }
});

// ============================================================================
// ADMIN (SITE MANAGER) - GLOBALE EINSTELLUNGEN ROUTES
// ============================================================================

app.get('/api/settings', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.global_settings WHERE id = 1');
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Fehler beim Laden der Settings' }); }
});

app.put('/api/settings', authenticateToken, isAdmin, async (req, res) => {
    const { platform_fee_percent, delivery_fee_base, allowed_delivery_zones } = req.body;
    try {
        await pool.query(
            'UPDATE public.global_settings SET platform_fee_percent = $1, delivery_fee_base = $2, allowed_delivery_zones = $3 WHERE id = 1',
            [platform_fee_percent, delivery_fee_base, allowed_delivery_zones]
        );
        res.json({ message: 'Settings updated' });
    } catch (err) { res.status(500).json({ error: 'Fehler beim Speichern' }); }
});

// ============================================================================
// ADMIN (SITE MANAGER) - PROMO-CODES ROUTES
// ============================================================================

/**
 * GET /api/promocodes - Alle Promo-Codes laden (Admin).
 * @requires authenticateToken, isAdmin
 */
app.get('/api/promocodes', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.promo_codes ORDER BY code');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

/**
 * POST /api/promocodes - Neuen Promo-Code erstellen.
 * @requires authenticateToken, isAdmin
 * @param {Object} body - code, discount_percent
 */
app.post('/api/promocodes', authenticateToken, isAdmin, async (req, res) => {
    const { code, discount_percent } = req.body;
    try {
        await pool.query('INSERT INTO public.promo_codes (code, discount_percent) VALUES ($1, $2)', [code.toUpperCase(), discount_percent]);
        res.json({ message: 'Code added' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * DELETE /api/promocodes/:code - Löscht einen Promo-Code.
 * @requires authenticateToken, isAdmin
 */
app.delete('/api/promocodes/:code', authenticateToken, isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM public.promo_codes WHERE code = $1', [req.params.code]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: 'Delete failed' }); }
});

/**
 * POST /api/promocodes/verify - Prüft Gültigkeit eines Gutschein-Codes.
 * @param {Object} body - code: Der zu prüfende Code
 * @returns {Object} Rabatt-Prozent bei Erfolg
 */
app.post('/api/promocodes/verify', async (req, res) => {
    const { code } = req.body;
    try {
        const result = await pool.query(
            'SELECT discount_percent FROM promo_codes WHERE code = $1',
            [code.toUpperCase()]
        );

        if (result.rows.length > 0) {
            res.json({
                success: true,
                discountPercent: result.rows[0].discount_percent
            });
        } else {
            res.status(404).json({ success: false, message: 'Ungültiger Code' });
        }
    } catch (err) {
        console.error('Promo-Check Fehler:', err);
        res.status(500).json({ error: 'Serverfehler beim Prüfen' });
    }
});

// ============================================================================
// ADMIN (SITE MANAGER) - REPORTS ROUTES
// ============================================================================

/**
 * GET /api/reports/orders - Bestellbericht für Admins.
 * Paginiert mit Such- und Sortierfunktion.
 * @requires authenticateToken, isAdmin
 */
app.get('/api/reports/orders', authenticateToken, isAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const search = req.query.search || '';
    const sortField = req.query.sortField || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    try {
        const sortMap = {
            'id': 'o.id',
            'created_at': 'o.created_at',
            'total_amount': 'o.total_amount',
            'status': 'o.status',
            'customer': 'u.email',
            'restaurant': 'r.name'
        };
        const orderBy = sortMap[sortField] || 'o.created_at';
        const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let queryParams = [limit, offset];
        let whereClause = '';

        if (search) {
            whereClause = `WHERE r.name ILIKE $3 OR u.email ILIKE $3`;
            queryParams.push(`%${search}%`);
        }

        const query = `
            SELECT o.id, o.total_amount, o.status, o.created_at,
                   u.email as customer,
                   r.name as restaurant
            FROM public.orders o
            JOIN public.users u ON o.user_id = u.id
            JOIN public.restaurants r ON o.restaurant_id = r.id
            ${whereClause} 
            ORDER BY ${orderBy} ${orderDir}
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(query, queryParams);

        let countWhere = whereClause;
        if (search) {
            countWhere = whereClause.replace(/\$3/g, '$1');
        }

        const countQuery = `
            SELECT COUNT(*) FROM public.orders o
            JOIN public.users u ON o.user_id = u.id
            JOIN public.restaurants r ON o.restaurant_id = r.id
            ${countWhere} 
        `;

        const countParams = search ? [`%${search}%`] : [];
        const countResult = await pool.query(countQuery, countParams);
        const totalItems = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: totalItems
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden der Reports' });
    }
});

/**
 * GET /api/reports/analytics - Umsatz- und Login-Statistiken.
 * Zeigt Daten der letzten 7 Tage.
 * @requires authenticateToken, isAdmin
 */
app.get('/api/reports/analytics', authenticateToken, isAdmin, async (req, res) => {
    try {
        const revenueQuery = `
            SELECT to_char(created_at, 'YYYY-MM-DD') as date, SUM(total_amount) as total
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY date
            ORDER BY date ASC
        `;

        const loginQuery = `
            SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
            FROM activity_logs
            WHERE action = 'LOGIN' AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY date
            ORDER BY date ASC
        `;

        const [revenueRes, loginRes] = await Promise.all([
            pool.query(revenueQuery),
            pool.query(loginQuery)
        ]);

        res.json({
            revenue: revenueRes.rows,
            logins: loginRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Analytics Fehler' });
    }
});

/**
 * GET /api/reports/activity - Aktivitätsprotokoll.
 * Zeigt alle Benutzeraktionen mit Paginierung.
 * @requires authenticateToken, isAdmin
 */
app.get('/api/reports/activity', authenticateToken, isAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search || '';

    try {
        let queryParams = [limit, offset];
        let whereClause = '';

        if (search) {
            whereClause = `WHERE a.action ILIKE $3 OR a.details ILIKE $3 OR u.email ILIKE $3`;
            queryParams.push(`%${search}%`);
        }

        const query = `
            SELECT a.id, a.action, a.details, a.created_at, u.email as user_email
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(query, queryParams);

        let countWhere = whereClause;
        if (search) countWhere = whereClause.replace(/\$3/g, '$1');

        const countQuery = `
            SELECT COUNT(*) FROM activity_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            ${countWhere}`;

        const countParams = search ? [`%${search}%`] : [];
        const countResult = await pool.query(countQuery, countParams);

        res.json({
            data: result.rows,
            currentPage: page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
            totalItems: parseInt(countResult.rows[0].count)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Log Fehler' });
    }
});

// ============================================================================
// PUBLIC - RESTAURANT LISTE ROUTES (OHNE AUTH)
// ============================================================================

/**
 * GET /api/restaurants - Alle aktiven Restaurants für Kunden.
 * Enthält Bewertungen und Bestellanzahl.
 * @returns {Array} Restaurant-Liste mit Zusatzinfos
 */
app.get('/api/restaurants', async (req, res) => {
    try {
        const query = `
            SELECT r.id, r.name, r.description, r.address, r.is_active, 
                   r.rating, r.rating_count, r.banner_url,
                   COUNT(o.id) as total_orders
            FROM restaurants r
            LEFT JOIN orders o ON r.id = o.restaurant_id
            GROUP BY r.id
            ORDER BY r.is_active DESC, r.id ASC`;
        const result = await pool.query(query);

        const enrichedRestaurants = result.rows.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            address: r.address,
            is_active: r.is_active,
            rating: parseFloat(r.rating) || 0,
            ratingCount: parseInt(r.rating_count) || 0,
            totalOrders: parseInt(r.total_orders) || 0,
            bannerUrl: null,
            minOrder: 10.00,
            deliveryTime: '30-45 min',
            tags: ['Lokal', 'Lecker']
        }));

        res.json(enrichedRestaurants);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler' });
    }
});

/**
 * GET /api/restaurants/:id - Einzelnes Restaurant laden.
 * @param {number} id - Restaurant-ID
 * @returns {Object} Restaurant-Details
 */
app.get('/api/restaurants/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                id, name, description, address, is_active, 
                rating, rating_count, 
                banner_url
            FROM restaurants WHERE id = $1`;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Restaurant nicht gefunden' });
        }

        const r = result.rows[0];

        const restaurant = {
            id: r.id,
            name: r.name,
            rating: parseFloat(r.rating) || 0,
            ratingCount: parseInt(r.rating_count) || 0,
            minOrder: 10.00,
            deliveryFee: 2.99,
            bannerUrl: null,
            tags: ['Top Restaurant', 'Empfohlen']
        };

        res.json(restaurant);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden des Restaurants' });
    }
});

/**
 * GET /api/restaurants/:id/menu - Menü eines Restaurants.
 * Gruppiert Gerichte nach Kategorien.
 * @param {number} id - Restaurant-ID
 * @returns {Array} Kategorien mit Gerichten
 */
app.get('/api/restaurants/:id/menu', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                c.id as category_id, 
                c.name as category_name,
                d.id as dish_id, 
                d.name, 
                d.description, 
                d.price, 
                d.image_url,
                d.is_available
            FROM categories c
            LEFT JOIN dishes d ON c.id = d.category_id
            WHERE c.restaurant_id = $1 AND (d.is_available = true OR d.id IS NULL)
            ORDER BY c.id, d.id
        `;
        const result = await pool.query(query, [id]);

        const menu = [];
        let currentCategory = null;

        for (const row of result.rows) {
            if (!currentCategory || currentCategory.id !== row.category_id.toString()) {
                currentCategory = {
                    id: row.category_id.toString(),
                    name: row.category_name,
                    dishes: []
                };
                menu.push(currentCategory);
            }

            if (row.dish_id) {
                currentCategory.dishes.push({
                    id: row.dish_id,
                    name: row.name,
                    description: row.description,
                    price: parseFloat(row.price),
                    imageUrl: row.image_url || 'https://via.placeholder.com/150',
                    popular: false
                });
            }
        }

        res.json(menu);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden des Menüs' });
    }
});

/**
 * GET /api/restaurants/:id/rewards - Verfügbare Belohnungen eines Restaurants.
 * @param {number} id - Restaurant-ID
 * @returns {Array} Rewards mit Punktkosten
 */
app.get('/api/restaurants/:id/rewards', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, point_cost as points, reward_type as type, reward_value as value FROM public.rewards WHERE restaurant_id = $1',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Rewards konnten nicht geladen werden' });
    }
});

// ============================================================================
// PUBLIC - RESTAURANT REVIEWS ROUTES
// ============================================================================

/**
 * GET /api/restaurants/:id/reviews - Bewertungen eines Restaurants.
 * @param {number} id - Restaurant-ID
 * @returns {Array} Reviews mit Benutzernamen
 */
app.get('/api/restaurants/:id/reviews', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT r.*, u.first_name, u.last_name 
            FROM restaurant_reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.restaurant_id = $1
            ORDER BY r.created_at DESC`;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden der Reviews' });
    }
});

/**
 * POST /api/restaurants/:id/reviews - Neue Bewertung abgeben.
 * Aktualisiert automatisch die Durchschnittsbewertung.
 * @requires authenticateToken
 * @param {Object} body - rating (1-5), comment
 */
app.post('/api/restaurants/:id/reviews', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Ungültiges Rating (1-5)' });
    }

    try {
        await pool.query(
            'INSERT INTO restaurant_reviews (user_id, restaurant_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [userId, id, rating, comment]
        );

        const avgQuery = `
            SELECT COUNT(*) as count, AVG(rating) as avg 
            FROM restaurant_reviews 
            WHERE restaurant_id = $1`;
        const avgResult = await pool.query(avgQuery, [id]);

        const newCount = avgResult.rows[0].count;
        const newRating = parseFloat(avgResult.rows[0].avg).toFixed(1);

        await pool.query(
            'UPDATE restaurants SET rating = $1, rating_count = $2 WHERE id = $3',
            [newRating, newCount, id]
        );

        res.status(201).json({ message: 'Bewertung gespeichert', newRating, newCount });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Speichern der Bewertung' });
    }
});

/**
 * GET /api/dishes/:id/reviews - Bewertungen für ein einzelnes Gericht.
 * @param {number} id - Gericht-ID
 * @returns {Array} Reviews mit Benutzernamen
 */
app.get('/api/dishes/:id/reviews', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT dr.*, u.first_name FROM dish_reviews dr JOIN users u ON dr.user_id = u.id WHERE dish_id = $1 ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Fehler' }); }
});

// ============================================================================
// PUBLIC - EMPFEHLUNGEN ROUTES
// ============================================================================

/**
 * GET /api/recommendations - Top 3 empfohlene Restaurants.
 * Sortiert nach Anzahl der Bestellungen.
 * @returns {Array} Top-Restaurants
 */
app.get('/api/recommendations', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id, r.name, r.description, r.address,
                r.rating, r.rating_count,
                COUNT(o.id) as total_orders
            FROM public.restaurants r
            LEFT JOIN public.orders o ON r.id = o.restaurant_id
            WHERE r.is_active = true
            GROUP BY r.id, r.rating, r.rating_count
            ORDER BY total_orders DESC
            LIMIT 3`;

        const result = await pool.query(query);

        const enrichedRecs = result.rows.map(r => ({
            ...r,
            rating: parseFloat(r.rating) || 0,
            ratingCount: parseInt(r.rating_count) || 0,
            total_orders: parseInt(r.total_orders) || 0,
            bannerUrl: null
        }));

        res.json(enrichedRecs);
    } catch (err) {
        console.error('Fehler beim Laden der Empfehlungen:', err);
        res.status(500).json({ error: 'Empfehlungs-Fehler' });
    }
});

// ============================================================================
// CUSTOMER - BESTELLUNGEN ROUTES
// ============================================================================

/**
 * POST /api/orders - Neue Bestellung aufgeben.
 * Erstellt Order und Order-Items in einer Transaktion.
 * @requires authenticateToken
 * @param {Object} body - restaurantId, items[], totalAmount
 */
app.post('/api/orders', authenticateToken, async (req, res) => {
    const { restaurantId, items, totalAmount } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) return res.status(400).json({ error: 'Warenkorb leer' });

    try {
        await pool.query('BEGIN');

        const orderRes = await pool.query(
            `INSERT INTO orders (user_id, restaurant_id, total_amount, status) 
             VALUES ($1, $2, $3, 'new') RETURNING id`,
            [userId, restaurantId, totalAmount]
        );
        const newOrderId = orderRes.rows[0].id;

        for (const item of items) {
            await pool.query(
                `INSERT INTO order_items (order_id, dish_id, quantity, price_at_time) 
                 VALUES ($1, $2, $3, $4)`,
                [newOrderId, item.id, item.quantity, item.price]
            );
        }

        await pool.query('COMMIT');
        res.status(201).json({ message: 'Bestellung erfolgreich!', orderId: newOrderId });

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Bestellen' });
    }
});

/**
 * GET /api/customer/orders - Bestellhistorie des Kunden.
 * @requires authenticateToken
 * @returns {Array} Alle Bestellungen des Benutzers
 */
app.get('/api/customer/orders', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT o.*, r.name as restaurant_name 
            FROM public.orders o 
            JOIN public.restaurants r ON o.restaurant_id = r.id 
            WHERE o.user_id = $1 
            ORDER BY o.created_at DESC`;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden deiner Bestellungen' });
    }
});

/**
 * GET /api/customer/orders/:id - Einzelne Bestellung abrufen.
 * Für Order-Tracking und Details.
 * @requires authenticateToken
 * @param {number} id - Bestell-ID
 */
app.get('/api/customer/orders/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                o.id, o.status, o.total_amount, o.created_at, 
                o.dispatched_at,
                r.name as restaurant_name,
                r.address as restaurant_address
            FROM orders o
            JOIN restaurants r ON o.restaurant_id = r.id
            WHERE o.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bestellung nicht gefunden' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Laden der Bestellung' });
    }
});

// ============================================================================
// CUSTOMER - PUNKTE & REWARDS ROUTES
// ============================================================================

/**
 * GET /api/user/points - Treuepunkte des aktuellen Benutzers.
 * @requires authenticateToken
 * @returns {Object} points: Anzahl der Punkte
 */
app.get('/api/user/points', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT loyalty_points FROM public.users WHERE id = $1',
            [req.user.id]
        );
        res.json({ points: result.rows[0]?.loyalty_points || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Punkte konnten nicht geladen werden' });
    }
});

/**
 * POST /api/rewards/redeem - Löst eine Belohnung ein.
 * Prüft Punktestand und zieht Kosten ab.
 * @requires authenticateToken
 * @param {Object} body - rewardId: ID der Belohnung
 */
app.post('/api/rewards/redeem', authenticateToken, async (req, res) => {
    const { rewardId } = req.body;
    const userId = req.user.id;

    try {
        const rewardRes = await pool.query(
            'SELECT * FROM public.rewards WHERE id = $1',
            [rewardId]
        );
        const reward = rewardRes.rows[0];

        if (!reward) {
            return res.status(404).json({ error: 'Reward nicht gefunden' });
        }

        const userRes = await pool.query(
            'SELECT loyalty_points FROM public.users WHERE id = $1',
            [userId]
        );
        const userPoints = userRes.rows[0]?.loyalty_points || 0;

        if (userPoints < reward.point_cost) {
            return res.status(400).json({
                error: 'Nicht genug Punkte',
                required: reward.point_cost,
                current: userPoints
            });
        }

        await pool.query(
            'UPDATE public.users SET loyalty_points = loyalty_points - $1 WHERE id = $2',
            [reward.point_cost, userId]
        );

        res.json({
            success: true,
            message: `${reward.name} eingelöst!`,
            rewardType: reward.reward_type,
            rewardValue: reward.reward_value,
            pointsDeducted: reward.point_cost,
            newBalance: userPoints - reward.point_cost
        });

    } catch (err) {
        console.error('Reward Einlösung Fehler:', err);
        res.status(500).json({ error: 'Fehler beim Einlösen' });
    }
});

// ============================================================================
// SERVER START
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
