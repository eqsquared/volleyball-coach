// Authentication middleware for Express
// Validates JWT tokens and attaches user info to requests

const auth = require('./auth');
const db = require('./db');

/**
 * Middleware to authenticate requests using JWT tokens
 * Attaches userId and userEmail to req.user if token is valid
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = auth.extractTokenFromHeader(authHeader);
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }
        
        const decoded = auth.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
        }
        
        // Verify user still exists
        const user = await db.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found. Please log in again.' });
        }
        
        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Optional authentication - doesn't fail if no token, but attaches user if token is valid
 */
async function optionalAuthenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = auth.extractTokenFromHeader(authHeader);
        
        if (token) {
            const decoded = auth.verifyToken(token);
            if (decoded) {
                const user = await db.getUserById(decoded.userId);
                if (user) {
                    req.user = {
                        userId: decoded.userId,
                        email: decoded.email
                    };
                }
            }
        }
        
        next();
    } catch (error) {
        // Don't fail on optional auth errors, just continue without user
        next();
    }
}

module.exports = {
    authenticate,
    optionalAuthenticate
};
