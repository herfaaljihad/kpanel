const validator = require("validator");
const { logger } = require("./logger");

class ValidationError extends Error {
  constructor(errors) {
    super("Validation failed");
    this.name = "ValidationError";
    this.errors = errors;
  }
}

class InputValidator {
  constructor() {
    this.errors = [];
  }

  // Reset errors
  reset() {
    this.errors = [];
    return this;
  }

  // Add error
  addError(field, message) {
    this.errors.push({ field, message });
    return this;
  }

  // Check if has errors
  hasErrors() {
    return this.errors.length > 0;
  }

  // Get errors
  getErrors() {
    return this.errors;
  }

  // Throw if errors exist
  throwIfErrors() {
    if (this.hasErrors()) {
      throw new ValidationError(this.errors);
    }
  }

  // Email validation
  validateEmail(email, field = "email", required = true) {
    if (!email && required) {
      return this.addError(field, "Email is required");
    }
    if (email) {
      // Custom validation for demo environment - allow .local domains
      const isValidEmail =
        validator.isEmail(email, {
          allow_utf8_local_part: false,
          domain_specific_validation: false,
        }) || /^[^\s@]+@[^\s@]+\.local$/.test(email);

      if (!isValidEmail) {
        return this.addError(field, "Invalid email format");
      }
    }
    if (email && email.length > 255) {
      return this.addError(field, "Email is too long (max 255 characters)");
    }
    return this;
  }

  // Password validation
  validatePassword(password, field = "password", required = true) {
    if (!password && required) {
      return this.addError(field, "Password is required");
    }
    if (password) {
      if (password.length < 8) {
        return this.addError(
          field,
          "Password must be at least 8 characters long"
        );
      }
      if (password.length > 128) {
        return this.addError(
          field,
          "Password is too long (max 128 characters)"
        );
      }
      if (!/(?=.*[a-z])/.test(password)) {
        return this.addError(
          field,
          "Password must contain at least one lowercase letter"
        );
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        return this.addError(
          field,
          "Password must contain at least one uppercase letter"
        );
      }
      if (!/(?=.*\d)/.test(password)) {
        return this.addError(
          field,
          "Password must contain at least one number"
        );
      }
      if (!/(?=.*[@$!%*?&])/.test(password)) {
        return this.addError(
          field,
          "Password must contain at least one special character (@$!%*?&)"
        );
      }
    }
    return this;
  }

  // Name validation
  validateName(name, field = "name", required = true) {
    if (!name && required) {
      return this.addError(field, `${field} is required`);
    }
    if (name) {
      if (name.length < 2) {
        return this.addError(
          field,
          `${field} must be at least 2 characters long`
        );
      }
      if (name.length > 50) {
        return this.addError(field, `${field} is too long (max 50 characters)`);
      }
      if (!/^[a-zA-Z\s'-]+$/.test(name)) {
        return this.addError(field, `${field} contains invalid characters`);
      }
    }
    return this;
  }

  // Domain validation
  validateDomain(domain, field = "domain", required = true) {
    if (!domain && required) {
      return this.addError(field, "Domain is required");
    }
    if (domain) {
      if (!validator.isFQDN(domain)) {
        return this.addError(field, "Invalid domain format");
      }
      if (domain.length > 253) {
        return this.addError(field, "Domain is too long (max 253 characters)");
      }
    }
    return this;
  }

  // Phone validation
  validatePhone(phone, field = "phone", required = false) {
    if (!phone && required) {
      return this.addError(field, "Phone number is required");
    }
    if (phone && !validator.isMobilePhone(phone, "any")) {
      return this.addError(field, "Invalid phone number format");
    }
    return this;
  }

  // URL validation
  validateURL(url, field = "url", required = false) {
    if (!url && required) {
      return this.addError(field, "URL is required");
    }
    if (url && !validator.isURL(url)) {
      return this.addError(field, "Invalid URL format");
    }
    return this;
  }

  // File validation
  validateFile(file, field = "file", options = {}) {
    const {
      required = false,
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ["image/jpeg", "image/png", "image/gif", "text/plain"],
    } = options;

    if (!file && required) {
      return this.addError(field, "File is required");
    }

    if (file) {
      if (file.size > maxSize) {
        return this.addError(
          field,
          `File size too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`
        );
      }
      if (!allowedTypes.includes(file.mimetype)) {
        return this.addError(
          field,
          `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`
        );
      }
    }
    return this;
  }

  // String validation
  validateString(value, field, options = {}) {
    const {
      required = false,
      minLength = 0,
      maxLength = 255,
      pattern = null,
      patternMessage = "Invalid format",
    } = options;

    if (!value && required) {
      return this.addError(field, `${field} is required`);
    }

    if (value) {
      if (typeof value !== "string") {
        return this.addError(field, `${field} must be a string`);
      }
      if (value.length < minLength) {
        return this.addError(
          field,
          `${field} must be at least ${minLength} characters long`
        );
      }
      if (value.length > maxLength) {
        return this.addError(
          field,
          `${field} is too long (max ${maxLength} characters)`
        );
      }
      if (pattern && !pattern.test(value)) {
        return this.addError(field, patternMessage);
      }
    }
    return this;
  }

  // Number validation
  validateNumber(value, field, options = {}) {
    const {
      required = false,
      min = null,
      max = null,
      integer = false,
    } = options;

    if ((value === undefined || value === null) && required) {
      return this.addError(field, `${field} is required`);
    }

    if (value !== undefined && value !== null) {
      const num = Number(value);
      if (isNaN(num)) {
        return this.addError(field, `${field} must be a number`);
      }
      if (integer && !Number.isInteger(num)) {
        return this.addError(field, `${field} must be an integer`);
      }
      if (min !== null && num < min) {
        return this.addError(field, `${field} must be at least ${min}`);
      }
      if (max !== null && num > max) {
        return this.addError(field, `${field} must be at most ${max}`);
      }
    }
    return this;
  }

  // Enum validation
  validateEnum(value, field, allowedValues, required = false) {
    if (!value && required) {
      return this.addError(field, `${field} is required`);
    }
    if (value && !allowedValues.includes(value)) {
      return this.addError(
        field,
        `${field} must be one of: ${allowedValues.join(", ")}`
      );
    }
    return this;
  }

  // Sanitize input
  static sanitizeString(input) {
    if (typeof input !== "string") return input;
    return validator.escape(input.trim());
  }

  // Sanitize object
  static sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        sanitized[key] = InputValidator.sanitizeString(value);
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        sanitized[key] = InputValidator.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

// Middleware for request validation
const validateRequest = (validationFn) => {
  return (req, res, next) => {
    try {
      const validator = new InputValidator();
      validationFn(validator, req.body, req.params, req.query);
      validator.throwIfErrors();

      // Sanitize input
      req.body = InputValidator.sanitizeObject(req.body);

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn("Request validation failed", {
          url: req.url,
          method: req.method,
          errors: error.errors,
          ip: req.ip,
        });

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
};

module.exports = {
  InputValidator,
  ValidationError,
  validateRequest,
};
