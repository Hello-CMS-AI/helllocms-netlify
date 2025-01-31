import jwt from 'jsonwebtoken';

/**
 * Validate and decode the JWT token.
 * This function checks if the token is expired and decodes it for use.
 * @param {string} token - The JWT token from localStorage.
 * @returns {boolean} - Returns true if the token is valid and not expired, false otherwise.
 */
export const validateToken = (token) => {
  try {
    // Decode the token without verifying the signature
    const decoded = jwt.decode(token);

    // Check if the token has expired
    if (decoded.exp < Date.now() / 1000) {
      return false; // Token has expired
    }

    
    
    return true; // Token is valid
  } catch (error) {
    console.error('Error decoding the token:', error);
    return false; // Token is invalid
  }
};

/**
 * Get the decoded token data (e.g., username, userId) if available.
 * @returns {Object} - The decoded token payload.
 */
export const getDecodedToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return jwt.decode(token);
  }
  return null;
};
