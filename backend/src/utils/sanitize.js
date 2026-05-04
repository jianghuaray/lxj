/**
 * Sanitize user input for SQL LIKE queries.
 * Escapes SQL LIKE wildcards (%, _) to prevent injection/reconnaissance.
 *
 * @param {string} input - Raw user input
 * @returns {string} Escaped input safe for LIKE patterns
 */
function escapeLike(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_');   // Escape underscore
}

/**
 * Build a LIKE pattern with escaped input: %escapedInput%
 * @param {string} input - Raw user input
 * @returns {string} Safe LIKE pattern
 */
function likePattern(input) {
  return { [require('sequelize').Op.like]: `%${escapeLike(input)}%` };
}

/**
 * Validate password strength: at least 8 chars, contains letter and digit
 * @param {string} password
 * @returns {{ valid: boolean, error: string|null }}
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: '密码至少 8 位' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: '密码需包含字母' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: '密码需包含数字' };
  }
  return { valid: true, error: null };
}

/**
 * Validate phone number format (Chinese mobile: 11 digits starting with 1)
 * @param {string} phone
 * @returns {{ valid: boolean, error: string|null }}
 */
function validatePhone(phone) {
  if (!phone) return { valid: false, error: '手机号不能为空' };
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { valid: false, error: '手机号格式不正确' };
  }
  return { valid: true, error: null };
}

/**
 * Validate that a string field is within length limits
 * @param {string} value
 * @param {string} fieldName - Chinese display name
 * @param {number} maxLen
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateLength(value, fieldName, maxLen) {
  if (value && value.length > maxLen) {
    return { valid: false, error: `${fieldName}不能超过 ${maxLen} 个字符` };
  }
  return { valid: true, error: null };
}

module.exports = {
  escapeLike,
  likePattern,
  validatePassword,
  validatePhone,
  validateLength
};
